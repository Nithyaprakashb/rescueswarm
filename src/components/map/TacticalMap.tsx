import React, { useRef, useState } from 'react';
import { Map, Navigation, ZoomIn, ZoomOut, Maximize2, Layers, Search, Package, FileUp } from 'lucide-react';
import { useTelemetryStore } from '@/stores/telemetryStore';
import { useSurvivorStore } from '@/stores/survivorStore';
import { useMissionStore } from '@/stores/missionStore';
import type { DroneId, DroneTelemetry, Survivor } from '@/types';

const DRONE_COLORS: Record<DroneId, string> = { 'INS-01': '#248AFD', 'DEL-01': '#F5A623', 'DEL-02': '#FFC100' };

function DroneMarker({ drone }: { drone: DroneTelemetry }) {
  const isOnline = drone.status !== 'offline';
  const c = DRONE_COLORS[drone.droneId];
  const Icon = drone.droneType === 'inspection' ? Search : Package;
  return (
    <div className="absolute flex flex-col items-center pointer-events-auto" style={{ zIndex: 20 }}>
      <div className={`relative w-10 h-10 rounded-full flex items-center justify-center ${isOnline ? 'animate-pulse-slow' : 'opacity-30'}`}
        style={{ backgroundColor: `${c}12`, border: `2px solid ${c}`, boxShadow: isOnline ? `0 0 12px ${c}30` : 'none' }}>
        <Icon className="w-4 h-4" style={{ color: c }} />
        <div className="absolute -top-1" style={{ borderLeft: '3px solid transparent', borderRight: '3px solid transparent', borderBottom: `6px solid ${c}`,
          transform: `rotate(${drone.position.heading}deg)`, transformOrigin: 'center 18px' }} />
      </div>
      <div className="mt-1 px-2 py-[2px] rounded-full text-[9px] font-mono font-semibold whitespace-nowrap shadow-card"
        style={{ backgroundColor: `${c}10`, color: c, border: `1px solid ${c}30` }}>
        {drone.droneId} · {drone.position.alt.toFixed(0)}m
      </div>
    </div>
  );
}

function SurvivorPin({ survivor, onClick }: { survivor: Survivor; onClick: () => void }) {
  const colors: Record<string, string> = { detected: '#FFC100', confirmed: '#248AFD', dispatched: '#8B5CF6', delivered: '#71C02B', failed: '#FF4747' };
  const c = colors[survivor.status] || '#9CA3AF';
  return (
    <button onClick={onClick} className="absolute flex flex-col items-center pointer-events-auto cursor-pointer group" style={{ zIndex: 15 }}>
      {(survivor.status === 'confirmed' || survivor.status === 'dispatched') && (
        <>
          <div className="absolute w-20 h-20 rounded-full border border-green-300/25 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute w-14 h-14 rounded-full border border-yellow-300/35 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute w-7 h-7 rounded-full border border-red-300/35 -translate-x-1/2 -translate-y-1/2" />
        </>
      )}
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-ios"
        style={{ backgroundColor: c }}>{survivor.id.slice(-2)}</div>
      <div className="hidden group-hover:block absolute top-8 bg-white border border-gcs-border rounded-xl px-3 py-2 text-[10px] whitespace-nowrap z-30 shadow-ios-lg">
        <div className="font-semibold" style={{ color: c }}>{survivor.id}</div>
        <div className="text-gcs-muted font-mono">{survivor.lat.toFixed(6)}, {survivor.lon.toFixed(6)}</div>
        <div className="text-gcs-muted">Confidence: {survivor.confidence.toFixed(0)}%</div>
      </div>
    </button>
  );
}

export function TacticalMap() {
  const drones = useTelemetryStore((s) => s.drones);
  const survivors = useSurvivorStore((s) => s.survivors);
  const kmlLoaded = useMissionStore((s) => s.kmlLoaded);
  const kmlFileName = useMissionStore((s) => s.kmlFileName);
  const importKml = useMissionStore((s) => s.importKml);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [zoom, setZoom] = useState(16);
  const [showGrid, setShowGrid] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const g = Array.from({ length: 11 }, (_, i) => i);

  const handleKmlSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importKml(file.name);
    } else {
      importKml('ADRODS_X_10HA_ZONE.kml');
    }
  };

  return (
    <div className="h-full w-full bg-white relative flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept=".kml,.xml"
        className="hidden"
        onChange={handleKmlSelect}
      />

      <div className="flex items-center justify-between px-4 py-2.5 bg-white/80 ios-blur border-b border-gcs-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center"><Map className="w-3.5 h-3.5 text-gcs-cyan" /></div>
          <span className="text-[12px] font-semibold text-gcs-text tracking-tight">Tactical Map</span>
          {kmlLoaded && (
            <span className="text-[10px] font-mono text-gcs-cyan bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {kmlFileName || '10ha Zone'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Quick Import KML button directly from Map header */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors ${
              kmlLoaded
                ? 'bg-blue-50 border-blue-200 text-gcs-cyan hover:bg-blue-100'
                : 'bg-white border-gcs-border text-gcs-muted hover:text-gcs-text hover:bg-gray-50'
            }`}
            title="Import or replace Mission KML boundary file"
          >
            <FileUp className="w-3 h-3 text-gcs-cyan" />
            <span>{kmlLoaded ? 'Change KML' : 'Import KML'}</span>
          </button>

          <div className="w-px h-4 bg-gcs-border mx-0.5" />

          {[{ icon: Layers, active: showGrid, onClick: () => setShowGrid(!showGrid) },
            { icon: ZoomIn, onClick: () => setZoom(Math.min(zoom+1,19)) },
            { icon: ZoomOut, onClick: () => setZoom(Math.max(zoom-1,14)) },
            { icon: Maximize2 }].map((b, i) => (
            <button key={i} onClick={b.onClick}
              className={`p-1.5 rounded-lg transition-colors ${(b as any).active ? 'bg-blue-50 text-gcs-cyan' : 'text-gcs-subtle hover:text-gcs-text hover:bg-gray-50'}`}>
              <b.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
      <div ref={mapRef} className="flex-1 relative bg-gradient-to-br from-blue-50/80 via-emerald-50/20 to-gray-50 overflow-hidden">
        {showGrid && (
          <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
            {g.map(i => <React.Fragment key={i}>
              <line x1={`${(i/10)*100}%`} y1="0" x2={`${(i/10)*100}%`} y2="100%" stroke="#248AFD" strokeWidth="0.5" strokeDasharray="3 5" />
              <line x1="0" y1={`${(i/10)*100}%`} x2="100%" y2={`${(i/10)*100}%`} stroke="#248AFD" strokeWidth="0.5" strokeDasharray="3 5" />
            </React.Fragment>)}
          </svg>
        )}
        <div className="absolute inset-6 border-[1.5px] border-dashed border-gcs-amber/40 rounded-2xl">
          <div className="absolute -top-2.5 left-5 bg-white px-2 py-0.5 text-[9px] text-gcs-amber font-mono font-semibold rounded shadow-card border border-amber-100 flex items-center gap-1.5">
            <span>GEOFENCE 10ha</span>
            {kmlLoaded && <span className="text-[8px] text-gcs-cyan font-mono">• KML ACTIVE</span>}
          </div>
        </div>
        <div className="absolute bottom-10 left-10 w-14 h-14 border-[1.5px] border-gcs-emerald/40 rounded-xl bg-green-50/30 flex items-center justify-center">
          <span className="text-[7px] text-gcs-emerald font-mono font-semibold">12x12ft</span>
        </div>
        <div className="absolute" style={{ top: '30%', left: '45%' }}><DroneMarker drone={drones['INS-01']} /></div>
        <div className="absolute" style={{ top: '60%', left: '25%' }}><DroneMarker drone={drones['DEL-01']} /></div>
        <div className="absolute" style={{ top: '55%', left: '70%' }}><DroneMarker drone={drones['DEL-02']} /></div>
        {survivors.map((s, i) => (
          <div key={s.id} className="absolute" style={{ top: `${20+(i*8)%60}%`, left: `${15+(i*12)%70}%` }}>
            <SurvivorPin survivor={s} onClick={() => {}} />
          </div>
        ))}
        <div className="absolute bottom-3 right-3 bg-white/90 ios-blur border border-gcs-border rounded-lg px-2.5 py-1 text-[9px] font-mono text-gcs-muted shadow-card">
          Z{zoom} · {kmlLoaded ? 'KML Loaded' : 'Offline'}
        </div>
        <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 ios-blur border border-gcs-border shadow-card flex items-center justify-center">
          <Navigation className="w-4 h-4 text-gcs-cyan" />
        </div>
      </div>
    </div>
  );
}
