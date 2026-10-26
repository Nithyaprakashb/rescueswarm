import React, { useState, useEffect } from 'react';
import { Rocket, Shield, Radio, Battery, Satellite, Check } from 'lucide-react';
import { useMissionStore } from '@/stores/missionStore';
import { useTelemetryStore } from '@/stores/telemetryStore';

export function LaunchOverlay() {
  const startMission = useMissionStore((s) => s.startMission);
  const addAlert = useMissionStore((s) => s.addAlert);
  const drones = useTelemetryStore((s) => s.drones);
  const serial = useTelemetryStore((s) => s.serial);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      startMission();
      addAlert({ type: 'system', severity: 'info', title: 'Mission Started', message: 'INS-01 search pattern initiated. Timer running.' });
      if (window.electronAPI) window.electronAPI.startMission();
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, startMission, addAlert]);

  const handleLaunch = () => { setCountdown(3); };

  const checks = [
    { label: 'Serial Link', ok: serial.status === 'connected', icon: Radio },
    { label: 'INS-01 Online', ok: drones['INS-01'].status !== 'offline', icon: Shield },
    { label: 'DEL-01 Online', ok: drones['DEL-01'].status !== 'offline', icon: Shield },
    { label: 'DEL-02 Online', ok: drones['DEL-02'].status !== 'offline', icon: Shield },
    { label: 'GPS Lock', ok: Object.values(drones).every(d => d.gps.satellites >= 6), icon: Satellite },
    { label: 'Battery OK', ok: Object.values(drones).every(d => d.battery.percentage > 20), icon: Battery },
  ];
  const allOk = checks.every(c => c.ok);

  return (
    <div className="absolute inset-0 z-40 bg-gcs-bg/80 ios-blur flex items-center justify-center">
      <div className="bg-white rounded-3xl border border-gcs-border shadow-ios-lg w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-gcs-cyan to-blue-500 px-7 py-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Ready to Launch</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">All pre-flight checks passed</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gcs-muted">System Status</span>
          <div className="space-y-1.5">
            {checks.map((c) => (
              <div key={c.label} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border ${c.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <c.icon className={`w-4 h-4 ${c.ok ? 'text-gcs-emerald' : 'text-gcs-red'}`} />
                <span className={`text-[12px] flex-1 ${c.ok ? 'text-gcs-emerald font-medium' : 'text-gcs-red'}`}>{c.label}</span>
                {c.ok && <Check className="w-4 h-4 text-gcs-emerald" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 border-t border-gcs-border">
          {countdown !== null ? (
            <div className="text-center">
              <div className="text-[56px] font-mono font-bold text-gcs-cyan leading-none mb-2">{countdown}</div>
              <p className="text-[12px] text-gcs-muted">Launching mission...</p>
            </div>
          ) : (
            <button onClick={handleLaunch} disabled={!allOk}
              className={`w-full py-4 rounded-2xl font-semibold text-[16px] flex items-center justify-center gap-3 transition-all
                ${allOk ? 'bg-gcs-cyan text-white shadow-ios hover:brightness-105 active:scale-[0.98]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
              <Rocket className="w-5 h-5" /> Launch Mission
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
