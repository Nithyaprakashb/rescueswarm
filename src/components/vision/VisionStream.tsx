import React, { useState, useEffect } from 'react';
import { Camera, Eye, EyeOff, Maximize2, Target } from 'lucide-react';

interface Det { id: string; x: number; y: number; w: number; h: number; conf: number; label: string; }

export function VisionStream() {
  const [overlay, setOverlay] = useState(true);
  const [fps, setFps] = useState(0);
  const [dets, setDets] = useState<Det[]>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      setFps(Math.floor(25 + Math.random() * 10));
      setDets(Math.random() > 0.7 ? [{ id: '1', x: 30+Math.random()*20, y: 25+Math.random()*20, w: 15+Math.random()*10, h: 20+Math.random()*15, conf: 85+Math.random()*14, label: 'Person' }] : []);
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/80 ios-blur border-b border-gcs-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center"><Camera className="w-3.5 h-3.5 text-gcs-cyan" /></div>
          <span className="text-[12px] font-semibold text-gcs-text tracking-tight">AI Vision</span>
          <span className="text-[10px] text-gcs-subtle">INS-01</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-gcs-subtle">{fps} fps</span>
          <button onClick={() => setOverlay(!overlay)} className={`p-1.5 rounded-lg transition-colors ${overlay ? 'bg-blue-50 text-gcs-cyan' : 'text-gcs-subtle hover:bg-gray-50'}`}>
            {overlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button className="p-1.5 rounded-lg text-gcs-subtle hover:bg-gray-50"><Maximize2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="flex-1 relative bg-gray-800 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900" />
        {overlay && dets.map((d) => (
          <div key={d.id} className="absolute border-2 border-gcs-emerald rounded-sm"
            style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}%`, height: `${d.h}%`, boxShadow: '0 0 8px rgba(113,192,43,0.3)' }}>
            <div className="absolute -top-5 left-0 bg-gcs-emerald text-white text-[9px] font-semibold px-1.5 py-[1px] rounded flex items-center gap-1">
              <Target className="w-2.5 h-2.5" /> {d.label} {d.conf.toFixed(0)}%
            </div>
          </div>
        ))}
        {overlay && (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-8 h-8"><div className="absolute top-1/2 left-0 w-full h-px bg-white/15" /><div className="absolute left-1/2 top-0 h-full w-px bg-white/15" /></div>
            </div>
            <div className="absolute top-2.5 left-2.5 text-[9px] font-mono text-blue-300/70 leading-relaxed">
              <div>YOLOv8n 720p</div><div>Threshold 85%</div><div className="text-green-400">Active</div>
            </div>
            <div className="absolute bottom-2.5 left-2.5 text-[9px] font-mono text-gray-500">H.264/UDP</div>
            <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
              <div className="w-[5px] h-[5px] rounded-full bg-red-500 animate-pulse" /><span className="text-[9px] font-mono text-red-400">REC</span>
            </div>
          </>
        )}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center"><Camera className="w-10 h-10 text-gray-600 mx-auto mb-1.5" /><div className="text-[12px] text-gray-500 font-medium">Awaiting Stream</div><div className="text-[9px] text-gray-600 mt-0.5">RPi 5 + AI HAT+</div></div>
        </div>
      </div>
    </div>
  );
}
