import React from 'react';
import { Users, CheckCircle2, Truck, MapPin, Target } from 'lucide-react';
import { useSurvivorStore } from '@/stores/survivorStore';
import { useMissionStore } from '@/stores/missionStore';
import type { Survivor, DroneId } from '@/types';

function Row({ survivor }: { survivor: Survivor }) {
  const confirm = useSurvivorStore((s) => s.confirmSurvivor);
  const assign = useSurvivorStore((s) => s.assignDrone);
  const incConf = useMissionStore((s) => s.incrementSurvivorsConfirmed);

  const cfg: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    detected:   { color: 'text-gcs-amber',   bg: 'bg-amber-50',  icon: MapPin,       label: 'Detected' },
    confirmed:  { color: 'text-gcs-cyan',    bg: 'bg-blue-50',   icon: CheckCircle2, label: 'Confirmed' },
    dispatched: { color: 'text-purple-600',   bg: 'bg-purple-50', icon: Truck,        label: 'Dispatched' },
    delivered:  { color: 'text-gcs-emerald',  bg: 'bg-green-50',  icon: Target,       label: 'Delivered' },
    failed:     { color: 'text-gcs-red',      bg: 'bg-red-50',    icon: Target,       label: 'Failed' },
  };
  const c = cfg[survivor.status] || cfg.detected;
  const I = c.icon;

  const handleDispatch = async () => {
    confirm(survivor.id); incConf();
    const did: DroneId = 'DEL-01';
    assign(survivor.id, did);
    if (window.electronAPI) await window.electronAPI.confirmSurvivor(survivor.id, survivor.lat, survivor.lon, did);
  };

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 ${c.bg} rounded-xl border border-gcs-border/50`}>
      <I className={`w-4 h-4 ${c.color} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-mono font-semibold text-gcs-text">{survivor.id}</span>
          <span className={`text-[9px] px-1.5 py-[1px] rounded-full ${c.bg} ${c.color} font-semibold border border-current/15`}>{c.label}</span>
          {survivor.scoringZone && (
            <span className={`text-[9px] px-1.5 py-[1px] rounded-full font-semibold ${
              survivor.scoringZone === 'A' ? 'bg-green-50 text-gcs-emerald border border-green-200' :
              survivor.scoringZone === 'B' ? 'bg-amber-50 text-gcs-amber border border-amber-200' :
              survivor.scoringZone === 'C' ? 'bg-orange-50 text-orange-500 border border-orange-200' :
              'bg-red-50 text-gcs-red border border-red-200'
            }`}>Zone {survivor.scoringZone}</span>
          )}
        </div>
        <div className="text-[9px] text-gcs-subtle font-mono mt-0.5">
          {survivor.lat.toFixed(6)}, {survivor.lon.toFixed(6)} | {survivor.confidence.toFixed(0)}%
          {survivor.dropAccuracy !== undefined && ` | ${survivor.dropAccuracy.toFixed(2)}m`}
        </div>
      </div>
      {survivor.status === 'detected' && (
        <button onClick={handleDispatch}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold rounded-lg
            bg-white text-gcs-emerald border border-green-200 hover:bg-green-50 active:scale-95 transition-all shadow-card">
          <CheckCircle2 className="w-3 h-3" /> Confirm
        </button>
      )}
      {survivor.assignedDrone && <span className="text-[9px] font-mono text-gcs-subtle shrink-0">{survivor.assignedDrone}</span>}
    </div>
  );
}

export function SurvivorLog() {
  const survivors = useSurvivorStore((s) => s.survivors);
  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/80 ios-blur border-b border-gcs-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-gcs-emerald" /></div>
          <span className="text-[12px] font-semibold text-gcs-text tracking-tight">Survivor Log</span>
        </div>
        <span className="text-[10px] font-mono text-gcs-subtle bg-gray-50 px-2 py-[2px] rounded-full border border-gcs-border">{survivors.length}/10</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {survivors.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center"><Users className="w-8 h-8 text-gray-200 mx-auto mb-2" /><div className="text-[12px] text-gcs-subtle">No survivors detected</div><div className="text-[10px] text-gray-300 mt-0.5">AI Vision scanning...</div></div>
          </div>
        ) : survivors.map((s) => <Row key={s.id} survivor={s} />)}
      </div>
    </div>
  );
}
