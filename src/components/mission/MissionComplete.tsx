import React from 'react';
import { Trophy, Users, Package, Target, Clock, AlertTriangle, RotateCcw } from 'lucide-react';
import { useMissionStore } from '@/stores/missionStore';
import { useSurvivorStore } from '@/stores/survivorStore';

export function MissionComplete() {
  const m = useMissionStore((s) => s.mission);
  const resetMission = useMissionStore((s) => s.resetMission);
  const survivors = useSurvivorStore((s) => s.survivors);
  const clearSurvivors = useSurvivorStore((s) => s.clearSurvivors);
  const delivered = survivors.filter(s => s.status === 'delivered').length;
  const zoneA = survivors.filter(s => s.scoringZone === 'A').length;
  const zoneB = survivors.filter(s => s.scoringZone === 'B').length;
  const zoneC = survivors.filter(s => s.scoringZone === 'C').length;
  const bonusEarned = m.elapsedSeconds <= m.bonusThresholdSeconds;
  const elapsed = `${Math.floor(m.elapsedSeconds / 60)}m ${m.elapsedSeconds % 60}s`;

  const handleReset = () => { resetMission(); clearSurvivors(); };

  return (
    <div className="absolute inset-0 z-40 bg-gcs-bg/80 ios-blur flex items-center justify-center">
      <div className="bg-white rounded-3xl border border-gcs-border shadow-ios-lg w-full max-w-lg overflow-hidden">
        <div className={`px-7 py-6 ${m.totalScore >= 150 ? 'bg-gradient-to-r from-gcs-emerald to-green-500' : 'bg-gradient-to-r from-gcs-cyan to-blue-500'}`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Mission Complete</h1>
              <p className="text-[11px] text-white/70 mt-0.5">Duration: {elapsed}</p>
            </div>
            <div className="ml-auto bg-white/20 px-4 py-2 rounded-2xl">
              <div className="text-[28px] font-mono font-bold text-white leading-none">{m.totalScore}</div>
              <div className="text-[9px] text-white/70 text-center mt-0.5">POINTS</div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Metric icon={Users} label="Detected" value={m.survivorsFound} sub="/10" color="text-gcs-cyan" bg="bg-blue-50" />
            <Metric icon={Package} label="Delivered" value={delivered} sub="/10" color="text-gcs-emerald" bg="bg-green-50" />
            <Metric icon={Target} label="Coverage" value={`${m.searchCoverage.toFixed(0)}%`} color="text-gcs-amber" bg="bg-amber-50" />
          </div>

          <div className="bg-gray-50 rounded-xl p-3.5 border border-gcs-border">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gcs-muted block mb-2">Drop Accuracy</span>
            <div className="grid grid-cols-3 gap-2">
              <ZoneStat zone="A" label="Under 1m" count={zoneA} points={zoneA * 20} color="text-gcs-emerald" />
              <ZoneStat zone="B" label="1-2m" count={zoneB} points={zoneB * 14} color="text-gcs-amber" />
              <ZoneStat zone="C" label="2-3m" count={zoneC} points={zoneC * 8} color="text-gcs-rose" />
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-gcs-red" />
              <span className="text-[11px] text-gcs-muted">Penalties</span>
              <span className={`text-[12px] font-mono font-semibold ${m.penaltyPoints > 0 ? 'text-gcs-red' : 'text-gcs-emerald'}`}>
                {m.penaltyPoints > 0 ? `-${m.penaltyPoints}` : '0'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gcs-emerald" />
              <span className="text-[11px] text-gcs-muted">Time Bonus</span>
              <span className={`text-[12px] font-mono font-semibold ${bonusEarned ? 'text-gcs-emerald' : 'text-gcs-red'}`}>
                {bonusEarned ? '+50' : '0'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gcs-border">
          <button onClick={handleReset}
            className="w-full py-3.5 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2.5 bg-gcs-cyan text-white shadow-ios hover:brightness-105 active:scale-[0.98] transition-all">
            <RotateCcw className="w-4 h-4" /> New Mission
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: I, label, value, sub, color, bg }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string; bg: string }) {
  return (
    <div className={`${bg} rounded-xl p-3 border border-gcs-border/50 text-center`}>
      <I className={`w-4 h-4 ${color} mx-auto mb-1`} />
      <div className={`text-[18px] font-mono font-bold ${color}`}>{value}<span className="text-[11px] text-gcs-subtle">{sub}</span></div>
      <div className="text-[9px] text-gcs-muted mt-0.5">{label}</div>
    </div>
  );
}

function ZoneStat({ zone, label, count, points, color }: { zone: string; label: string; count: number; points: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-[14px] font-mono font-bold ${color}`}>Zone {zone}</div>
      <div className="text-[10px] text-gcs-subtle">{label}</div>
      <div className="text-[12px] font-mono font-semibold text-gcs-text mt-1">{count} drops</div>
      <div className={`text-[10px] font-semibold ${color}`}>+{points} pts</div>
    </div>
  );
}
