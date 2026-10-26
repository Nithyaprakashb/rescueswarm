import React, { useState, useEffect } from 'react';
import { Radio, WifiOff, Clock, Shield } from 'lucide-react';
import { useTelemetryStore } from '@/stores/telemetryStore';
import { useMissionStore } from '@/stores/missionStore';

export function StatusBar() {
  const serial = useTelemetryStore((s) => s.serial);
  const mission = useMissionStore((s) => s.mission);
  const [time, setTime] = useState(new Date());
  const cc = serial.status === 'connected' ? 'text-gcs-emerald' : serial.status === 'connecting' || serial.status === 'reconnecting' ? 'text-gcs-amber animate-pulse' : 'text-gcs-red';

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="h-11 bg-white/80 ios-blur border-b border-gcs-border flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-gcs-cyan flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
        <span className="font-semibold text-gcs-text text-[13px] tracking-tight">NIDAR RescueSwarm</span>
        <span className="text-gcs-subtle text-[11px]">GCS v1.0</span>
      </div>
      <div className="flex items-center">
        <div className="flex items-center gap-1.5 bg-gcs-bg px-3 py-1 rounded-full">
          <div className={`w-[6px] h-[6px] rounded-full ${mission.phase === 'searching' || mission.phase === 'active' ? 'bg-gcs-emerald animate-pulse' : mission.phase === 'pre-flight' || mission.phase === 'ready' ? 'bg-gcs-amber' : 'bg-gray-300'}`} />
          <span className="uppercase text-gcs-muted text-[11px] font-medium tracking-wide">{mission.phase}</span>
        </div>
      </div>
      <div className="flex items-center gap-5 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-gcs-subtle">Packets</span>
          <span className="font-mono font-semibold text-gcs-text">{serial.packetsReceived}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {serial.status === 'connected' ? <Radio className={`w-3.5 h-3.5 ${cc}`} /> : <WifiOff className={`w-3.5 h-3.5 ${cc}`} />}
          <span className={`${cc} font-medium font-mono`}>{serial.port}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gcs-subtle">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">{time.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}
