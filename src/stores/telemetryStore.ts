import { create } from 'zustand';
import type { DroneTelemetry, DroneId, ConnectionStatus, SerialState } from '@/types';

interface TelemetryStore {
  // Drone telemetry data
  drones: Record<DroneId, DroneTelemetry>;
  
  // Serial connection state
  serial: SerialState;
  
  // Actions
  updateTelemetry: (droneId: DroneId, data: Partial<DroneTelemetry>) => void;
  updateAllTelemetry: (data: Record<string, DroneTelemetry>) => void;
  setSerialStatus: (status: ConnectionStatus) => void;
  updateSerial: (data: Partial<SerialState>) => void;
  resetTelemetry: () => void;
}

const defaultDroneTelemetry = (id: DroneId, type: 'inspection' | 'delivery'): DroneTelemetry => ({
  droneId: id,
  droneType: type,
  status: 'offline',
  mode: 'STABILIZE',
  position: { lat: 0, lon: 0, alt: 0, heading: 0, groundspeed: 0, airspeed: 0 },
  battery: { voltage: 0, percentage: 0, current: 0 },
  gps: { satellites: 0, hdop: 99.99, fix: 0 },
  signal: { rssi: 0, remRssi: 0, noise: 0, remNoise: 0 },
  attitude: { roll: 0, pitch: 0, yaw: 0 },
  lastHeartbeat: 0,
  armed: false,
});

export const useTelemetryStore = create<TelemetryStore>((set) => ({
  drones: {
    'INS-01': defaultDroneTelemetry('INS-01', 'inspection'),
    'DEL-01': defaultDroneTelemetry('DEL-01', 'delivery'),
    'DEL-02': defaultDroneTelemetry('DEL-02', 'delivery'),
  },
  
  serial: {
    status: 'disconnected',
    port: 'COM3',
    baudRate: 57600,
    packetsReceived: 0,
    packetsSent: 0,
  },

  updateTelemetry: (droneId, data) =>
    set((state) => ({
      drones: {
        ...state.drones,
        [droneId]: { ...state.drones[droneId], ...data },
      },
    })),

  updateAllTelemetry: (data) =>
    set((state) => {
      const updated = { ...state.drones };
      for (const [id, telemetry] of Object.entries(data)) {
        if (id in updated) {
          updated[id as DroneId] = { ...updated[id as DroneId], ...telemetry };
        }
      }
      return { drones: updated };
    }),

  setSerialStatus: (status) =>
    set((state) => ({
      serial: { ...state.serial, status },
    })),

  updateSerial: (data) =>
    set((state) => ({
      serial: { ...state.serial, ...data },
    })),

  resetTelemetry: () =>
    set({
      drones: {
        'INS-01': defaultDroneTelemetry('INS-01', 'inspection'),
        'DEL-01': defaultDroneTelemetry('DEL-01', 'delivery'),
        'DEL-02': defaultDroneTelemetry('DEL-02', 'delivery'),
      },
    }),
}));
