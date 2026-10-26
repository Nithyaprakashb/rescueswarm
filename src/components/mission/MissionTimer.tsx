import React, { useMemo } from 'react';
import { Timer, Trophy } from 'lucide-react';
import { useMissionStore } from '@/stores/missionStore';

export function MissionTimer() {
  const m = useMissionStore((s) => s.mission);
  const rem = useMemo(() => { const r = Math.max(0, m.maxDurationSeconds - m.elapsedSeconds); return { min: Math.floor(r / 60), sec: r % 60, r }; }, [m.elapsedSeconds, m.maxDurationSeconds]);
  const bonus = m.elapsedSeconds <= m.bonusThresholdSeconds;
  const warn = rem.r <= 300; const crit = rem.r <= 60;
  const tc = crit ? 'text-gcs-red animate-blink' : warn ? 'text-gcs-amber' : 'text-gcs-text';
  const pp = Math.min((m.elapsedSeconds / m.maxDurationSeconds) * 100, 100);

  return (
    <div className="bg-white rounded-xl p-2.5 border border-gcs-border shadow-card flex flex-col">
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center"><Timer className="w-3 h-3 text-gcs-cyan" /></div>
          <span className="text-[11px] font-semibold text-gcs-text tracking-tight">Mission Clock</span>
        </div>
        {bonus && m.startTime && (
          <div className="flex items-center gap-1 text-gcs-emerald bg-green-50 px-1.5 py-[1px] rounded-full border border-green-200">
            <Trophy className="w-2.5 h-2.5" /><span className="text-[9px] font-semibold">Bonus</span>
          </div>
        )}
      </div>
      <div className={`text-center font-mono font-bold text-[28px] ${tc} leading-tight tracking-tight`}>
        {String(rem.min).padStart(2, '0')}:{String(rem.sec).padStart(2, '0')}
      </div>
      <div className="relative h-[4px] bg-gray-100 rounded-full overflow-hidden mt-0.5">
        <div className={`h-full rounded-full transition-all duration-1000 ${crit ? 'bg-gcs-red' : warn ? 'bg-gcs-amber' : 'bg-gcs-cyan'}`} style={{ width: `${pp}%` }} />
        <div className="absolute top-0 w-[2px] h-full bg-gcs-emerald rounded" style={{ left: `${(m.bonusThresholdSeconds / m.maxDurationSeconds) * 100}%` }} />
      </div>
      <div className="flex justify-between mt-0.5 text-[8px] text-gcs-subtle font-mono">
        <span>{Math.floor(m.elapsedSeconds / 60)}m elapsed</span><span className="text-gcs-emerald font-medium">15m bonus</span><span>30m max</span>
      </div>
    </div>
  );
}
