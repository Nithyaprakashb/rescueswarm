import React from 'react';
import { Users, Package, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { useMissionStore } from '@/stores/missionStore';
import { useSurvivorStore } from '@/stores/survivorStore';

function Stat({ icon: I, label, value, total, color }: { icon: React.ElementType; label: string; value: number; total?: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <I className={`w-3 h-3 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between">
          <span className="text-[9px] text-gcs-muted">{label}</span>
          <span className={`text-[11px] font-mono font-semibold ${color}`}>{value}{total !== undefined ? `/${total}` : ''}</span>
        </div>
        {total !== undefined && (
          <div className="h-[3px] bg-gray-100 rounded-full mt-0.5 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${total > 0 ? (value / total) * 100 : 0}%`,
              backgroundColor: color.includes('cyan') ? '#248AFD' : color.includes('emerald') ? '#71C02B' : color.includes('rose') ? '#F5A623' : '#9CA3AF' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export function MissionProgress() {
  const m = useMissionStore((s) => s.mission);
  const svs = useSurvivorStore((s) => s.survivors);
  const del = svs.filter((s) => s.status === 'delivered').length;
  const zA = svs.filter((s) => s.scoringZone === 'A').length;

  return (
    <div className="bg-white rounded-xl p-2.5 border border-gcs-border shadow-card flex flex-col">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center"><TrendingUp className="w-3 h-3 text-gcs-cyan" /></div>
          <span className="text-[11px] font-semibold text-gcs-text tracking-tight">Progress</span>
        </div>
        <div className="flex items-center gap-1 bg-blue-50 px-2 py-[1px] rounded-full border border-blue-200">
          <Target className="w-2.5 h-2.5 text-gcs-cyan" />
          <span className="text-[10px] font-mono font-semibold text-gcs-cyan">{m.totalScore} pts</span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Stat icon={Users} label="Detected" value={m.survivorsFound} total={10} color="text-gcs-cyan" />
        <Stat icon={Target} label="Confirmed" value={m.survivorsConfirmed} total={10} color="text-gcs-amber" />
        <Stat icon={Package} label="Delivered" value={m.deliveriesCompleted} total={10} color="text-gcs-emerald" />
        <Stat icon={Target} label="Zone A" value={zA} total={del || undefined} color="text-gcs-rose" />
        <div className="pt-1 border-t border-gcs-border flex items-center justify-between">
          <span className="text-[9px] text-gcs-muted flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5 text-gcs-red" />Interventions</span>
          <span className={`text-[10px] font-mono font-semibold ${m.manualInterventions > 0 ? 'text-gcs-red' : 'text-gcs-emerald'}`}>
            {m.manualInterventions} ({m.penaltyPoints > 0 ? `-${m.penaltyPoints}` : '0'})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-gcs-subtle">Coverage</span>
          <div className="flex-1 h-[3px] bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-gcs-cyan transition-all" style={{ width: `${m.searchCoverage}%` }} /></div>
          <span className="text-[9px] font-mono text-gcs-cyan font-semibold">{m.searchCoverage.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
