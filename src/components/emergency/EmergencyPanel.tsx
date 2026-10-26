import React, { useState, useCallback } from 'react';
import { ShieldAlert, RotateCcw, PlaneLanding, AlertTriangle } from 'lucide-react';
import { useMissionStore } from '@/stores/missionStore';
import { useTelemetryStore } from '@/stores/telemetryStore';
import type { DroneId } from '@/types';

export function EmergencyPanel() {
  const [rtoConfirm, setRtoConfirm] = useState(false);
  const rtoActive = useMissionStore((s) => s.rtoActive);
  const activateRTO = useMissionStore((s) => s.activateRTO);
  const deactivateRTO = useMissionStore((s) => s.deactivateRTO);
  const addAlert = useMissionStore((s) => s.addAlert);
  const incrementManualIntervention = useMissionStore((s) => s.incrementManualIntervention);
  const drones = useTelemetryStore((s) => s.drones);

  const handleRTO = useCallback(async () => {
    if (!rtoConfirm) { setRtoConfirm(true); setTimeout(() => setRtoConfirm(false), 5000); return; }
    activateRTO();
    addAlert({ type: 'rto', severity: 'emergency', title: 'EMERGENCY RECALL', message: 'All drones RTL.' });
    if (window.electronAPI) await window.electronAPI.emergencyRTO();
    setRtoConfirm(false);
  }, [rtoConfirm, activateRTO, addAlert]);

  const handleAbort = useCallback(async (id: DroneId) => {
    incrementManualIntervention();
    addAlert({ type: 'system', severity: 'critical', title: `Abort: ${id}`, message: `-50 penalty applied.`, droneId: id });
    if (window.electronAPI) await window.electronAPI.abortDrone(id);
  }, [incrementManualIntervention, addAlert]);

  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 rounded-xl border border-red-200 shadow-card shrink-0">
        <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center"><ShieldAlert className="w-3 h-3 text-gcs-red" /></div>
        <span className="text-[11px] font-semibold text-gcs-red tracking-tight">Emergency</span>
      </div>
      <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-y-auto">
        <button onClick={handleRTO} disabled={rtoActive}
          className={`w-full py-3 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 transition-all shadow-card shrink-0
            ${rtoActive ? 'bg-gcs-red text-white glow-red' : rtoConfirm ? 'bg-red-100 text-gcs-red border-2 border-gcs-red animate-pulse'
            : 'bg-white text-gcs-red border border-red-200 hover:bg-red-50 hover:border-gcs-red active:scale-[0.98]'}`}>
          <RotateCcw className={`w-4 h-4 ${rtoActive ? 'animate-spin' : ''}`} />
          {rtoActive ? 'RTO Active' : rtoConfirm ? 'Tap Again' : 'Emergency Recall'}
        </button>
        {rtoActive && (
          <button onClick={() => deactivateRTO()} className="w-full py-1.5 rounded-lg bg-white border border-gcs-border text-[11px] text-gcs-muted hover:text-gcs-text shadow-card shrink-0">Cancel Override</button>
        )}
        <span className="text-[9px] text-gcs-subtle font-medium uppercase tracking-wider px-0.5 shrink-0">Drone Controls</span>
        {(['INS-01', 'DEL-01', 'DEL-02'] as DroneId[]).map((id) => {
          const on = drones[id].status !== 'offline';
          const ac = id === 'INS-01' ? '#248AFD' : '#F5A623';
          return (
            <div key={id} className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-2 border border-gcs-border shadow-card shrink-0">
              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${on ? '' : 'opacity-30'}`} style={{ backgroundColor: ac }} />
              <span className="text-[11px] font-mono font-semibold flex-1" style={{ color: ac }}>{id}</span>
              <button onClick={() => handleAbort(id)} disabled={!on}
                className="flex items-center gap-1 px-2 py-1 text-[9px] font-semibold rounded-md bg-red-50 text-gcs-red border border-red-200 hover:bg-red-100 disabled:opacity-25 disabled:cursor-not-allowed transition-all">
                <PlaneLanding className="w-2.5 h-2.5" /> Abort
              </button>
            </div>
          );
        })}
        <div className="flex items-start gap-1.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[9px] text-amber-700 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gcs-amber" />
          <div><span className="font-semibold">Penalty Warning</span><br /><span className="opacity-70">Each abort = -50 marks</span></div>
        </div>
      </div>
    </div>
  );
}
