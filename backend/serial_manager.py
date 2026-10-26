"""
Serial Connection Manager for RFD900x 915MHz Telemetry Radio.
Handles auto-reconnection and non-blocking async serial I/O.
"""

import asyncio
import logging
from typing import Optional

logger = logging.getLogger('SerialManager')


class SerialManager:
    """Manages serial port connection to RFD900x radio modem."""

    def __init__(self):
        self.port: str = ''
        self.baud_rate: int = 57600
        self._connected: bool = False
        self._serial = None
        self._read_buffer: bytearray = bytearray()
        self._reconnect_interval: float = 2.0
        self._max_reconnect_attempts: int = 10

    async def connect(self, port: str, baud_rate: int = 57600) -> bool:
        """
        Establish serial connection to the RFD900x radio.
        
        Args:
            port: Serial port path (e.g., 'COM3' or '/dev/ttyUSB0')
            baud_rate: Communication baud rate (default: 57600)
            
        Returns:
            True if connection successful, False otherwise
        """
        self.port = port
        self.baud_rate = baud_rate

        try:
            # Import serial only when connecting (graceful degradation)
            import serial
            self._serial = serial.Serial(
                port=port,
                baudrate=baud_rate,
                timeout=0.1,
                write_timeout=1.0,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
            )
            self._connected = True
            logger.info(f"Connected to {port} @ {baud_rate} baud")
            return True

        except ImportError:
            logger.warning("pyserial not installed. Running in simulation mode.")
            self._connected = True  # Simulate connection for development
            return True

        except Exception as e:
            logger.error(f"Failed to connect to {port}: {e}")
            self._connected = False
            return False

    async def disconnect(self):
        """Close the serial connection."""
        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
            except Exception as e:
                logger.error(f"Error closing serial port: {e}")
        self._connected = False
        self._serial = None
        logger.info("Serial disconnected")

    async def reconnect(self) -> bool:
        """Attempt to reconnect to the last known port."""
        for attempt in range(self._max_reconnect_attempts):
            logger.info(f"Reconnection attempt {attempt + 1}/{self._max_reconnect_attempts}")
            await self.disconnect()
            await asyncio.sleep(self._reconnect_interval)
            if await self.connect(self.port, self.baud_rate):
                return True
        logger.error("Max reconnection attempts reached")
        return False

    def is_connected(self) -> bool:
        """Check if serial connection is active."""
        return self._connected

    async def read_data(self) -> Optional[bytes]:
        """
        Read available data from serial port (non-blocking).
        
        Returns:
            Raw bytes if data available, None otherwise
        """
        if not self._connected:
            return None

        try:
            if self._serial and self._serial.is_open:
                if self._serial.in_waiting > 0:
                    data = self._serial.read(self._serial.in_waiting)
                    return data
            else:
                # Simulation mode: return empty bytes periodically
                await asyncio.sleep(0.05)  # 20 Hz polling rate
                return None

        except Exception as e:
            logger.error(f"Serial read error: {e}")
            self._connected = False
            return None

    async def write_data(self, data: bytes) -> bool:
        """
        Write data to serial port.
        
        Args:
            data: Raw bytes to transmit
            
        Returns:
            True if write successful, False otherwise
        """
        if not self._connected:
            return False

        try:
            if self._serial and self._serial.is_open:
                self._serial.write(data)
                self._serial.flush()
                return True
            else:
                # Simulation mode
                logger.debug(f"[SIM] Would send {len(data)} bytes")
                return True

        except Exception as e:
            logger.error(f"Serial write error: {e}")
            return False
