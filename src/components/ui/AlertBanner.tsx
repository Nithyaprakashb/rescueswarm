import React from 'react';
import { AlertTriangle, X, Bell, ShieldAlert } from 'lucide-react';
import { useMissionStore } from '@/stores/missionStore';

export function AlertBanner() {
  const alerts = useMissionStore((s) => s.alerts);
  const dismiss = useMissionStore((s) => s.dismissAlert);
  const active = alerts.filter((a) => !a.dismissed);
  if (active.length === 0) return null;
  const a = active[0];

  const styles: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
    emergency: 'bg-red-100 border-gcs-red text-red-900',
  };
  const icons: Record<string, React.ElementType> = { info: Bell, warning: AlertTriangle, critical: ShieldAlert, emergency: ShieldAlert };
  const I = icons[a.severity] || Bell;

  return (
    <div className={`mx-3 mt-1.5 px-4 py-2.5 rounded-xl border ${styles[a.severity]} flex items-center justify-between shrink-0 shadow-card`}>
      <div className="flex items-center gap-3">
        <I className="w-4 h-4 shrink-0" />
        <div className="text-[12px]">
          <span className="font-semibold">{a.title}</span>
          {a.droneId && <span className="ml-1.5 text-[10px] opacity-50">[{a.droneId}]</span>}
          <span className="ml-2 opacity-70">{a.message}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {active.length > 1 && <span className="text-[10px] bg-white/60 px-2 py-0.5 rounded-full border border-current/10">+{active.length - 1}</span>}
        <button onClick={() => dismiss(a.id)} className="p-1 hover:bg-black/5 rounded-lg"><X className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
