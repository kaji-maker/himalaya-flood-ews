'use client';

import React, { useState } from 'react';
import { GlacialLake, MapLayerState, DownstreamImpact } from '@/types';
import { LayerControl } from './LayerControl';
import { FloodWaveSimulator } from './FloodWaveSimulator';
import { RiskBadge } from '../alerts/RiskBadge';
import { Mountain, Compass, Waves, AlertOctagon, ShieldAlert, Clock, TrendingUp, Play, Flame } from 'lucide-react';

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

  // Simulation State
  const [showSimulator, setShowSimulator] = useState(true);
  const [simTimeMinutes, setSimTimeMinutes] = useState(12.5); // Default to 12.5 min to show active surge
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);

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

  // Active breach corridor to simulate (Defaults to selected lake or Tsho Rolpa)
  const activeCorridorKey = selectedLake?.icimod_code === 'PDGL_NEP_KOSHI_002' ? 'PDGL_NEP_KOSHI_002' : 'PDGL_NEP_KOSHI_001';
  const activeCorridor = GLOF_INUNDATION_CORRIDORS[activeCorridorKey];
  const activeCorridors = Object.values(GLOF_INUNDATION_CORRIDORS);

  // Interpolate Wavefront Position along active corridor
  const corridorCoords = activeCorridor.corridor_coords;
  const progressRatio = Math.min(1.0, simTimeMinutes / 60.0);
  const totalSegments = corridorCoords.length - 1;
  const segProgress = progressRatio * totalSegments;
  const currentSegIdx = Math.min(totalSegments - 1, Math.floor(segProgress));
  const segFraction = segProgress - currentSegIdx;

  const [p0Lon, p0Lat] = corridorCoords[currentSegIdx];
  const [p1Lon, p1Lat] = corridorCoords[currentSegIdx + 1] || corridorCoords[currentSegIdx];
  const waveLon = p0Lon + (p1Lon - p0Lon) * segFraction;
  const waveLat = p0Lat + (p1Lat - p0Lat) * segFraction;
  const waveCoords = getCanvasCoords(waveLon, waveLat);

  return (
    <div className="relative w-full h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-himalaya-border shadow-2xl">
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

          {/* Render Thalweg Flowlines for all active corridors */}
          {activeCorridors.map((corridor, cIdx) => {
            const pathData = corridor.corridor_coords
              .map(([lon, lat], i) => {
                const pt = getCanvasCoords(lon, lat);
                return `${i === 0 ? 'M' : 'L'} ${pt.numX * 10},${pt.numY * 6}`;
              })
              .join(' ');

            return (
              <g key={cIdx}>
                {/* Outer Inundation Swath Buffer */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="24"
                  strokeOpacity="0.18"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Secondary Inundation Swath Buffer */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#FB923C"
                  strokeWidth="12"
                  strokeOpacity="0.35"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Central Thalweg Surge Line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="url(#surgeGradient)"
                  strokeWidth="3"
                  filter="url(#surgeGlow)"
                  strokeDasharray="4 6"
                  className="animate-pulse"
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Dynamic Animated Leading Wavefront Marker */}
      {showSimulator && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
          style={{ left: waveCoords.x, top: waveCoords.y }}
        >
          {/* Animated Expanding Ripple Rings */}
          <div className="absolute -inset-4 rounded-full bg-rose-500/30 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-sky-400/50 animate-pulse" />
          <div className="relative w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-amber-200 animate-bounce" />
          </div>
          {/* Wavefront Label Badge */}
          <div className="absolute left-7 top-1/2 -translate-y-1/2 bg-rose-950/90 border border-rose-500/60 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-rose-200 shadow-xl whitespace-nowrap flex items-center gap-1">
            <Waves className="w-3 h-3 text-rose-400 animate-pulse" />
            Wavefront: T + {simTimeMinutes.toFixed(1)} min
          </div>
        </div>
      )}

      {/* Downstream Settlement Inundation Markers */}
      {layers.inundationSwath &&
        activeCorridors.flatMap((c) => c.settlements).map((settlement, sIdx) => {
          const coords = getCanvasCoords(settlement.coordinates[0], settlement.coordinates[1]);
          const isHit = settlement.travel_time_minutes <= simTimeMinutes;
          const isNext = !isHit && (settlement.travel_time_minutes - simTimeMinutes <= 10.0);

          return (
            <div
              key={`settle-${sIdx}`}
              className="absolute z-15 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: coords.x, top: coords.y }}
              onMouseEnter={() => setHoveredSettlement(settlement)}
              onMouseLeave={() => setHoveredSettlement(null)}
            >
              {/* Pulsing Alert Ring if inundated */}
              {isHit && (
                <div className="absolute -inset-2 rounded-full bg-rose-500/40 animate-ping pointer-events-none" />
              )}

              {/* Settlement Pin */}
              <div
                className={`p-1.5 rounded-lg border shadow-lg transition-transform group-hover:scale-125 flex items-center gap-1 font-mono text-[10px] ${
                  isHit
                    ? 'bg-rose-950/95 border-rose-500 text-rose-200 ring-2 ring-rose-500/50'
                    : isNext
                    ? 'bg-amber-950/90 border-amber-500 text-amber-200 ring-1 ring-amber-500/30'
                    : 'bg-slate-900/90 border-slate-700 text-slate-300'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isHit ? 'bg-rose-500 animate-pulse' : isNext ? 'bg-amber-400' : 'bg-slate-500'
                  }`}
                />
                <span className="font-bold">{settlement.settlement_name}</span>
                <span className="text-[9px] opacity-75">
                  ({isHit ? `+${settlement.peak_stage_rise_m}m` : `${settlement.travel_time_minutes}m`})
                </span>
              </div>
            </div>
          );
        })}

      {/* Glacial Lake Markers */}
      {lakes.map((lake) => {
        const coords = getCanvasCoords(
          lake.centroid.coordinates[0],
          lake.centroid.coordinates[1]
        );
        const colors = getLakeColorClasses(lake.danger_level);
        const isSelected = selectedLake?.id === lake.id;

        return (
          <div
            key={lake.id}
            className="absolute z-20 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: coords.x, top: coords.y }}
            onClick={() => onSelectLake(lake)}
            onMouseEnter={() => setHoveredLake(lake)}
            onMouseLeave={() => setHoveredLake(null)}
          >
            {/* Outer Pulsing Aura for High Risk */}
            {(lake.danger_level === 'CRITICAL' || lake.danger_level === 'HIGH') && (
              <div
                className={`absolute -inset-2.5 rounded-full ${colors.glow} animate-ping opacity-60 pointer-events-none`}
              />
            )}

            {/* Main Center Lake Pin */}
            <div
              className={`relative w-6 h-6 rounded-full ${colors.bg} border-2 ${
                colors.border
              } shadow-lg flex items-center justify-center transition-transform group-hover:scale-125 ${
                isSelected ? 'ring-4 ring-sky-400 scale-125' : ''
              }`}
            >
              <Mountain className="w-3.5 h-3.5 text-white" />
            </div>

            {/* Lake Name Tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 border border-slate-700 px-2 py-1 rounded-md text-[11px] font-mono text-white whitespace-nowrap shadow-xl pointer-events-none z-30">
              <div className="font-bold">{lake.name}</div>
              <div className="text-[10px] text-slate-400">
                {(lake.current_area_sqm / 1e6).toFixed(2)} km² • {lake.danger_level}
              </div>
            </div>
          </div>
        );
      })}

      {/* Hover Settlement Inspection Card */}
      {hoveredSettlement && (
        <div className="absolute top-4 left-4 z-30 bg-slate-900/95 border border-rose-500/50 rounded-xl p-3.5 shadow-2xl backdrop-blur-md max-w-xs font-mono text-xs text-slate-200">
          <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1.5">
            <AlertOctagon className="w-4 h-4" />
            <span>Downstream Hazard Inspection</span>
          </div>
          <div className="text-white font-bold text-sm mb-1">{hoveredSettlement.settlement_name}</div>
          <div className="space-y-1 text-[11px] text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Distance from Lake:</span>
              <span className="font-bold">{hoveredSettlement.distance_km} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Wave Travel Time:</span>
              <span className="font-bold text-rose-300">{hoveredSettlement.travel_time_minutes} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peak Stage Rise:</span>
              <span className="font-bold text-sky-300">+{hoveredSettlement.peak_stage_rise_m} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peak Discharge (Q_p):</span>
              <span className="font-bold text-amber-300">
                {Math.round(hoveredSettlement.peak_discharge_cms).toLocaleString()} m³/s
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-800">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {hoveredSettlement.hazard_level.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Map Header Overlay */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-lg ${
            showSimulator
              ? 'bg-sky-500/20 border-sky-400 text-sky-200'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          {showSimulator ? 'Hide Wave Simulator' : 'Show Wave Simulator'}
        </button>
        <LayerControl layers={layers} onToggleLayer={toggleLayer} />
      </div>

      {/* Floating 3D Flood Wave Simulator Controller */}
      {showSimulator && (
        <FloodWaveSimulator
          activeCorridorName={activeCorridorKey === 'PDGL_NEP_KOSHI_001' ? 'Tsho Rolpa ➔ Tama Koshi Gorge' : 'Imja Tsho ➔ Dudh Koshi'}
          settlements={activeCorridor.settlements}
          simTimeMinutes={simTimeMinutes}
          setSimTimeMinutes={setSimTimeMinutes}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          speed={speed}
          setSpeed={setSpeed}
        />
      )}
    </div>
  );
};
