'use client';

import React from 'react';
import { Layers, Droplet, Mountain, CloudRain, ShieldAlert, Globe, Waves } from 'lucide-react';
import { MapLayerState } from '@/types';

interface LayerControlProps {
  layers: MapLayerState;
  onToggleLayer: (layerKey: keyof MapLayerState) => void;
}

export const LayerControl: React.FC<LayerControlProps> = ({ layers, onToggleLayer }) => {
  const layerButtons: { key: keyof MapLayerState; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      key: 'inundationSwath',
      label: 'GLOF Inundation Swath',
      icon: <Waves className="w-4 h-4 text-rose-400" />,
      desc: 'Breach Surge Corridor & Village Arrival Times',
    },
    {
      key: 'mndwiWater',
      label: 'MNDWI Water Polygons',
      icon: <Droplet className="w-4 h-4 text-sky-400" />,
      desc: 'Sentinel-2 S2A Water Vectorization',
    },
    {
      key: 'terrain3d',
      label: '3D DEM Terrain Relief',
      icon: <Mountain className="w-4 h-4 text-emerald-400" />,
      desc: 'Copernicus 30m Global DEM',
    },
    {
      key: 'gpmPrecipitation',
      label: 'GPM Precipitation Anomaly',
      icon: <CloudRain className="w-4 h-4 text-blue-400" />,
      desc: 'NASA GPM IMERG 72h Accumulated Rain',
    },
    {
      key: 'pdglHighRisk',
      label: 'ICIMOD PDGL Inventory',
      icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
      desc: 'Potentially Dangerous Glacial Lakes',
    },
  ];

  return (
    <div className="bg-himalaya-card/95 backdrop-blur-md border border-himalaya-border rounded-xl p-3 shadow-xl w-72">
      <div className="flex items-center gap-2 pb-2 mb-2 border-b border-himalaya-border text-xs font-semibold text-slate-300 uppercase tracking-wider">
        <Layers className="w-4 h-4 text-blue-400" />
        Geospatial Overlays
      </div>
      <div className="space-y-1.5">
        {layerButtons.map((btn) => {
          const active = layers[btn.key];
          return (
            <button
              key={btn.key}
              onClick={() => onToggleLayer(btn.key)}
              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                active
                  ? 'bg-blue-600/20 border border-blue-500/40 text-white'
                  : 'bg-slate-900/40 border border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {btn.icon}
                <div>
                  <div className="text-xs font-medium">{btn.label}</div>
                  <div className="text-[10px] text-slate-400">{btn.desc}</div>
                </div>
              </div>
              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                  active ? 'border-blue-400 bg-blue-500' : 'border-slate-600 bg-slate-800'
                }`}
              >
                {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
