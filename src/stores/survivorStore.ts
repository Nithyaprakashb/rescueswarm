import { create } from 'zustand';
import type { Survivor, SurvivorStatus, DroneId } from '@/types';
import { SCORING_ZONES } from '@/types';

interface SurvivorStore {
  survivors: Survivor[];
  
  addSurvivor: (survivor: Omit<Survivor, 'id' | 'status' | 'detectedAt'>) => void;
  confirmSurvivor: (id: string) => void;
  assignDrone: (survivorId: string, droneId: DroneId) => void;
  markDelivered: (survivorId: string, dropAccuracy: number) => void;
  markFailed: (survivorId: string) => void;
  updateSurvivorStatus: (id: string, status: SurvivorStatus) => void;
  getSurvivorById: (id: string) => Survivor | undefined;
  getPendingSurvivors: () => Survivor[];
  getConfirmedSurvivors: () => Survivor[];
  clearSurvivors: () => void;
}

function calculateScoringZone(accuracy: number): 'A' | 'B' | 'C' | 'miss' {
  for (const zone of SCORING_ZONES) {
    if (accuracy <= zone.maxRadius) return zone.zone;
  }
  return 'miss';
}

export const useSurvivorStore = create<SurvivorStore>((set, get) => ({
  survivors: [],

  addSurvivor: (survivor) =>
    set((state) => ({
      survivors: [
        ...state.survivors,
        {
          ...survivor,
          id: `SRV-${String(state.survivors.length + 1).padStart(3, '0')}`,
          status: 'detected' as SurvivorStatus,
          detectedAt: Date.now(),
        },
      ],
    })),

  confirmSurvivor: (id) =>
    set((state) => ({
      survivors: state.survivors.map((s) =>
        s.id === id ? { ...s, status: 'confirmed' as SurvivorStatus, confirmedAt: Date.now() } : s
      ),
    })),

  assignDrone: (survivorId, droneId) =>
    set((state) => ({
      survivors: state.survivors.map((s) =>
        s.id === survivorId
          ? { ...s, status: 'dispatched' as SurvivorStatus, assignedDrone: droneId }
          : s
      ),
    })),

  markDelivered: (survivorId, dropAccuracy) =>
    set((state) => ({
      survivors: state.survivors.map((s) =>
        s.id === survivorId
          ? {
              ...s,
              status: 'delivered' as SurvivorStatus,
              deliveredAt: Date.now(),
              dropAccuracy,
              scoringZone: calculateScoringZone(dropAccuracy),
            }
          : s
      ),
    })),

  markFailed: (survivorId) =>
    set((state) => ({
      survivors: state.survivors.map((s) =>
        s.id === survivorId ? { ...s, status: 'failed' as SurvivorStatus } : s
      ),
    })),

  updateSurvivorStatus: (id, status) =>
    set((state) => ({
      survivors: state.survivors.map((s) => (s.id === id ? { ...s, status } : s)),
    })),

  getSurvivorById: (id) => get().survivors.find((s) => s.id === id),
  
  getPendingSurvivors: () =>
    get().survivors.filter((s) => s.status === 'detected'),
  
  getConfirmedSurvivors: () =>
    get().survivors.filter((s) => s.status === 'confirmed' || s.status === 'dispatched'),

  clearSurvivors: () => set({ survivors: [] }),
}));
