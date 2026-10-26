import React, { useEffect, useState } from 'react';
import { TacticalMap } from './components/map/TacticalMap';
import { TelemetryDashboard } from './components/telemetry/TelemetryDashboard';
import { VisionStream } from './components/vision/VisionStream';
import { EmergencyPanel } from './components/emergency/EmergencyPanel';
import { MissionTimer } from './components/mission/MissionTimer';
import { MissionProgress } from './components/mission/MissionProgress';
import { SurvivorLog } from './components/mission/SurvivorLog';
import { AlertBanner } from './components/ui/AlertBanner';
import { StatusBar } from './components/ui/StatusBar';
import { PreFlightChecklist } from './components/mission/PreFlightChecklist';
import { LaunchOverlay } from './components/mission/LaunchOverlay';
import { MissionComplete } from './components/mission/MissionComplete';
import { AlertTriangle } from 'lucide-react';
import { useTelemetryStore } from './stores/telemetryStore';
import { useMissionStore } from './stores/missionStore';
import { useSurvivorStore } from './stores/survivorStore';
import { startSimulation, stopSimulation, isSimulationRunning } from './services/simulationService';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const mission = useMissionStore((s) => s.mission);
  const tickTimer = useMissionStore((s) => s.tickTimer);
  const updateAllTelemetry = useTelemetryStore((s) => s.updateAllTelemetry);
  const updateSerial = useTelemetryStore((s) => s.updateSerial);
  const addSurvivor = useSurvivorStore((s) => s.addSurvivor);
  const addAlert = useMissionStore((s) => s.addAlert);
  const setPhase = useMissionStore((s) => s.setPhase);
  const rtoActive = useMissionStore((s) => s.rtoActive);
  const [simActive, setSimActive] = useState(false);

  // Register keyboard shortcuts (Ctrl+E, Ctrl+L, Ctrl+F, Ctrl+S)
  useKeyboardShortcuts();

  // Mission timer tick
  useEffect(() => {
    if (mission.phase === 'searching' || mission.phase === 'active') {
      const interval = setInterval(tickTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [mission.phase, tickTimer]);

  // Auto-complete mission when timer expires
  useEffect(() => {
    if ((mission.phase === 'searching' || mission.phase === 'active') && mission.elapsedSeconds >= mission.maxDurationSeconds) {
      setPhase('completed');
      addAlert({ type: 'system', severity: 'warning', title: 'Time Expired', message: 'Mission duration limit reached.' });
    }
  }, [mission.elapsedSeconds, mission.maxDurationSeconds, mission.phase, setPhase, addAlert]);

  // Electron IPC listeners
  useEffect(() => {
    if (!window.electronAPI) return;
    const u1 = window.electronAPI.onTelemetryUpdate((d) => updateAllTelemetry(d));
    const u2 = window.electronAPI.onSerialStatus((d) => updateSerial(d));
    const u3 = window.electronAPI.onSurvivorDetected((d) => {
      addSurvivor(d);
      addAlert({ type: 'survivor', severity: 'warning', title: 'Survivor Detected!',
        message: `AI detected at ${d.lat.toFixed(6)}, ${d.lon.toFixed(6)} (${d.confidence}%)`, droneId: 'INS-01' });
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  // Auto-start simulation in browser mode
  useEffect(() => {
    if (!window.electronAPI && !isSimulationRunning()) { startSimulation(); setSimActive(true); }
    return () => { stopSimulation(); };
  }, []);

  // Pre-flight checklist screen
  if (mission.phase === 'pre-flight') {
    return (
      <div className="h-screen w-screen bg-gcs-bg flex flex-col">
        <StatusBar />
        <div className="flex-1 flex items-center justify-center p-8"><PreFlightChecklist /></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-gcs-bg flex flex-col overflow-hidden relative" style={{ aspectRatio: '16/10' }}>
      {/* RTO Overlay */}
      {rtoActive && (
        <div className="absolute inset-0 z-50 bg-red-500/10 border-2 border-gcs-red pointer-events-none flex items-center justify-center">
          <div className="bg-gcs-red text-white text-2xl font-semibold px-8 py-4 rounded-2xl shadow-ios-lg flex items-center gap-3 animate-blink">
            <AlertTriangle className="w-7 h-7" /> EMERGENCY RECALL ACTIVE <AlertTriangle className="w-7 h-7" />
          </div>
        </div>
      )}

      {/* Launch Overlay */}
      {mission.phase === 'ready' && <LaunchOverlay />}

      {/* Mission Complete Overlay */}
      {mission.phase === 'completed' && <MissionComplete />}

      <StatusBar />
      <AlertBanner />

      {/* Main content area — flex-based 2-row layout */}
      <div className="flex-1 flex flex-col gap-2.5 p-3 min-h-0">

        {/* === TOP ROW: Map + Right Sidebar (58% height) === */}
        <div className="flex gap-2.5 min-h-0" style={{ flex: '58 1 0%' }}>

          {/* Tactical Map — 65% width */}
          <div className="rounded-2xl overflow-hidden border border-gcs-border shadow-card min-h-0" style={{ flex: '65 1 0%' }}>
            <TacticalMap />
          </div>

          {/* Right Sidebar — 35% width */}
          <div className="flex flex-col gap-2.5 min-h-0 min-w-0" style={{ flex: '35 1 0%' }}>
            <MissionTimer />
            <MissionProgress />
            <div className="flex-1 rounded-2xl overflow-hidden border border-gcs-border shadow-card min-h-0">
              <VisionStream />
            </div>
          </div>
        </div>

        {/* === BOTTOM ROW: Telemetry + Survivor + Emergency (42% height) === */}
        <div className="flex gap-2.5 min-h-0" style={{ flex: '42 1 0%' }}>

          {/* Fleet Telemetry — 38% width */}
          <div className="min-h-0 min-w-0" style={{ flex: '38 1 0%' }}>
            <TelemetryDashboard />
          </div>

          {/* Survivor Log — 35% width */}
          <div className="rounded-2xl overflow-hidden border border-gcs-border shadow-card min-h-0 min-w-0" style={{ flex: '35 1 0%' }}>
            <SurvivorLog />
          </div>

          {/* Emergency Panel — 27% width */}
          <div className="min-h-0 min-w-0" style={{ flex: '27 1 0%' }}>
            <EmergencyPanel />
          </div>
        </div>
      </div>

      {/* Simulation toggle (browser only) */}
      {!window.electronAPI && (
        <button onClick={() => { if (isSimulationRunning()) { stopSimulation(); setSimActive(false); } else { startSimulation(); setSimActive(true); } }}
          className={`absolute bottom-4 left-4 z-30 px-4 py-1.5 rounded-full text-[11px] font-medium border transition-all shadow-card ${
            simActive ? 'bg-green-50 border-green-300 text-gcs-emerald' : 'bg-white border-gcs-border text-gcs-muted'
          }`}>
          {simActive ? 'SIM ACTIVE' : 'START SIM'}
        </button>
      )}
    </div>
  );
}
