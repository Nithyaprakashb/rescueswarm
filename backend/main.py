#!/usr/bin/env python3
"""
Adrods_X RescueSwarm GCS - Python Backend Daemon
Handles MAVLink telemetry via RFD900x serial radio and communicates
with the Electron frontend via JSON stdin/stdout IPC.
"""

import sys
import json
import asyncio
import signal
import logging
from datetime import datetime

from serial_manager import SerialManager
from mav_handler import MAVLinkHandler
from task_allocator import TaskAllocator

# Configure logging
logging.basicConfig(
    filename='logs/gcs_backend.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger('GCS-Backend')


class GCSBackend:
    """Main backend daemon coordinating serial, MAVLink, and task allocation."""

    def __init__(self):
        self.serial_manager = SerialManager()
        self.mav_handler = MAVLinkHandler()
        self.task_allocator = TaskAllocator()
        self.running = False
        self.connected = False

    def send_to_frontend(self, msg_type: str, data: dict):
        """Send JSON message to Electron via stdout."""
        try:
            message = json.dumps({'type': msg_type, 'data': data})
            sys.stdout.write(message + '\n')
            sys.stdout.flush()
        except Exception as e:
            logger.error(f"Failed to send to frontend: {e}")

    async def handle_stdin(self):
        """Read commands from Electron via stdin."""
        loop = asyncio.get_event_loop()
        reader = asyncio.StreamReader()
        protocol = asyncio.StreamReaderProtocol(reader)
        await loop.connect_read_pipe(lambda: protocol, sys.stdin)

        while self.running:
            try:
                line = await reader.readline()
                if not line:
                    break
                command = json.loads(line.decode().strip())
                await self.process_command(command)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from frontend")
            except Exception as e:
                logger.error(f"Stdin handler error: {e}")

    async def process_command(self, command: dict):
        """Process a command received from the Electron frontend."""
        cmd_type = command.get('type', '')
        logger.info(f"Received command: {cmd_type}")

        if cmd_type == 'connect':
            port = command.get('port', 'COM3')
            baud = command.get('baudRate', 57600)
            success = await self.serial_manager.connect(port, baud)
            self.connected = success
            self.send_to_frontend('status', {
                'status': 'connected' if success else 'error',
                'port': port,
                'baudRate': baud,
            })

        elif cmd_type == 'disconnect':
            await self.serial_manager.disconnect()
            self.connected = False
            self.send_to_frontend('status', {
                'status': 'disconnected',
            })

        elif cmd_type == 'emergency-rto':
            logger.critical("EMERGENCY RTO ACTIVATED")
            # Send RTL command to all drones
            for drone_id in ['INS-01', 'DEL-01', 'DEL-02']:
                await self.mav_handler.send_rtl(self.serial_manager, drone_id)
            self.send_to_frontend('status', {
                'status': 'rto-active',
                'timestamp': datetime.now().isoformat(),
            })

        elif cmd_type == 'abort-drone':
            drone_id = command.get('droneId')
            if drone_id:
                await self.mav_handler.send_land(self.serial_manager, drone_id)
                logger.warning(f"ABORT sent to {drone_id}")

        elif cmd_type == 'confirm-survivor':
            survivor_data = {
                'survivorId': command.get('survivorId'),
                'lat': command.get('lat'),
                'lon': command.get('lon'),
                'assignedDrone': command.get('assignedDrone'),
            }
            # Process delivery assignment
            assignment = self.task_allocator.assign_delivery(survivor_data)
            if assignment:
                await self.mav_handler.send_goto(
                    self.serial_manager,
                    assignment['droneId'],
                    assignment['lat'],
                    assignment['lon'],
                )

        elif cmd_type == 'start-mission':
            logger.info("Mission started")
            # Send mission start command to INS-01
            await self.mav_handler.start_search_mission(self.serial_manager)

        elif cmd_type == 'command':
            drone_id = command.get('droneId')
            mav_cmd = command.get('command')
            params = command.get('params', {})
            await self.mav_handler.send_command(
                self.serial_manager, drone_id, mav_cmd, params
            )

    async def telemetry_loop(self):
        """Main telemetry reading loop."""
        while self.running:
            if self.connected and self.serial_manager.is_connected():
                try:
                    raw_data = await self.serial_manager.read_data()
                    if raw_data:
                        telemetry = self.mav_handler.parse_telemetry(raw_data)
                        if telemetry:
                            self.send_to_frontend('telemetry', telemetry)

                            # Check for survivor detection from companion computer
                            detection = self.mav_handler.check_survivor_detection(raw_data)
                            if detection:
                                self.send_to_frontend('survivor-detected', detection)

                except Exception as e:
                    logger.error(f"Telemetry loop error: {e}")
                    # Attempt reconnection
                    self.send_to_frontend('status', {
                        'status': 'reconnecting',
                    })
                    await asyncio.sleep(2)
                    await self.serial_manager.reconnect()
            else:
                await asyncio.sleep(0.1)

    async def run(self):
        """Start the backend daemon."""
        self.running = True
        logger.info("GCS Backend starting...")
        self.send_to_frontend('status', {
            'status': 'disconnected',
            'port': 'COM3',
            'baudRate': 57600,
        })

        try:
            await asyncio.gather(
                self.handle_stdin(),
                self.telemetry_loop(),
            )
        except asyncio.CancelledError:
            logger.info("Backend shutting down...")
        finally:
            await self.serial_manager.disconnect()
            self.running = False

    def shutdown(self):
        """Graceful shutdown handler."""
        self.running = False
        logger.info("Shutdown signal received")


def main():
    backend = GCSBackend()

    def signal_handler(sig, frame):
        backend.shutdown()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        asyncio.run(backend.run())
    except KeyboardInterrupt:
        backend.shutdown()


if __name__ == '__main__':
    main()
