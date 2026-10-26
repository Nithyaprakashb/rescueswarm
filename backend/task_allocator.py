"""
Survivor Task Queue & Delivery Drone Allocator.
Assigns the closest available delivery drone to confirmed survivor locations.
"""

import math
import logging
import csv
import os
from datetime import datetime
from typing import Optional, Dict, List, Any

logger = logging.getLogger('TaskAllocator')


class TaskAllocator:
    """
    Manages the survivor delivery queue and assigns the optimal
    delivery drone (DEL-01 or DEL-02) based on proximity.
    """

    def __init__(self):
        self.delivery_queue: List[Dict[str, Any]] = []
        self.completed_deliveries: List[Dict[str, Any]] = []
        self.drone_positions: Dict[str, Dict[str, float]] = {
            'DEL-01': {'lat': 0.0, 'lon': 0.0, 'available': True, 'payload_count': 5},
            'DEL-02': {'lat': 0.0, 'lon': 0.0, 'available': True, 'payload_count': 5},
        }
        self._ensure_log_directory()

    def _ensure_log_directory(self):
        """Create data directory for logging."""
        os.makedirs('data', exist_ok=True)

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great-circle distance between two points
        on Earth using the Haversine formula.
        
        Returns:
            Distance in meters
        """
        R = 6371000  # Earth's radius in meters
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (math.sin(delta_phi / 2) ** 2 +
             math.cos(phi1) * math.cos(phi2) *
             math.sin(delta_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def update_drone_position(self, drone_id: str, lat: float, lon: float):
        """Update the known position of a delivery drone."""
        if drone_id in self.drone_positions:
            self.drone_positions[drone_id]['lat'] = lat
            self.drone_positions[drone_id]['lon'] = lon

    def set_drone_available(self, drone_id: str, available: bool):
        """Set the availability status of a delivery drone."""
        if drone_id in self.drone_positions:
            self.drone_positions[drone_id]['available'] = available

    def find_nearest_drone(self, target_lat: float, target_lon: float) -> Optional[str]:
        """
        Find the nearest available delivery drone to the target location.
        
        Returns:
            DroneId of nearest available drone, or None if none available
        """
        nearest = None
        min_distance = float('inf')

        for drone_id, info in self.drone_positions.items():
            if info['available'] and info['payload_count'] > 0:
                dist = self.haversine_distance(
                    info['lat'], info['lon'],
                    target_lat, target_lon
                )
                if dist < min_distance:
                    min_distance = dist
                    nearest = drone_id

        return nearest

    def assign_delivery(self, survivor_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Assign a delivery drone to a confirmed survivor.
        
        Args:
            survivor_data: Dict with survivorId, lat, lon, assignedDrone
            
        Returns:
            Assignment dict with droneId, lat, lon or None if no drone available
        """
        lat = survivor_data.get('lat', 0)
        lon = survivor_data.get('lon', 0)
        survivor_id = survivor_data.get('survivorId', 'UNKNOWN')

        # Use pre-assigned drone or find nearest
        assigned_drone = survivor_data.get('assignedDrone')
        if not assigned_drone:
            assigned_drone = self.find_nearest_drone(lat, lon)

        if not assigned_drone:
            logger.warning(f"No available delivery drone for {survivor_id}")
            return None

        # Mark drone as busy
        self.set_drone_available(assigned_drone, False)
        if assigned_drone in self.drone_positions:
            self.drone_positions[assigned_drone]['payload_count'] -= 1

        # Create assignment
        assignment = {
            'survivorId': survivor_id,
            'droneId': assigned_drone,
            'lat': lat,
            'lon': lon,
            'timestamp': datetime.now().isoformat(),
        }

        self.delivery_queue.append(assignment)
        self._log_survivor(assignment)
        logger.info(f"Assigned {assigned_drone} to deliver at ({lat}, {lon}) for {survivor_id}")

        return assignment

    def complete_delivery(self, survivor_id: str, drone_id: str, drop_accuracy: float):
        """Record a completed delivery and free up the drone."""
        delivery = {
            'survivorId': survivor_id,
            'droneId': drone_id,
            'dropAccuracy': drop_accuracy,
            'timestamp': datetime.now().isoformat(),
            'scoringZone': self.calculate_scoring_zone(drop_accuracy),
        }

        self.completed_deliveries.append(delivery)
        self.set_drone_available(drone_id, True)

        # Remove from queue
        self.delivery_queue = [
            d for d in self.delivery_queue
            if d.get('survivorId') != survivor_id
        ]

        self._log_delivery(delivery)
        logger.info(
            f"Delivery completed: {drone_id} -> {survivor_id} "
            f"(accuracy: {drop_accuracy:.2f}m, zone: {delivery['scoringZone']})"
        )

    @staticmethod
    def calculate_scoring_zone(accuracy: float) -> str:
        """Calculate scoring zone based on drop accuracy."""
        if accuracy <= 1.0:
            return 'A'  # 20 points
        elif accuracy <= 2.0:
            return 'B'  # 14 points
        elif accuracy <= 3.0:
            return 'C'  # 8 points
        else:
            return 'miss'  # 0 points

    @staticmethod
    def get_zone_points(zone: str) -> int:
        """Get points for a scoring zone."""
        return {'A': 20, 'B': 14, 'C': 8, 'miss': 0}.get(zone, 0)

    def _log_survivor(self, assignment: Dict[str, Any]):
        """Log survivor assignment to CSV file."""
        filepath = os.path.join('data', 'survivor_log.csv')
        file_exists = os.path.exists(filepath)

        try:
            with open(filepath, 'a', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=[
                    'timestamp', 'survivorId', 'droneId', 'lat', 'lon'
                ])
                if not file_exists:
                    writer.writeheader()
                writer.writerow(assignment)
        except Exception as e:
            logger.error(f"Failed to log survivor: {e}")

    def _log_delivery(self, delivery: Dict[str, Any]):
        """Log completed delivery to CSV file."""
        filepath = os.path.join('data', 'delivery_log.csv')
        file_exists = os.path.exists(filepath)

        try:
            with open(filepath, 'a', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=[
                    'timestamp', 'survivorId', 'droneId', 'dropAccuracy', 'scoringZone'
                ])
                if not file_exists:
                    writer.writeheader()
                writer.writerow(delivery)
        except Exception as e:
            logger.error(f"Failed to log delivery: {e}")

    def get_mission_summary(self) -> Dict[str, Any]:
        """Generate a summary of the current mission status."""
        total_deliveries = len(self.completed_deliveries)
        zone_counts = {'A': 0, 'B': 0, 'C': 0, 'miss': 0}
        total_score = 0

        for d in self.completed_deliveries:
            zone = d.get('scoringZone', 'miss')
            zone_counts[zone] = zone_counts.get(zone, 0) + 1
            total_score += self.get_zone_points(zone)

        return {
            'totalDeliveries': total_deliveries,
            'pendingQueue': len(self.delivery_queue),
            'zoneCounts': zone_counts,
            'totalScore': total_score,
            'droneStatus': {
                drone_id: {
                    'available': info['available'],
                    'payloadsRemaining': info['payload_count'],
                }
                for drone_id, info in self.drone_positions.items()
            },
        }
