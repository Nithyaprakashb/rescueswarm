"""
MAVLink 2 Message Handler.
Decodes incoming MAVLink telemetry and encodes outgoing commands.
"""

import logging
import math
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger('MAVLinkHandler')

# System IDs for each drone
DRONE_SYSID = {
    'INS-01': 1,
    'DEL-01': 2,
    'DEL-02': 3,
}

# MAVLink command IDs (subset)
MAV_CMD_NAV_RETURN_TO_LAUNCH = 20
MAV_CMD_NAV_LAND = 21
MAV_CMD_NAV_WAYPOINT = 16
MAV_CMD_DO_SET_SERVO = 183
MAV_CMD_COMPONENT_ARM_DISARM = 400
MAV_MODE_AUTO = 4
MAV_MODE_RTL = 6


class MAVLinkHandler:
    """Handles MAVLink 2 message encoding and decoding."""

    def __init__(self):
        self._mavlink = None
        self._connection = None
        self._telemetry_cache: Dict[str, Dict[str, Any]] = {
            'INS-01': {},
            'DEL-01': {},
            'DEL-02': {},
        }
        self._init_mavlink()

    def _init_mavlink(self):
        """Initialize pymavlink if available."""
        try:
            from pymavlink import mavutil
            self._mavlink = mavutil
            logger.info("pymavlink initialized successfully")
        except ImportError:
            logger.warning("pymavlink not installed. Running in simulation mode.")
            self._mavlink = None

    def _get_drone_id_from_sysid(self, sysid: int) -> Optional[str]:
        """Convert MAVLink system ID to drone identifier."""
        for drone_id, sys_id in DRONE_SYSID.items():
            if sys_id == sysid:
                return drone_id
        return None

    def parse_telemetry(self, raw_data: bytes) -> Optional[Dict[str, Any]]:
        """
        Parse raw MAVLink bytes into structured telemetry data.
        
        Returns:
            Dictionary mapping drone IDs to telemetry data, or None
        """
        if self._mavlink is None:
            # Simulation mode: return synthetic telemetry
            return self._generate_sim_telemetry()

        try:
            # Parse MAVLink messages from raw bytes
            # In production, this would use mavutil.mavlink_connection
            # For now, we handle common message types
            pass
        except Exception as e:
            logger.error(f"Parse error: {e}")
            return None

    def _generate_sim_telemetry(self) -> Dict[str, Any]:
        """Generate simulated telemetry data for development/testing."""
        import random
        import time

        now = time.time()
        result = {}

        for drone_id in ['INS-01', 'DEL-01', 'DEL-02']:
            is_ins = drone_id == 'INS-01'
            base_lat = 12.9716 + random.uniform(-0.001, 0.001)
            base_lon = 77.5946 + random.uniform(-0.001, 0.001)

            result[drone_id] = {
                'droneId': drone_id,
                'droneType': 'inspection' if is_ins else 'delivery',
                'status': 'flying' if random.random() > 0.1 else 'idle',
                'mode': 'AUTO',
                'position': {
                    'lat': base_lat,
                    'lon': base_lon,
                    'alt': 25.0 + random.uniform(-2, 2) if is_ins else 10.0 + random.uniform(-1, 1),
                    'heading': random.uniform(0, 360),
                    'groundspeed': 8.0 + random.uniform(-0.5, 0.5) if is_ins else 5.0 + random.uniform(-0.3, 0.3),
                    'airspeed': 8.5 + random.uniform(-0.5, 0.5) if is_ins else 5.5 + random.uniform(-0.3, 0.3),
                },
                'battery': {
                    'voltage': 22.2 + random.uniform(-0.5, 0.3),
                    'percentage': 75 + random.uniform(-5, 5),
                    'current': 12.0 + random.uniform(-2, 2),
                },
                'gps': {
                    'satellites': 12 + random.randint(-3, 3),
                    'hdop': 0.8 + random.uniform(0, 0.3),
                    'fix': 3,
                },
                'signal': {
                    'rssi': -55 + random.randint(-10, 10),
                    'remRssi': -60 + random.randint(-10, 10),
                    'noise': -100 + random.randint(-5, 5),
                    'remNoise': -100 + random.randint(-5, 5),
                },
                'attitude': {
                    'roll': random.uniform(-5, 5),
                    'pitch': random.uniform(-3, 3),
                    'yaw': random.uniform(0, 360),
                },
                'lastHeartbeat': int(now * 1000),
                'armed': True,
                'payload': 'loaded' if not is_ins else None,
            }

        return result

    def check_survivor_detection(self, raw_data: bytes) -> Optional[Dict[str, Any]]:
        """
        Check if incoming data contains a survivor detection from the
        companion computer (RPi 5 + AI HAT+ running YOLOv8).
        """
        # In production, this would parse custom MAVLink messages
        # or a sideband data channel from the companion computer
        return None

    async def send_rtl(self, serial_mgr, drone_id: str):
        """Send Return-To-Launch command to specified drone."""
        sysid = DRONE_SYSID.get(drone_id)
        if sysid is None:
            logger.error(f"Unknown drone: {drone_id}")
            return

        logger.critical(f"Sending RTL to {drone_id} (sysid={sysid})")

        if self._mavlink:
            # Construct MAVLink COMMAND_LONG for NAV_RETURN_TO_LAUNCH
            # In production:
            # msg = self._connection.mav.command_long_encode(
            #     sysid, 0,  # target system, component
            #     MAV_CMD_NAV_RETURN_TO_LAUNCH,
            #     0,  # confirmation
            #     0, 0, 0, 0, 0, 0, 0  # params
            # )
            # await serial_mgr.write_data(msg.pack())
            pass
        else:
            logger.info(f"[SIM] RTL command sent to {drone_id}")

    async def send_land(self, serial_mgr, drone_id: str):
        """Send Land command to specified drone."""
        sysid = DRONE_SYSID.get(drone_id)
        if sysid is None:
            return

        logger.warning(f"Sending LAND to {drone_id} (sysid={sysid})")

        if self._mavlink:
            pass  # Production MAVLink encoding
        else:
            logger.info(f"[SIM] LAND command sent to {drone_id}")

    async def send_goto(self, serial_mgr, drone_id: str, lat: float, lon: float, alt: float = 3.0):
        """Send a GOTO waypoint command for delivery."""
        sysid = DRONE_SYSID.get(drone_id)
        if sysid is None:
            return

        logger.info(f"Sending GOTO to {drone_id}: ({lat}, {lon}, {alt}m)")

        if self._mavlink:
            pass  # Production MAVLink encoding
        else:
            logger.info(f"[SIM] GOTO command sent to {drone_id}")

    async def send_servo_release(self, serial_mgr, drone_id: str, servo_channel: int = 9):
        """Trigger servo release for payload drop."""
        sysid = DRONE_SYSID.get(drone_id)
        if sysid is None:
            return

        logger.info(f"Sending SERVO RELEASE to {drone_id} (channel={servo_channel})")

        if self._mavlink:
            pass  # Production MAVLink encoding
        else:
            logger.info(f"[SIM] SERVO RELEASE sent to {drone_id}")

    async def start_search_mission(self, serial_mgr):
        """Start the autonomous search mission on INS-01."""
        logger.info("Starting search mission on INS-01")

        if self._mavlink:
            pass  # Upload mission waypoints via MISSION_ITEM_INT
        else:
            logger.info("[SIM] Search mission started on INS-01")

    async def send_command(self, serial_mgr, drone_id: str, command: str, params: dict):
        """Send a generic MAVLink command to a drone."""
        logger.info(f"Sending command {command} to {drone_id} with params {params}")

        if command == 'RTL':
            await self.send_rtl(serial_mgr, drone_id)
        elif command == 'LAND':
            await self.send_land(serial_mgr, drone_id)
        elif command == 'GOTO':
            await self.send_goto(serial_mgr, drone_id, params.get('lat', 0), params.get('lon', 0))
        elif command == 'SERVO_RELEASE':
            await self.send_servo_release(serial_mgr, drone_id)
