import React, { useMemo, useRef } from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, Shield, Rocket, FileUp, Send, Check } from 'lucide-react';
import { useMissionStore } from '@/stores/missionStore';

export function PreFlightChecklist() {
  const checklist = useMissionStore((s) => s.checklist);
  const update = useMissionStore((s) => s.updateChecklistItem);
  const setPhase = useMissionStore((s) => s.setPhase);
  const kmlLoaded = useMissionStore((s) => s.kmlLoaded);
  const kmlFileName = useMissionStore((s) => s.kmlFileName);
  const fleetUploaded = useMissionStore((s) => s.fleetUploaded);
  const importKml = useMissionStore((s) => s.importKml);
  const uploadFleetMission = useMissionStore((s) => s.uploadFleetMission);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const allOk = useMemo(() => checklist.filter((i) => i.required).every((i) => i.status === 'passed'), [checklist]);

  const handleKmlSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importKml(file.name);
    } else {
      importKml('ADRODS_X_10HA_ZONE.kml');
    }
  };

  const icon = (s: string) => {
    if (s === 'passed') return <CheckCircle2 className="w-4 h-4 text-gcs-emerald shrink-0" />;
    if (s === 'failed') return <XCircle className="w-4 h-4 text-gcs-red shrink-0" />;
    if (s === 'checking') return <Loader2 className="w-4 h-4 text-gcs-amber animate-spin shrink-0" />;
    return <Circle className="w-4 h-4 text-gray-300 shrink-0" />;
  };

  const catColors: Record<string, string> = { 
    hardware: 'text-gcs-cyan', 
    software: 'text-purple-600', 
    communication: 'text-gcs-rose', 
    safety: 'text-gcs-red' 
  };

  const grouped = useMemo(() => {
    const g: Record<string, typeof checklist> = {};
    checklist.forEach((i) => { (g[i.category] ??= []).push(i); });
    return g;
  }, [checklist]);

  return (
    <div className="w-full max-w-xl bg-white rounded-3xl border border-gcs-border shadow-ios-lg overflow-hidden flex flex-col max-h-[90vh]">
      {/* Header */}
      <div className="bg-gradient-to-r from-gcs-cyan to-blue-600 px-6 py-5 text-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Pre-Flight Setup & Diagnostics</h1>
              <p className="text-[11px] text-blue-100 mt-0.5">5-Minute Setup Window (Rule 3 Compliance)</p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-white/20 px-2.5 py-1 rounded-full border border-white/20">
            {checklist.filter(i => i.status === 'passed').length}/{checklist.length} Passed
          </span>
        </div>
      </div>

      {/* 5-Min Setup Fast-Track Actions (KML Import & Fleet Upload) */}
      <div className="p-4 bg-gray-50/70 border-b border-gcs-border shrink-0">
        <div className="text-[10px] font-semibold text-gcs-muted uppercase tracking-wider mb-2">
          Step 1: Organizer KML & Fleet Upload
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".kml,.xml"
            className="hidden"
            onChange={handleKmlSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-semibold transition-all shadow-card ${
              kmlLoaded 
                ? 'bg-blue-50 border-blue-200 text-gcs-cyan' 
                : 'bg-white border-gcs-border text-gcs-text hover:bg-gray-50'
            }`}
          >
            {kmlLoaded ? <Check className="w-3.5 h-3.5 text-gcs-cyan" /> : <FileUp className="w-3.5 h-3.5 text-gcs-cyan" />}
            <span className="truncate">{kmlLoaded ? kmlFileName || 'KML Ingested' : 'Import Mission KML'}</span>
          </button>

          <button
            onClick={uploadFleetMission}
            disabled={!kmlLoaded}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-semibold transition-all shadow-card ${
              !kmlLoaded 
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                : fleetUploaded
                ? 'bg-green-50 border-green-200 text-gcs-emerald'
                : 'bg-white border-gcs-border text-gcs-emerald hover:bg-green-50'
            }`}
          >
            {fleetUploaded ? <Check className="w-3.5 h-3.5 text-gcs-emerald" /> : <Send className="w-3.5 h-3.5 text-gcs-emerald" />}
            <span>{fleetUploaded ? 'Fleet Uploaded' : 'Upload to Fleet'}</span>
          </button>
        </div>
      </div>

      {/* Checklist items */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h3 className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${catColors[cat] || 'text-gcs-muted'}`}>
              {cat}
            </h3>
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => update(item.id, item.status === 'passed' ? 'pending' : 'passed')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left border ${
                    item.status === 'passed'
                      ? 'bg-green-50/70 border-green-200'
                      : 'bg-gray-50/40 border-gcs-border hover:bg-white hover:shadow-card'
                  }`}
                >
                  {icon(item.status)}
                  <span className={`text-[12px] flex-1 ${item.status === 'passed' ? 'text-gcs-emerald font-medium' : 'text-gcs-text'}`}>
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-[8px] text-gcs-red font-semibold bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200 uppercase tracking-wider">
                      Required
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Proceed button */}
      <div className="p-4 border-t border-gcs-border shrink-0 bg-white">
        <button
          onClick={() => setPhase('ready')}
          disabled={!allOk}
          className={`w-full py-3 rounded-2xl font-semibold text-[14px] flex items-center justify-center gap-2 transition-all ${
            allOk
              ? 'bg-gcs-emerald text-white shadow-ios hover:brightness-105 active:scale-[0.99]'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Rocket className="w-4 h-4" />
          {allOk ? 'Proceed to Mission Launch' : 'Complete Required Setup Steps'}
        </button>
      </div>
    </div>
  );
}
