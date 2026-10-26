// ============================================
// NIDAR RescueSwarm GCS - Type Definitions
// ============================================

// ---- Drone Types ----
export type DroneId = 'INS-01' | 'DEL-01' | 'DEL-02';
export type DroneType = 'inspection' | 'delivery';
export type FlightMode = 'STABILIZE' | 'GUIDED' | 'AUTO' | 'RTL' | 'LAND' | 'LOITER' | 'POSHOLD';
export type DroneStatus = 'idle' | 'armed' | 'flying' | 'returning' | 'landing' | 'error' | 'offline';
export type PayloadStatus = 'loaded' | 'releasing' | 'released' | 'empty';

export interface DronePosition {
  lat: number;
  lon: number;
  alt: number;        // meters AGL
  heading: number;    // degrees 0-360
  groundspeed: number; // m/s
  airspeed: number;    // m/s
}

export interface DroneTelemetry {
  droneId: DroneId;
  droneType: DroneType;
  status: DroneStatus;
  mode: FlightMode;
  position: DronePosition;
  battery: {
    voltage: number;     // volts (6S: 22.2V nominal)
    percentage: number;  // 0-100
    current: number;     // amps
  };
  gps: {
    satellites: number;
    hdop: number;
    fix: number;
  };
  signal: {
    rssi: number;        // dBm
    remRssi: number;
    noise: number;
    remNoise: number;
  };
  attitude: {
    roll: number;
    pitch: number;
    yaw: number;
  };
  lastHeartbeat: number; // timestamp ms
  armed: boolean;
  payload?: PayloadStatus;
}

// ---- Survivor Types ----
export type SurvivorStatus = 'detected' | 'confirmed' | 'dispatched' | 'delivered' | 'failed';

export interface Survivor {
  id: string;
  lat: number;
  lon: number;
  confidence: number;     // 0-100
  detectedAt: number;     // timestamp ms
  confirmedAt?: number;
  deliveredAt?: number;
  status: SurvivorStatus;
  assignedDrone?: DroneId;
  dropAccuracy?: number;  // meters
  scoringZone?: 'A' | 'B' | 'C' | 'miss';
  imageUrl?: string;
}

// ---- Mission Types ----
export type MissionPhase = 'pre-flight' | 'ready' | 'searching' | 'active' | 'returning' | 'completed' | 'aborted';

export interface MissionState {
  phase: MissionPhase;
  startTime: number | null;
  elapsedSeconds: number;
  maxDurationSeconds: number;  // 1800 = 30 min
  bonusThresholdSeconds: number; // 900 = 15 min
  searchCoverage: number;    // 0-100%
  survivorsFound: number;
  survivorsConfirmed: number;
  deliveriesCompleted: number;
  deliveriesTotal: number;
  totalScore: number;
  manualInterventions: number;
  penaltyPoints: number;
}

// ---- Serial Connection Types ----
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export interface SerialConfig {
  port: string;
  baudRate: number;
}

export interface SerialState {
  status: ConnectionStatus;
  port: string;
  baudRate: number;
  lastError?: string;
  packetsReceived: number;
  packetsSent: number;
}

// ---- Alert Types ----
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertType = 'battery' | 'signal' | 'geofence' | 'survivor' | 'system' | 'rto';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: number;
  droneId?: DroneId;
  dismissed: boolean;
  autoAction?: string;
}

// ---- Scoring Types ----
export interface ScoringZone {
  zone: 'A' | 'B' | 'C';
  maxRadius: number;  // meters
  points: number;
}

export const SCORING_ZONES: ScoringZone[] = [
  { zone: 'A', maxRadius: 1, points: 20 },
  { zone: 'B', maxRadius: 2, points: 14 },
  { zone: 'C', maxRadius: 3, points: 8 },
];

// ---- Pre-flight Checklist ----
export interface ChecklistItem {
  id: string;
  label: string;
  category: 'hardware' | 'software' | 'communication' | 'safety';
  status: 'pending' | 'checking' | 'passed' | 'failed';
  required: boolean;
}

// ---- Electron API Type Declaration ----
export interface ElectronAPI {
  serialConnect: (port: string, baudRate: number) => Promise<{ status: string }>;
  serialDisconnect: () => Promise<{ status: string }>;
  emergencyRTO: () => Promise<{ status: string }>;
  abortDrone: (droneId: string) => Promise<{ status: string }>;
  startMission: () => Promise<{ status: string }>;
  confirmSurvivor: (survivorId: string, lat: number, lon: number, assignedDrone: string) => Promise<{ status: string }>;
  sendCommand: (droneId: string, command: string, params: Record<string, unknown>) => Promise<{ status: string }>;
  onTelemetryUpdate: (callback: (data: Record<string, DroneTelemetry>) => void) => () => void;
  onSerialStatus: (callback: (data: SerialState) => void) => () => void;
  onSurvivorDetected: (callback: (data: Survivor) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
