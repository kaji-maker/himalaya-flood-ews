'use client';

import React, { useState } from 'react';
import { GlacialLake, MapLayerState } from '@/types';
import { LayerControl } from './LayerControl';
import { RiskBadge } from '../alerts/RiskBadge';
import { Mountain, Compass, Maximize2, AlertTriangle, Droplets } from 'lucide-react';

interface GlacierMapProps {
  lakes: GlacialLake[];
  selectedLake?: GlacialLake | null;
  onSelectLake: (lake: GlacialLake) => void;
  basinName?: string;
}

export const GlacierMap: React.FC<GlacierMapProps> = ({
  lakes,
  selectedLake,
  onSelectLake,
  basinName,
}) => {
  const [layers, setLayers] = useState<MapLayerState>({
    mndwiWater: true,
    terrain3d: true,
    gpmPrecipitation: true,
    pdglHighRisk: true,
    satelliteBase: true,
  });

  const [hoveredLake, setHoveredLake] = useState<GlacialLake | null>(null);

  // Geographic center of Nepal: 28.3949° N, 84.1240° E
  const NEPAL_CENTER_LAT = 28.3949;
  const NEPAL_CENTER_LON = 84.1240;

  // Geographic Bounding Box for Nepal Projection
  const minLon = 80.0;
  const maxLon = 88.5;
  const minLat = 26.3;
  const maxLat = 30.5;

  const getCanvasCoords = (lon: number, lat: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  const toggleLayer = (key: keyof MapLayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getLakeColorClasses = (dangerLevel: string) => {
    switch (dangerLevel.toUpperCase()) {
      case 'CRITICAL':
      case 'EMERGENCY':
        return {
          bg: 'bg-rose-600',
          border: 'border-rose-200',
          glow: 'bg-rose-500/50',
          badgeText: 'Critical Risk',
          colorName: 'Red',
        };
      case 'HIGH':
      case 'MEDIUM':
      case 'WATCH':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-200',
          glow: 'bg-amber-500/40',
          badgeText: 'Watch / High',
          colorName: 'Yellow',
        };
      case 'LOW':
      case 'STABLE':
      default:
        return {
          bg: 'bg-emerald-500',
          border: 'border-emerald-200',
          glow: 'bg-emerald-500/30',
          badgeText: 'Stable',
          colorName: 'Green',
        };
    }
  };

  return (
    <div className="relative w-full h-[540px] bg-slate-950 rounded-2xl overflow-hidden border border-himalaya-border shadow-2xl">
      {/* 3D Himalayan Terrain Mesh Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1323] to-[#040810]">
        {/* Topographic 3D Elevation Ridges (Nepal Focus: 28.3949° N, 84.1240° E) */}
        {layers.terrain3d && (
          <svg className="w-full h-full opacity-40 pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none">
            {/* Greater Himalaya High Ridge (>6000m) */}
            <path
              d="M 0,320 Q 150,80 320,180 T 640,90 T 1000,160 L 1000,600 L 0,600 Z"
              fill="#0F1D36"
              opacity="0.7"
            />
            {/* Middle Hills Ridge (>3000m) */}
            <path
              d="M 0,420 Q 220,240 440,320 T 780,220 T 1000,300 L 1000,600 L 0,600 Z"
              fill="#132742"
              opacity="0.5"
            />
            {/* Siwalik Lower Range */}
            <path
              d="M 0,510 Q 280,410 520,460 T 860,390 T 1000,440 L 1000,600 L 0,600 Z"
              fill="#172F54"
              opacity="0.4"
            />

            {/* Contour Elevation Grids */}
            <line x1="0" y1="180" x2="1000" y2="180" stroke="#38BDF8" strokeOpacity="0.15" strokeDasharray="3 6" />
            <line x1="0" y1="300" x2="1000" y2="300" stroke="#38BDF8" strokeOpacity="0.15" strokeDasharray="3 6" />
            <line x1="0" y1="420" x2="1000" y2="420" stroke="#38BDF8" strokeOpacity="0.15" strokeDasharray="3 6" />
          </svg>
        )}

        {/* NASA GPM Precipitation Anomaly Overlay */}
        {layers.gpmPrecipitation && (
          <div className="absolute inset-0 bg-blue-600/5 mix-blend-screen pointer-events-none">
            <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl" />
          </div>
        )}
      </div>

      {/* Center Navigation Crosshair Badge (28.3949° N, 84.1240° E) */}
      <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-3">
        <div className="p-1.5 bg-blue-500/20 text-sky-400 rounded-lg border border-blue-500/30">
          <Compass className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-bold text-white block">
            Nepal Glacial Monitoring Center
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {NEPAL_CENTER_LAT.toFixed(4)}° N, {NEPAL_CENTER_LON.toFixed(4)}° E (WGS84)
          </span>
        </div>
      </div>

      {/* Interactive Glacial Lake Markers */}
      <div className="absolute inset-0 p-8 pointer-events-auto">
        {lakes.map((lake) => {
          const [lon, lat] = lake.centroid.coordinates;
          const { x, y } = getCanvasCoords(lon, lat);
          const isSelected = selectedLake?.id === lake.id;
          const color = getLakeColorClasses(lake.danger_level);
          const isCritical = ['CRITICAL', 'EMERGENCY'].includes(lake.danger_level.toUpperCase());

          return (
            <div
              key={lake.id}
              style={{ left: x, top: y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
              onClick={() => onSelectLake(lake)}
              onMouseEnter={() => setHoveredLake(lake)}
              onMouseLeave={() => setHoveredLake(null)}
            >
              {/* Pulsing ring for critical/warning lakes */}
              <div className="relative flex items-center justify-center">
                {isCritical && (
                  <span className={`animate-ping absolute inline-flex h-8 w-8 rounded-full ${color.glow} opacity-75`} />
                )}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all shadow-xl ${
                    isSelected
                      ? 'bg-sky-400 border-white ring-4 ring-sky-500/60 scale-125'
                      : `${color.bg} ${color.border} group-hover:scale-110`
                  }`}
                >
                  <Mountain className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Lake Label Marker */}
              <div className="absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-100 shadow-xl group-hover:border-sky-400 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${color.bg}`} />
                {lake.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Layer Control Panel */}
      <div className="absolute top-4 right-4 z-30">
        <LayerControl layers={layers} onToggleLayer={toggleLayer} />
      </div>

      {/* Hover Info Tooltip */}
      {hoveredLake && (
        <div className="absolute bottom-4 left-4 z-30 bg-himalaya-card/95 backdrop-blur-md border border-himalaya-border rounded-xl p-4 shadow-2xl max-w-sm pointer-events-none">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h4 className="text-sm font-bold text-white">{hoveredLake.name}</h4>
            <RiskBadge level={hoveredLake.danger_level} size="sm" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 font-mono">
            <div>
              <span className="text-slate-500 block">Basin:</span>
              {hoveredLake.basin_name} ({hoveredLake.sub_basin || 'Main'})
            </div>
            <div>
              <span className="text-slate-500 block">Elevation:</span>
              {hoveredLake.elevation_m} m
            </div>
            <div>
              <span className="text-slate-500 block">Surface Area:</span>
              {(hoveredLake.current_area_sqm / 1e6).toFixed(3)} km²
            </div>
            <div>
              <span className="text-slate-500 block">Status:</span>
              <span className="font-bold text-sky-400">Click to Inspect</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend for Color Codes (Requirement 2) */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-[11px] text-slate-300 flex items-center gap-4 font-mono shadow-xl">
        <span className="text-slate-500 uppercase text-[10px]">Risk Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Green: Stable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Yellow: Watch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
          <span>Red: Critical</span>
        </div>
      </div>
    </div>
  );
};
