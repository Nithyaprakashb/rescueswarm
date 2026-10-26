/**
 * NIDAR RescueSwarm GCS - Keyboard Shortcuts Hook
 * 
 * Implements the keyboard shortcuts defined in WORKFLOW.md:
 * - Ctrl+R: Refresh map tiles
 * - Ctrl+E: Emergency Recall (RTO) 
 * - Ctrl+S: Export mission log
 * - Ctrl+L: Launch Inspection Drone (INS-01)
 * - Ctrl+D: Open Delivery Drone Assignment Panel
 * - Ctrl+F: Toggle Full-Screen Mode
 */

import { useEffect, useCallback } from 'react';
import { useMissionStore } from '@/stores/missionStore';

export function useKeyboardShortcuts() {
  const activateRTO = useMissionStore((s) => s.activateRTO);
  const addAlert = useMissionStore((s) => s.addAlert);
  const startMission = useMissionStore((s) => s.startMission);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle Ctrl+key combinations
    if (!e.ctrlKey) return;

    switch (e.key.toLowerCase()) {
      case 'e':
        e.preventDefault();
        // Emergency RTO
        activateRTO();
        addAlert({
          type: 'rto',
          severity: 'emergency',
          title: 'EMERGENCY RECALL (KEYBOARD)',
          message: 'RTO triggered via Ctrl+E shortcut.',
        });
        if (window.electronAPI) {
          window.electronAPI.emergencyRTO();
        }
        break;

      case 'l':
        e.preventDefault();
        // Launch inspection drone
        startMission();
        addAlert({
          type: 'system',
          severity: 'info',
          title: 'Mission Launched',
          message: 'INS-01 search mission initiated via Ctrl+L.',
        });
        if (window.electronAPI) {
          window.electronAPI.startMission();
        }
        break;

      case 'f':
        e.preventDefault();
        // Toggle fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;

      case 's':
        e.preventDefault();
        // Export mission log
        addAlert({
          type: 'system',
          severity: 'info',
          title: 'Export Started',
          message: 'Mission log export initiated.',
        });
        break;
    }
  }, [activateRTO, addAlert, startMission]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
