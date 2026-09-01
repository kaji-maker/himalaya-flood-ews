'use client';

import React, { useState } from 'react';
import { Lake, MapLayerState } from '@/types';
import { LayerControl } from './LayerControl';
import { RiskBadge } from '../alerts/RiskBadge';
import { Eye, Mountain, AlertCircle } from 'lucide-react';

interface GlacierMapProps {
  lakes: Lake[];
  selectedLake?: Lake | null;
  onSelectLake?: (lake: Lake) => void;
  basinCode?: string;
}

export const GlacierMap: React.FC<GlacierMapProps> = ({
  lakes,
  selectedLake,
  onSelectLake,
  basinCode,
}) => {
  const [layers, setLayers] = useState<MapLayerState>({
    mndwiWater: true,
    terrain3d: true,
    gpmPrecipitation: false,
    pdglHighRisk: true,
    satelliteBase: true,
  });

  const [hoveredLake, setHoveredLake] = useState<Lake | null>(null);

  const toggleLayer = (key: keyof MapLayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Geographic bounds for the Himalayan region (Nepal focus: Lon 80 to 89, Lat 26.5 to 30.5)
  const mapMinLon = 80.0;
  const mapMaxLon = 89.0;
  const mapMinLat = 26.5;
  const mapMaxLat = 31.0;

  const getCanvasCoords = (lon: number, lat: number) => {
    const x = ((lon - mapMinLon) / (mapMaxLon - mapMinLon)) * 100;
    // Invert Y because latitude goes north (up) but SVG coordinates go down
    const y = ((mapMaxLat - lat) / (mapMaxLat - mapMinLat)) * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <div className="relative w-full h-[520px] bg-slate-950 rounded-2xl overflow-hidden border border-himalaya-border shadow-2xl">
      {/* Map Canvas / Terrain Canvas */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1220] to-[#060A12]">
        {/* Subtle Himalayan Mountain Ridge Contour Background */}
        <svg className="w-full h-full opacity-30 pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path
            d="M 50,450 Q 200,200 350,300 T 650,180 T 950,280 L 1000,600 L 0,600 Z"
            fill="#1E293B"
            opacity="0.4"
          />
          <path
            d="M 0,380 Q 150,140 380,240 T 720,120 T 1000,220 L 1000,600 L 0,600 Z"
            fill="#0F172A"
            opacity="0.6"
          />
          {/* Topographic elevation lines */}
          <line x1="0" y1="200" x2="1000" y2="200" stroke="#334155" strokeDasharray="4 8" strokeWidth="0.8" />
          <line x1="0" y1="350" x2="1000" y2="350" stroke="#334155" strokeDasharray="4 8" strokeWidth="0.8" />
          <line x1="0" y1="500" x2="1000" y2="500" stroke="#334155" strokeDasharray="4 8" strokeWidth="0.8" />
        </svg>

        {/* GPM IMERG Precipitation Anomaly Overlay */}
        {layers.gpmPrecipitation && (
          <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] mix-blend-screen pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-2/3 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl" />
          </div>
        )}
      </div>

      {/* Interactive Glacial Lake Markers & Polygons */}
      <div className="absolute inset-0 p-8 pointer-events-auto">
        {lakes.map((lake) => {
          const coords = lake.centroid?.coordinates || [86.5, 27.9];
          const [lon, lat] = coords;
          const { x, y } = getCanvasCoords(lon, lat);
          const isSelected = selectedLake?.id === lake.id;
          const isHighRisk = ['VERY_HIGH', 'HIGH'].includes(lake.pdgl_status) || lake.current_risk_score >= 0.7;

          return (
            <div
              key={lake.id}
              style={{ left: x, top: y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
              onClick={() => onSelectLake && onSelectLake(lake)}
              onMouseEnter={() => setHoveredLake(lake)}
              onMouseLeave={() => setHoveredLake(null)}
            >
              {/* Lake Marker Ring */}
              <div className="relative flex items-center justify-center">
                {isHighRisk && (
                  <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-rose-500/40 opacity-75" />
                )}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shadow-lg ${
                    isSelected
                      ? 'bg-sky-400 border-white ring-4 ring-sky-500/50 scale-125'
                      : isHighRisk
                      ? 'bg-rose-600 border-rose-200'
                      : 'bg-emerald-600 border-emerald-200'
                  }`}
                >
                  <Mountain className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Lake Label Pin */}
              <div className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-medium text-slate-200 shadow-md group-hover:border-sky-400">
                {lake.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Control Panel (Top-Right) */}
      <div className="absolute top-4 right-4 z-30">
        <LayerControl layers={layers} onToggleLayer={toggleLayer} />
      </div>

      {/* Hover Tooltip / Detail Card */}
      {hoveredLake && (
        <div className="absolute bottom-4 left-4 z-30 bg-himalaya-card/95 backdrop-blur-md border border-himalaya-border rounded-xl p-4 shadow-2xl max-w-sm">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h4 className="text-sm font-bold text-white">{hoveredLake.name}</h4>
            <RiskBadge level={hoveredLake.pdgl_status} size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 font-mono">
            <div>
              <span className="text-slate-500 block">Basin:</span>
              {hoveredLake.sub_basin || hoveredLake.basin_code || 'Koshi'}
            </div>
            <div>
              <span className="text-slate-500 block">Elevation:</span>
              {hoveredLake.elevation_m} m
            </div>
            <div>
              <span className="text-slate-500 block">Surface Area:</span>
              {hoveredLake.baseline_area_sqkm} km²
            </div>
            <div>
              <span className="text-slate-500 block">GLOF Risk Score:</span>
              <span className={hoveredLake.current_risk_score >= 0.7 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {hoveredLake.current_risk_score.toFixed(2)} / 1.00
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-1.5 text-[11px] text-slate-400 flex items-center gap-4 font-mono">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Very High Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>High / Watch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Stable / Low</span>
        </div>
      </div>
    </div>
  );
};
