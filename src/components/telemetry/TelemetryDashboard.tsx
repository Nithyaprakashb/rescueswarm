import React from 'react';
import { Battery, Gauge, Satellite, Radio, Plane, ArrowUp, Package, Check, CircleDot } from 'lucide-react';
import { useTelemetryStore } from '@/stores/telemetryStore';
import type { DroneId } from '@/types';

const DA: Record<DroneId, string> = { 'INS-01': '#248AFD', 'DEL-01': '#F5A623', 'DEL-02': '#FFC100' };
const DL: Record<DroneId, string> = { 'INS-01': 'Inspection', 'DEL-01': 'Delivery 1', 'DEL-02': 'Delivery 2' };

function BatteryBar({ voltage, pct }: { voltage: number; pct: number }) {
  const c = pct > 50 ? 'text-gcs-emerald' : pct > 20 ? 'text-gcs-amber' : 'text-gcs-red';
  const b = pct > 50 ? 'bg-gcs-emerald' : pct > 20 ? 'bg-gcs-amber' : 'bg-gcs-red';
  return (
    <div className="flex items-center gap-2">
      <Battery className={`w-3.5 h-3.5 shrink-0 ${c}`} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[10px]"><span className={c}>{voltage.toFixed(1)}V</span><span className={`${c} font-semibold`}>{pct.toFixed(0)}%</span></div>
        <div className="h-[4px] bg-gray-100 rounded-full mt-0.5 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${b}`} style={{ width: `${pct}%` }} /></div>
      </div>
    </div>
  );
}

function Val({ icon: I, label, value, unit, color }: { icon: React.ElementType; label: string; value: string | number; unit: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <I className={`w-3 h-3 shrink-0 ${color || 'text-gcs-subtle'}`} />
      <span className="text-[10px] text-gcs-subtle">{label}</span>
      <span className="text-[10px] font-mono font-semibold text-gcs-text">{value}</span>
      <span className="text-[9px] text-gcs-subtle">{unit}</span>
    </div>
  );
}

function DroneCard({ droneId }: { droneId: DroneId }) {
  const d = useTelemetryStore((s) => s.drones[droneId]);
  const ac = DA[droneId]; const on = d.status !== 'offline';
  return (
    <div className={`bg-white rounded-xl p-2.5 border shadow-card transition-all ${on ? 'border-gcs-border' : 'border-red-200 opacity-50'}`}
      style={{ borderLeftColor: ac, borderLeftWidth: '3px' }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: on ? ac : '#FF4747' }} />
          <span className="text-[11px] font-semibold" style={{ color: ac }}>{droneId}</span>
          <span className="text-[9px] text-gcs-subtle">{DL[droneId]}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-[9px] px-1.5 py-[1px] rounded-full font-mono font-medium ${on ? 'bg-green-50 text-gcs-emerald' : 'bg-red-50 text-gcs-red'}`}>{d.mode}</span>
          {d.payload && (
            <span className={`text-[9px] px-1.5 py-[1px] rounded-full font-medium flex items-center gap-0.5 ${
              d.payload === 'loaded' ? 'bg-amber-50 text-gcs-amber' : d.payload === 'released' ? 'bg-green-50 text-gcs-emerald' : 'bg-gray-50 text-gcs-subtle'
            }`}>
              {d.payload === 'loaded' ? <><Package className="w-2.5 h-2.5" /> Loaded</> : d.payload === 'released' ? <><Check className="w-2.5 h-2.5" /> Dropped</> : <><CircleDot className="w-2.5 h-2.5" /> Empty</>}
            </span>
          )}
        </div>
      </div>
      <BatteryBar voltage={d.battery.voltage} pct={d.battery.percentage} />
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1.5">
        <Val icon={ArrowUp} label="ALT" value={d.position.alt.toFixed(1)} unit="m" />
        <Val icon={Gauge} label="SPD" value={d.position.groundspeed.toFixed(1)} unit="m/s" />
        <Val icon={Satellite} label="SAT" value={d.gps.satellites} unit="" color={d.gps.satellites >= 8 ? 'text-gcs-emerald' : d.gps.satellites >= 5 ? 'text-gcs-amber' : 'text-gcs-red'} />
        <Val icon={Radio} label="RSSI" value={d.signal.rssi} unit="dBm" color={d.signal.rssi > -70 ? 'text-gcs-emerald' : d.signal.rssi > -90 ? 'text-gcs-amber' : 'text-gcs-red'} />
      </div>
    </div>
  );
}

export function TelemetryDashboard() {
  return (
    <div className="h-full flex flex-col gap-1.5">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-gcs-border shadow-card shrink-0">
        <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center"><Plane className="w-3 h-3 text-gcs-cyan" /></div>
        <span className="text-[11px] font-semibold text-gcs-text tracking-tight">Fleet Telemetry</span>
      </div>
      <div className="flex-1 flex flex-col gap-1.5 min-h-0 overflow-y-auto">
        <DroneCard droneId="INS-01" /><DroneCard droneId="DEL-01" /><DroneCard droneId="DEL-02" />
      </div>
    </div>
  );
}
