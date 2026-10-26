import { create } from 'zustand';
import type { MissionPhase, MissionState, Alert, AlertSeverity, AlertType, DroneId, ChecklistItem } from '@/types';

interface MissionStore {
  // Mission state
  mission: MissionState;
  
  // Alerts
  alerts: Alert[];
  
  // Pre-flight checklist
  checklist: ChecklistItem[];
  
  // RTO state
  rtoActive: boolean;

  // KML & Boundary status
  kmlLoaded: boolean;
  kmlFileName: string | null;
  fleetUploaded: boolean;
  
  // Actions
  setPhase: (phase: MissionPhase) => void;
  startMission: () => void;
  tickTimer: () => void;
  updateSearchCoverage: (coverage: number) => void;
  incrementSurvivorsFound: () => void;
  incrementSurvivorsConfirmed: () => void;
  incrementDeliveriesCompleted: () => void;
  addScore: (points: number) => void;
  incrementManualIntervention: () => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'dismissed'>) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  activateRTO: () => void;
  deactivateRTO: () => void;
  updateChecklistItem: (id: string, status: ChecklistItem['status']) => void;
  importKml: (fileName: string) => void;
  uploadFleetMission: () => void;
  resetMission: () => void;
}

const defaultChecklist: ChecklistItem[] = [
  { id: 'sw-kml', label: 'Mission KML imported & boundary verified', category: 'software', status: 'pending', required: true },
  { id: 'sw-grid', label: 'Auto-generated 30m search grid verified', category: 'software', status: 'pending', required: true },
  { id: 'comm-fleet', label: '1-Click mission uploaded to fleet', category: 'communication', status: 'pending', required: true },
  { id: 'hw-power', label: 'All 3 drones powered on', category: 'hardware', status: 'pending', required: true },
  { id: 'hw-radio', label: 'RFD900x radio link operational', category: 'hardware', status: 'pending', required: true },
  { id: 'comm-heartbeat', label: 'MAVLink heartbeats received (<5s)', category: 'communication', status: 'pending', required: true },
  { id: 'safe-battery', label: 'All batteries ≥ 21.6V (20%)', category: 'safety', status: 'pending', required: true },
  { id: 'safe-gps', label: 'GPS fix acquired (≥ 8 sats)', category: 'safety', status: 'pending', required: true },
  { id: 'safe-rto', label: 'Emergency RTO switch operational', category: 'safety', status: 'pending', required: true },
];

const defaultMission: MissionState = {
  phase: 'pre-flight',
  startTime: null,
  elapsedSeconds: 0,
  maxDurationSeconds: 1800,
  bonusThresholdSeconds: 900,
  searchCoverage: 0,
  survivorsFound: 0,
  survivorsConfirmed: 0,
  deliveriesCompleted: 0,
  deliveriesTotal: 10,
  totalScore: 0,
  manualInterventions: 0,
  penaltyPoints: 0,
};

export const useMissionStore = create<MissionStore>((set, get) => ({
  mission: { ...defaultMission },
  alerts: [],
  checklist: [...defaultChecklist],
  rtoActive: false,
  kmlLoaded: false,
  kmlFileName: null,
  fleetUploaded: false,

  setPhase: (phase) =>
    set((state) => ({ mission: { ...state.mission, phase } })),

  startMission: () =>
    set((state) => ({
      mission: {
        ...state.mission,
        phase: 'searching',
        startTime: Date.now(),
        elapsedSeconds: 0,
      },
    })),

  tickTimer: () =>
    set((state) => {
      if (!state.mission.startTime) return state;
      const elapsed = Math.floor((Date.now() - state.mission.startTime) / 1000);
      return {
        mission: { ...state.mission, elapsedSeconds: elapsed },
      };
    }),

  updateSearchCoverage: (coverage) =>
    set((state) => ({ mission: { ...state.mission, searchCoverage: Math.min(coverage, 100) } })),

  incrementSurvivorsFound: () =>
    set((state) => ({
      mission: { ...state.mission, survivorsFound: state.mission.survivorsFound + 1 },
    })),

  incrementSurvivorsConfirmed: () =>
    set((state) => ({
      mission: { ...state.mission, survivorsConfirmed: state.mission.survivorsConfirmed + 1 },
    })),

  incrementDeliveriesCompleted: () =>
    set((state) => ({
      mission: { ...state.mission, deliveriesCompleted: state.mission.deliveriesCompleted + 1 },
    })),

  addScore: (points) =>
    set((state) => ({
      mission: { ...state.mission, totalScore: state.mission.totalScore + points },
    })),

  incrementManualIntervention: () =>
    set((state) => ({
      mission: {
        ...state.mission,
        manualInterventions: state.mission.manualInterventions + 1,
        penaltyPoints: state.mission.penaltyPoints + 50,
      },
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        {
          ...alert,
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          dismissed: false,
        },
        ...state.alerts,
      ].slice(0, 50),
    })),

  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    })),

  clearAlerts: () => set({ alerts: [] }),

  activateRTO: () => set({ rtoActive: true }),
  deactivateRTO: () => set({ rtoActive: false }),

  updateChecklistItem: (id, status) =>
    set((state) => ({
      checklist: state.checklist.map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    })),

  importKml: (fileName: string) => {
    set((state) => ({
      kmlLoaded: true,
      kmlFileName: fileName,
      checklist: state.checklist.map((item) =>
        item.id === 'sw-kml' || item.id === 'sw-grid' ? { ...item, status: 'passed' } : item
      ),
    }));
    get().addAlert({
      type: 'system',
      severity: 'info',
      title: 'Mission KML Loaded',
      message: `Boundary loaded from ${fileName}. 30m boustrophedon grid generated for INS-01.`,
    });
  },

  uploadFleetMission: () => {
    set((state) => ({
      fleetUploaded: true,
      checklist: state.checklist.map((item) =>
        item.id === 'comm-fleet' ? { ...item, status: 'passed' } : item
      ),
    }));
    get().addAlert({
      type: 'system',
      severity: 'info',
      title: 'Mission Uploaded to Fleet',
      message: 'MAVLink MISSION_ITEM_INT sent to INS-01, DEL-01, DEL-02.',
    });
  },

  resetMission: () =>
    set({
      mission: { ...defaultMission },
      alerts: [],
      checklist: [...defaultChecklist],
      rtoActive: false,
      kmlLoaded: false,
      kmlFileName: null,
      fleetUploaded: false,
    }),
}));
