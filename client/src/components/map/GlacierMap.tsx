'use client';

import React, { useState } from 'react';
import { GlacialLake, MapLayerState, DownstreamImpact } from '@/types';
import { LayerControl } from './LayerControl';
import { RiskBadge } from '../alerts/RiskBadge';
import { Mountain, Compass, Waves, AlertOctagon, ShieldAlert, Clock, TrendingUp } from 'lucide-react';

interface GlacierMapProps {
  lakes: GlacialLake[];
  selectedLake?: GlacialLake | null;
  onSelectLake: (lake: GlacialLake) => void;
  basinName?: string;
}

// Pre-computed GLOF Breach & River Gorge Swath Corridors for high-risk lakes
const GLOF_INUNDATION_CORRIDORS: Record<
  string,
  {
    lake_id: string;
    corridor_coords: [number, number][];
    settlements: DownstreamImpact[];
  }
> = {
  'PDGL_NEP_KOSHI_001': {
    lake_id: 'PDGL_NEP_KOSHI_001', // Tsho Rolpa -> Tama Koshi
    corridor_coords: [
      [86.475, 27.868],
      [86.460, 27.840],
      [86.420, 27.820],
      [86.350, 27.780],
      [86.290, 27.750],
      [86.220, 27.700],
      [86.150, 27.650],
    ],
    settlements: [
      {
        settlement_name: 'Na Village',
        distance_km: 6.5,
        travel_time_minutes: 7.7,
        peak_discharge_cms: 72861.9,
        peak_stage_rise_m: 54.4,
        hazard_level: 'EXTREME_IMMEDIATE_EVACUATION',
        coordinates: [86.460, 27.840],
      },
      {
        settlement_name: 'Bedding',
        distance_km: 14.2,
        travel_time_minutes: 16.9,
        peak_discharge_cms: 64416.2,
        peak_stage_rise_m: 45.2,
        hazard_level: 'EXTREME_IMMEDIATE_EVACUATION',
        coordinates: [86.420, 27.820],
      },
      {
        settlement_name: 'Chhetchhet',
        distance_km: 28.0,
        travel_time_minutes: 33.3,
        peak_discharge_cms: 51653.9,
        peak_stage_rise_m: 33.8,
        hazard_level: 'HIGH_PRIORITY_EVACUATION',
        coordinates: [86.350, 27.780],
      },
      {
        settlement_name: 'Simigaon',
        distance_km: 36.5,
        travel_time_minutes: 43.5,
        peak_discharge_cms: 45085.7,
        peak_stage_rise_m: 28.7,
        hazard_level: 'HIGH_PRIORITY_EVACUATION',
        coordinates: [86.290, 27.750],
      },
      {
        settlement_name: 'Gongar Khola (Hydropower Dam)',
        distance_km: 48.0,
        travel_time_minutes: 57.1,
        peak_discharge_cms: 37508.4,
        peak_stage_rise_m: 23.4,
        hazard_level: 'MODERATE_WARNING',
        coordinates: [86.220, 27.700],
      },
    ],
  },
  'PDGL_NEP_KOSHI_002': {
    lake_id: 'PDGL_NEP_KOSHI_002', // Imja Tsho -> Dudh Koshi
    corridor_coords: [
      [86.924, 27.910],
      [86.880, 27.890],
      [86.830, 27.860],
      [86.760, 27.800],
      [86.710, 27.750],
    ],
    settlements: [
      {
        settlement_name: 'Dingboche',
        distance_km: 5.8,
        travel_time_minutes: 6.9,
        peak_discharge_cms: 58200.0,
        peak_stage_rise_m: 38.5,
        hazard_level: 'EXTREME_IMMEDIATE_EVACUATION',
        coordinates: [86.880, 27.890],
      },
      {
        settlement_name: 'Pangboche',
        distance_km: 11.4,
        travel_time_minutes: 13.5,
        peak_discharge_cms: 51400.0,
        peak_stage_rise_m: 32.0,
        hazard_level: 'EXTREME_IMMEDIATE_EVACUATION',
        coordinates: [86.830, 27.860],
      },
      {
        settlement_name: 'Tengboche Valley',
        distance_km: 21.0,
        travel_time_minutes: 24.8,
        peak_discharge_cms: 42100.0,
        peak_stage_rise_m: 24.5,
        hazard_level: 'HIGH_PRIORITY_EVACUATION',
        coordinates: [86.760, 27.800],
      },
      {
        settlement_name: 'Namche Lower Bridge',
        distance_km: 32.5,
        travel_time_minutes: 38.6,
        peak_discharge_cms: 34200.0,
        peak_stage_rise_m: 18.0,
        hazard_level: 'MODERATE_WARNING',
        coordinates: [86.710, 27.750],
      },
    ],
  },
};

export const GlacierMap: React.FC<GlacierMapProps> = ({
  lakes,
  selectedLake,
  onSelectLake,
  basinName,
}) => {
  const [layers, setLayers] = useState<MapLayerState>({
    inundationSwath: true,
    mndwiWater: true,
    terrain3d: true,
    gpmPrecipitation: true,
    pdglHighRisk: true,
    satelliteBase: true,
  });

  const [hoveredLake, setHoveredLake] = useState<GlacialLake | null>(null);
  const [hoveredSettlement, setHoveredSettlement] = useState<DownstreamImpact | null>(null);

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
    return { x: `${x}%`, y: `${y}%`, numX: x, numY: y };
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
          colorName: 'Red',
        };
      case 'HIGH':
      case 'MEDIUM':
      case 'WATCH':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-200',
          glow: 'bg-amber-500/40',
          colorName: 'Yellow',
        };
      case 'LOW':
      case 'STABLE':
      default:
        return {
          bg: 'bg-emerald-500',
          border: 'border-emerald-200',
          glow: 'bg-emerald-500/30',
          colorName: 'Green',
        };
    }
  };

  // Active breach corridors to render
  const activeCorridors = Object.values(GLOF_INUNDATION_CORRIDORS);

  return (
    <div className="relative w-full h-[580px] bg-slate-950 rounded-2xl overflow-hidden border border-himalaya-border shadow-2xl">
      {/* 3D Himalayan Terrain Mesh Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1323] to-[#040810]">
        {/* Topographic 3D Elevation Ridges */}
        {layers.terrain3d && (
          <svg className="w-full h-full opacity-40 pointer-events-none" viewBox="0 0 1000 600" preserveAspectRatio="none">
            <path
              d="M 0,320 Q 150,80 320,180 T 640,90 T 1000,160 L 1000,600 L 0,600 Z"
              fill="#0F1D36"
              opacity="0.7"
            />
            <path
              d="M 0,420 Q 220,240 440,320 T 780,220 T 1000,300 L 1000,600 L 0,600 Z"
              fill="#132742"
              opacity="0.5"
            />
            <path
              d="M 0,510 Q 280,410 520,460 T 860,390 T 1000,440 L 1000,600 L 0,600 Z"
              fill="#172F54"
              opacity="0.4"
            />
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

      {/* SVG Inundation Flow Path & Swath Corridors */}
      {layers.inundationSwath && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="surgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#FB923C" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
            </linearGradient>
            <filter id="surgeGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {activeCorridors.map((c) => {
            const pts = c.corridor_coords
              .map(([lon, lat]) => {
                const { numX, numY } = getCanvasCoords(lon, lat);
                return `${(numX * 10).toFixed(1)},${(numY * 6).toFixed(1)}`;
              })
              .join(' L ');

            return (
              <g key={c.lake_id}>
                {/* Wide Inundation Buffer Swath */}
                <path
                  d={`M ${pts}`}
                  fill="none"
                  stroke="#E11D48"
                  strokeWidth="14"
                  strokeOpacity="0.2"
                  strokeLinecap="round"
                />
                {/* Center Flood Wave Flow Thalweg */}
                <path
                  d={`M ${pts}`}
                  fill="none"
                  stroke="url(#surgeGradient)"
                  strokeWidth="3.5"
                  strokeDasharray="8 4"
                  className="animate-pulse"
                  filter="url(#surgeGlow)"
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Center Navigation Crosshair Badge */}
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

      {/* Downstream At-Risk Settlement Pins (Layer: Inundation Swath) */}
      {layers.inundationSwath && (
        <div className="absolute inset-0 pointer-events-auto z-25">
          {activeCorridors.flatMap((c) =>
            c.settlements.map((s, idx) => {
              const [lon, lat] = s.coordinates;
              const { x, y } = getCanvasCoords(lon, lat);
              const isExtreme = s.hazard_level === 'EXTREME_IMMEDIATE_EVACUATION';

              return (
                <div
                  key={`${s.settlement_name}-${idx}`}
                  style={{ left: x, top: y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  onMouseEnter={() => setHoveredSettlement(s)}
                  onMouseLeave={() => setHoveredSettlement(null)}
                >
                  <div className="relative flex items-center justify-center">
                    {isExtreme && (
                      <span className="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-rose-500/60" />
                    )}
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                        isExtreme
                          ? 'bg-rose-500 border-white shadow-lg ring-2 ring-rose-400/50'
                          : 'bg-amber-500 border-white ring-2 ring-amber-400/50'
                      }`}
                    >
                      <AlertOctagon className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>

                  {/* Arrival Time Badge */}
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 border border-rose-500/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-rose-300 shadow-xl flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-rose-400" />
                    {s.settlement_name}: {s.travel_time_minutes}m
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group"
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
      <div className="absolute top-4 right-4 z-35">
        <LayerControl layers={layers} onToggleLayer={toggleLayer} />
      </div>

      {/* Settlement Hover Tooltip */}
      {hoveredSettlement && (
        <div className="absolute bottom-4 left-4 z-40 bg-slate-900/95 backdrop-blur-md border border-rose-500/50 rounded-xl p-4 shadow-2xl max-w-sm pointer-events-none font-mono">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-bold text-rose-300 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              {hoveredSettlement.settlement_name}
            </h4>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-bold">
              {hoveredSettlement.hazard_level.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>
              <span className="text-slate-500 block">Breach Distance:</span>
              {hoveredSettlement.distance_km} km
            </div>
            <div>
              <span className="text-slate-500 block">Wave Arrival:</span>
              <span className="text-rose-400 font-bold">{hoveredSettlement.travel_time_minutes} min</span>
            </div>
            <div>
              <span className="text-slate-500 block">Peak Discharge:</span>
              {hoveredSettlement.peak_discharge_cms.toLocaleString()} m³/s
            </div>
            <div>
              <span className="text-slate-500 block">Stage Rise:</span>
              <span className="text-rose-400 font-bold">+{hoveredSettlement.peak_stage_rise_m} m</span>
            </div>
          </div>
        </div>
      )}

      {/* Lake Hover Info Tooltip */}
      {hoveredLake && !hoveredSettlement && (
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

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-[11px] text-slate-300 flex items-center gap-4 font-mono shadow-xl">
        <span className="text-slate-500 uppercase text-[10px]">Overlays:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span>Surge Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>At-Risk Village</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Stable Lake</span>
        </div>
      </div>
    </div>
  );
};
