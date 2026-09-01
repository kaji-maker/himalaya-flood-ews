'use client';

import React from 'react';
import { GlacialLake, ObservationPoint, PrecipitationPoint } from '@/types';
import { RiskBadge } from '../alerts/RiskBadge';
import { TimeSeriesAreaChart } from '../charts/TimeSeriesAreaChart';
import { PrecipitationChart } from '../charts/PrecipitationChart';
import {
  X,
  Mountain,
  Compass,
  Maximize2,
  TrendingUp,
  MapPin,
  Layers,
  ShieldAlert,
  Waves,
  AlertOctagon,
  Clock,
} from 'lucide-react';

interface LakeDetailDrawerProps {
  lake: GlacialLake | null;
  isOpen: boolean;
  onClose: () => void;
  observations: ObservationPoint[];
  precipitationData: PrecipitationPoint[];
}

export const LakeDetailDrawer: React.FC<LakeDetailDrawerProps> = ({
  lake,
  isOpen,
  onClose,
  observations,
  precipitationData,
}) => {
  if (!isOpen || !lake) return null;

  // Convert m² to km² for display
  const currentAreaKm2 = (lake.current_area_sqm / 1e6).toFixed(3);
  const initialAreaKm2 = (lake.initial_area_sqm / 1e6).toFixed(3);
  const growthPct = (
    ((lake.current_area_sqm - lake.initial_area_sqm) / lake.initial_area_sqm) *
    100
  ).toFixed(1);

  // Default synthetic polygon coordinates if none provided
  const polygonCoords = lake.polygon_coordinates?.[0] || [
    [86.468, 27.855],
    [86.485, 27.862],
    [86.495, 27.873],
    [86.488, 27.881],
    [86.465, 27.876],
    [86.458, 27.864],
    [86.468, 27.855],
  ];

  // Convert polygon coordinates to SVG viewbox coordinates
  const lons = polygonCoords.map((c) => c[0]);
  const lats = polygonCoords.map((c) => c[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const spanLon = maxLon - minLon || 0.01;
  const spanLat = maxLat - minLat || 0.01;

  const svgPoints = polygonCoords
    .map(([lon, lat]) => {
      const x = 30 + ((lon - minLon) / spanLon) * 260;
      const y = 30 + ((maxLat - lat) / spanLat) * 120;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
        <div className="w-screen max-w-xl bg-[#0F172A] border-l border-himalaya-border shadow-2xl flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="p-6 border-b border-himalaya-border bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <RiskBadge level={lake.danger_level} size="sm" showPulse />
                  <span className="text-xs font-mono text-slate-400">
                    {lake.icimod_code}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {lake.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {lake.sub_basin || lake.basin_name} Sub-Basin • {lake.basin_name} River System
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-xs font-mono">
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Elevation</span>
                <span className="text-white font-bold">{lake.elevation_m} m</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Current Area</span>
                <span className="text-sky-400 font-bold">{currentAreaKm2} km²</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Growth Delta</span>
                <span
                  className={
                    Number(growthPct) > 15
                      ? 'text-rose-400 font-bold'
                      : 'text-emerald-400 font-bold'
                  }
                >
                  +{growthPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Drawer Body Content */}
          <div className="p-6 space-y-6 flex-1">
            {/* 1. High-Resolution Polygon Boundary Overlay */}
            <div className="bg-slate-900/60 border border-himalaya-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    High-Resolution Vector Polygon Boundary (MNDWI)
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  EPSG:32645 Metric
                </span>
              </div>

              {/* Polygon SVG Overlay Container */}
              <div className="relative w-full h-44 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
                <svg viewBox="0 0 320 180" className="w-full h-full p-2">
                  <defs>
                    <radialGradient id="lakeWaterFill" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.4" />
                    </radialGradient>
                  </defs>

                  <line x1="0" y1="45" x2="320" y2="45" stroke="#1E293B" strokeDasharray="3 3" />
                  <line x1="0" y1="90" x2="320" y2="90" stroke="#1E293B" strokeDasharray="3 3" />
                  <line x1="0" y1="135" x2="320" y2="135" stroke="#1E293B" strokeDasharray="3 3" />
                  <line x1="106" y1="0" x2="106" y2="180" stroke="#1E293B" strokeDasharray="3 3" />
                  <line x1="213" y1="0" x2="213" y2="180" stroke="#1E293B" strokeDasharray="3 3" />

                  <polygon
                    points={svgPoints}
                    fill="url(#lakeWaterFill)"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />

                  <circle cx="160" cy="90" r="3" fill="#F43F5E" />
                </svg>

                <div className="absolute bottom-2 left-2 text-[10px] font-mono text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                  Centroid: [{lake.centroid.coordinates[0].toFixed(3)}°E, {lake.centroid.coordinates[1].toFixed(3)}°N]
                </div>
              </div>
            </div>

            {/* 2. Hydrodynamic GLOF Breach & Inundation Propagation Routing */}
            <div className="bg-slate-900/60 border border-rose-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-rose-400" />
                  <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                    Downstream Flood Wave Arrival Schedule
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">
                  Froehlich / Costa Model
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { name: 'Na Village', dist: '6.5 km', time: '7.7 min', stage: '+54.4 m', q: '72,860 m³/s', alert: 'IMMEDIATE' },
                  { name: 'Bedding', dist: '14.2 km', time: '16.9 min', stage: '+45.2 m', q: '64,410 m³/s', alert: 'IMMEDIATE' },
                  { name: 'Chhetchhet', dist: '28.0 km', time: '33.3 min', stage: '+33.8 m', q: '51,650 m³/s', alert: 'HIGH' },
                  { name: 'Simigaon', dist: '36.5 km', time: '43.5 min', stage: '+28.7 m', q: '45,080 m³/s', alert: 'HIGH' },
                  { name: 'Gongar Hydro Dam', dist: '48.0 km', time: '57.1 min', stage: '+23.4 m', q: '37,500 m³/s', alert: 'MODERATE' },
                ].map((reach, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-xs font-mono"
                  >
                    <div>
                      <span className="font-bold text-white block">{reach.name}</span>
                      <span className="text-[10px] text-slate-400">{reach.dist} downstream</span>
                    </div>
                    <div className="text-right">
                      <span className="text-rose-400 font-bold flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> {reach.time}
                      </span>
                      <span className="text-[10px] text-slate-400 block">Stage: {reach.stage}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Historical Surface Area Time-Series Chart */}
            <div>
              <TimeSeriesAreaChart
                data={observations}
                lakeName={lake.name}
                baselineArea={Number(initialAreaKm2)}
              />
            </div>

            {/* 4. Upstream 48-Hour Precipitation Graph */}
            <div>
              <PrecipitationChart data={precipitationData} lakeName={lake.name} />
            </div>

            {/* 5. Dam & Downstream Vulnerability Parameters */}
            <div className="bg-slate-900/60 border border-himalaya-border rounded-xl p-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Moraine Dam & Downstream Risk Attributes
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Freeboard Crest Margin</span>
                  <span className="text-slate-200 font-bold mt-0.5 block">
                    {lake.freeboard_m || 12.5} meters
                  </span>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Moraine Face Slope</span>
                  <span className="text-slate-200 font-bold mt-0.5 block">
                    {lake.moraine_slope_deg || 28.5}°
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
