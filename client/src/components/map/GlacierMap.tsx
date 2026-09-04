'use client';

import React, { useState, useMemo } from 'react';
import { GlacialLake, MapLayerState, DownstreamImpact, VerticalSafeHaven } from '@/types';
import { VERTICAL_SAFE_HAVENS } from '@/data/safeHavens';
import { LayerControl } from './LayerControl';
import { FloodWaveSimulator } from './FloodWaveSimulator';
import { RiskBadge } from '../alerts/RiskBadge';
import { Mountain, Compass, Waves, AlertOctagon, ShieldAlert, Clock, TrendingUp, Play, Flame, Activity, Cpu, Target, Radio, Bell, Globe, ShieldCheck } from 'lucide-react';

interface GlacierMapProps {
  lakes: GlacialLake[];
  selectedLake?: GlacialLake | null;
  onSelectLake: (lake: GlacialLake) => void;
  basinName?: string;
}

// Sentinel-1 InSAR Moraine Creep Hotspots (SBAS Multi-temporal LOS velocities)
const INSAR_CREEP_HOTSPOTS = [
  { id: 'insar-tsho', lake_id: 'l-tsho-rolpa', name: 'Tsho Rolpa Terminal Moraine', coords: [86.472, 27.865] as [number, number], velocity_mm_yr: -28.4, rating: 'CRITICAL_SUBSIDENCE' },
  { id: 'insar-imja', lake_id: 'l-imja-tsho', name: 'Imja Lateral Moraine Ridge', coords: [86.920, 27.905] as [number, number], velocity_mm_yr: -14.2, rating: 'MODERATE_CREEP' },
  { id: 'insar-thulagi', lake_id: 'l-thulagi', name: 'Thulagi Dam Crest', coords: [84.530, 28.515] as [number, number], velocity_mm_yr: -16.8, rating: 'MODERATE_CREEP' },
];

// Active Cue-and-Slew Orbital Tasking Footprints (SkySat / WorldView-3 sub-meter sweeps)
const CUE_SLEW_FOOTPRINTS = [
  {
    id: 'slew-tsho',
    lake_id: 'l-tsho-rolpa',
    name: 'Tsho Rolpa Catchment Tasking Footprint',
    sensor: 'SkySat-Submeter (0.50m GSD)',
    bbox: [86.45, 27.85, 86.50, 27.89] as [number, number, number, number],
    priority: 'IMMEDIATE_INTERVENTION',
  },
];

// In-Situ Riverbed Geophones, Ultrasonic Gauges & Coupled SCADA Barrages
const GORGE_EDGE_STATIONS = [
  {
    id: 'st-tamakoshi',
    name: 'Upper Rolwaling Gorge Station',
    coords: [86.38, 27.80] as [number, number],
    lake_id: 'l-tsho-rolpa',
    geophone_db: 84.5,
    stage_rate: '+0.82 m/min',
    status: 'CRITICAL_SURGE',
    coupled_facility: 'Upper Tamakoshi (456 MW)',
  },
  {
    id: 'st-dudhkoshi',
    name: 'Dingboche Gorge Tripwire Station',
    coords: [86.82, 27.86] as [number, number],
    lake_id: 'l-imja-tsho',
    geophone_db: 36.2,
    stage_rate: '+0.02 m/min',
    status: 'NORMAL',
    coupled_facility: 'Dudh Koshi Storage Dam',
  },
];

// High-Risk Village Solar Siren Towers & CDMC Emergency Networks
const COMMUNITY_SIREN_TOWERS = [
  {
    id: 'SIREN-ROL-01',
    name: 'Na Village Siren Tower (120 dB)',
    village: 'Na Village (ना गाउँ)',
    coords: [86.460, 27.840] as [number, number],
    db: 120,
    status: 'STANDBY',
    focal_contact: 'Dawa Sherpa (+977-9841234567)',
    frequency_mhz: 154.600,
  },
  {
    id: 'SIREN-ROL-02',
    name: 'Bedding Village Siren Tower (120 dB)',
    village: 'Bedding Village (बेदिङ)',
    coords: [86.420, 27.820] as [number, number],
    db: 120,
    status: 'STANDBY',
    focal_contact: 'Pasang Nuru (+977-9847654321)',
    frequency_mhz: 154.600,
  },
  {
    id: 'SIREN-TAK-03',
    name: 'Gongar Khola Siren Tower (120 dB)',
    village: 'Gongar Khola / Lamabagar',
    coords: [86.220, 27.700] as [number, number],
    db: 120,
    status: 'STANDBY',
    focal_contact: 'Bikram Thapa (+977-9851122334)',
    frequency_mhz: 154.625,
  },
  {
    id: 'SIREN-IMJ-01',
    name: 'Dingboche Siren Tower (120 dB)',
    village: 'Dingboche (दिङबोचे)',
    coords: [86.83, 27.89] as [number, number],
    db: 120,
    status: 'STANDBY',
    focal_contact: 'Ang Tshering (+977-9842233445)',
    frequency_mhz: 154.575,
  },
  {
    id: 'SIREN-MAR-01',
    name: 'Syange Siren Tower (120 dB)',
    village: 'Syange (स्याङ्गे)',
    coords: [84.42, 28.38] as [number, number],
    db: 120,
    status: 'STANDBY',
    focal_contact: 'Ram Krishna Gurung (+977-9846677889)',
    frequency_mhz: 154.650,
  },
];



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
    insarDeformation: true,
    cueSlewFootprint: true,
    edgeSensors: true,
    communitySirens: true,
    verticalSafeHavens: true,
  });

  const [hoveredLake, setHoveredLake] = useState<GlacialLake | null>(null);
  const [hoveredSettlement, setHoveredSettlement] = useState<DownstreamImpact | null>(null);
  const [hoveredHaven, setHoveredHaven] = useState<VerticalSafeHaven | null>(null);
  const [selectedHaven, setSelectedHaven] = useState<VerticalSafeHaven | null>(null);

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

  // Compute 2D Dynamic Hydrodynamic Flood Wave Polygon (Gorge Left & Right Banks)
  const dynamicInundation = useMemo(() => {
    const subPoints: [number, number][] = [];
    for (let i = 0; i <= currentSegIdx; i++) {
      subPoints.push(corridorCoords[i]);
    }
    subPoints.push([waveLon, waveLat]);

    if (subPoints.length < 2) return { polygonPath: '', thalwegSurgePath: '', waveHeadX: 0, waveHeadY: 0 };

    // Convert to SVG space (numX * 10, numY * 6)
    const pts = subPoints.map(([lon, lat]) => {
      const c = getCanvasCoords(lon, lat);
      return { x: c.numX * 10, y: c.numY * 6 };
    });

    const leftBank: { x: number; y: number }[] = [];
    const rightBank: { x: number; y: number }[] = [];

    for (let i = 0; i < pts.length; i++) {
      let nx = 0;
      let ny = 0;
      if (i < pts.length - 1) {
        const dx = pts[i + 1].x - pts[i].x;
        const dy = pts[i + 1].y - pts[i].y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      } else if (i > 0) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len;
        ny = dx / len;
      }

      // Gorge width in SVG space varies (8px in canyon up to 18px in floodplains)
      const halfWidth = 8 + (i / pts.length) * 10;
      leftBank.push({ x: pts[i].x + nx * halfWidth, y: pts[i].y + ny * halfWidth });
      rightBank.push({ x: pts[i].x - nx * halfWidth, y: pts[i].y - ny * halfWidth });
    }

    const leftStr = leftBank.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const rightStr = rightBank.reverse().map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const polygonPath = `${leftStr} ${rightStr} Z`;

    const thalwegSurgePath = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const waveHead = pts[pts.length - 1];

    return { polygonPath, thalwegSurgePath, waveHeadX: waveHead.x, waveHeadY: waveHead.y };
  }, [corridorCoords, currentSegIdx, waveLon, waveLat]);

  return (
    <div className="relative w-full h-[620px] bg-slate-950 rounded-2xl overflow-hidden border border-himalaya-border shadow-2xl">
      {/* 3D Himalayan Terrain Mesh Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1323] to-[#040810]">
        {/* Real Satellite Orthoimagery Basemap (Copernicus Sentinel-2 / Esri High-Res) */}
        {layers.satelliteBase && (
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex opacity-70 mix-blend-screen contrast-125 brightness-105">
            <img
              src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/7/53/91"
              alt="Western Himalaya Satellite Ortho"
              className="w-1/3 h-full object-cover"
            />
            <img
              src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/7/53/92"
              alt="Central Himalaya Satellite Ortho"
              className="w-1/3 h-full object-cover"
            />
            <img
              src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/7/53/93"
              alt="Eastern Himalaya / Everest Satellite Ortho"
              className="w-1/3 h-full object-cover"
            />
            <div className="absolute bottom-2 left-3 z-10 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur border border-slate-700/80 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-lg">
              <Globe className="w-3 h-3 text-cyan-400" />
              <span>Copernicus Sentinel-2 & Esri World Imagery (Maxar 10m)</span>
            </div>
          </div>
        )}

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

      {/* SVG 2D Dynamic Inundation Swath & Physical Flood Wave Engine */}
      {layers.inundationSwath && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <defs>
            <linearGradient id="surgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#FB923C" stopOpacity="0.70" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.50" />
            </linearGradient>
            <linearGradient id="activeFlood2DGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#991B1B" stopOpacity="0.75" />
              <stop offset="40%" stopColor="#E11D48" stopOpacity="0.85" />
              <stop offset="85%" stopColor="#F43F5E" stopOpacity="0.90" />
              <stop offset="100%" stopColor="#FDE047" stopOpacity="0.95" />
            </linearGradient>
            <pattern id="floodTurbulenceHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.30" />
            </pattern>
            <filter id="surgeGlow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. Static Maximum Potential Breach Inundation Corridor Guide */}
          {activeCorridors.map((corridor, cIdx) => {
            const pathData = corridor.corridor_coords
              .map(([lon, lat], i) => {
                const pt = getCanvasCoords(lon, lat);
                return `${i === 0 ? 'M' : 'L'} ${pt.numX * 10},${pt.numY * 6}`;
              })
              .join(' ');

            return (
              <g key={cIdx}>
                {/* Maximum potential flood extent buffer */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="20"
                  strokeOpacity="0.12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="6 6"
                />
                <path
                  d={pathData}
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="1.5"
                  strokeOpacity="0.35"
                  strokeDasharray="3 5"
                />
              </g>
            );
          })}

          {/* 2. TRUE 2D DYNAMIC ACTIVE FLOOD INUNDATION POLYGON */}
          {dynamicInundation.polygonPath && (
            <g>
              {/* Dynamic 2D Active Water Swath */}
              <path
                d={dynamicInundation.polygonPath}
                fill="url(#activeFlood2DGrad)"
                stroke="#FDA4AF"
                strokeWidth="2"
                filter="url(#surgeGlow)"
              />
              {/* Debris / Turbulent Water Texture Overlay */}
              <path
                d={dynamicInundation.polygonPath}
                fill="url(#floodTurbulenceHatch)"
                fillOpacity="0.4"
              />
              {/* Animated Central Surge Thalweg Velocity Line */}
              <path
                d={dynamicInundation.thalwegSurgePath}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeDasharray="6 8"
                className="animate-pulse"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 3. VERTICAL SAFE HAVEN FOOT-SCRAMBLE ESCAPE TRAILS */}
          {layers.verticalSafeHavens && VERTICAL_SAFE_HAVENS.map((haven, hIdx) => {
            const trailPath = haven.escape_trail.map(([lon, lat], i) => {
              const pt = getCanvasCoords(lon, lat);
              return `${i === 0 ? 'M' : 'L'} ${pt.numX * 10},${pt.numY * 6}`;
            }).join(' ');

            return (
              <g key={`haven-trail-${hIdx}`}>
                {/* Glow buffer */}
                <path
                  d={trailPath}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="6"
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                />
                {/* Dashed green evacuation trail */}
                <path
                  d={trailPath}
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
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

      {/* 1. Automated Cue-and-Slew Tasked Optical Footprints */}
      {layers.cueSlewFootprint &&
        CUE_SLEW_FOOTPRINTS.map((footprint) => {
          const p1 = getCanvasCoords(footprint.bbox[0], footprint.bbox[3]);
          const p2 = getCanvasCoords(footprint.bbox[2], footprint.bbox[1]);
          const width = Math.abs(p2.numX - p1.numX);
          const height = Math.abs(p2.numY - p1.numY);

          return (
            <div
              key={footprint.id}
              className="absolute z-10 pointer-events-none border-2 border-indigo-400/80 border-dashed bg-indigo-500/10 rounded-lg shadow-lg"
              style={{
                left: `${p1.numX}%`,
                top: `${p1.numY}%`,
                width: `${Math.max(width, 4.5)}%`,
                height: `${Math.max(height, 4.5)}%`,
              }}
            >
              <div className="absolute -top-5 left-0 bg-indigo-950/95 border border-indigo-500/60 px-1.5 py-0.5 rounded text-[9px] font-mono text-indigo-200 flex items-center gap-1 shadow-lg whitespace-nowrap">
                <Target className="w-3 h-3 text-indigo-400" />
                <span>{footprint.sensor} Tasked</span>
              </div>
            </div>
          );
        })}

      {/* 2. Sentinel-1 InSAR Moraine Creep Hotspots */}
      {layers.insarDeformation &&
        INSAR_CREEP_HOTSPOTS.map((hotspot) => {
          const coords = getCanvasCoords(hotspot.coords[0], hotspot.coords[1]);
          const isCritical = hotspot.velocity_mm_yr <= -20.0;

          return (
            <div
              key={hotspot.id}
              className="absolute z-15 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: coords.x, top: coords.y }}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center animate-ping absolute -inset-0.5 ${
                  isCritical ? 'bg-rose-500/50' : 'bg-amber-500/50'
                }`}
              />
              <div
                className={`relative w-4 h-4 rounded-full border border-white shadow-lg flex items-center justify-center text-[8px] font-mono font-bold text-white ${
                  isCritical ? 'bg-rose-600' : 'bg-amber-600'
                }`}
              >
                <Activity className="w-2.5 h-2.5" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 border border-slate-700 px-2 py-1 rounded text-[10px] font-mono text-white whitespace-nowrap shadow-xl pointer-events-none z-30">
                <div className="font-bold flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  {hotspot.name}
                </div>
                <div className="text-rose-400 font-bold">InSAR LOS: {hotspot.velocity_mm_yr} mm/yr</div>
                <div className="text-slate-400 text-[9px]">{hotspot.rating}</div>
              </div>
            </div>
          );
        })}

      {/* 3. In-Situ Gorge Sensors & Coupled Hydropower SCADA */}
      {layers.edgeSensors &&
        GORGE_EDGE_STATIONS.map((station) => {
          const coords = getCanvasCoords(station.coords[0], station.coords[1]);
          const isSurge = station.status === 'CRITICAL_SURGE';

          return (
            <div
              key={station.id}
              className="absolute z-18 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: coords.x, top: coords.y }}
            >
              {isSurge && (
                <div className="w-4 h-4 rounded-full bg-rose-500/60 animate-ping absolute -inset-1" />
              )}
              <div
                className={`p-1 rounded-md border shadow-lg flex items-center gap-1 font-mono text-[9px] ${
                  isSurge
                    ? 'bg-rose-950/95 border-rose-500 text-rose-200'
                    : 'bg-slate-900/95 border-amber-500/70 text-amber-200'
                }`}
              >
                <Cpu className="w-3 h-3 text-amber-400" />
                <span className="font-bold">{station.name}</span>
                <span className="text-[8px] bg-black/40 px-1 rounded">{station.geophone_db} dB</span>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 border border-slate-700 p-2 rounded text-[10px] font-mono text-white whitespace-nowrap shadow-xl pointer-events-none z-30">
                <div className="font-bold">{station.name}</div>
                <div className="text-slate-300">Geophone: {station.geophone_db} dB (10-45 Hz)</div>
                <div className="text-slate-300">Stage Rate: {station.stage_rate}</div>
                <div className="text-amber-300">Coupled SCADA: {station.coupled_facility}</div>
              </div>
            </div>
          );
        })}

      {/* 4. Village Solar Siren Towers & CDMC Emergency Networks */}
      {layers.communitySirens &&
        COMMUNITY_SIREN_TOWERS.map((siren) => {
          const coords = getCanvasCoords(siren.coords[0], siren.coords[1]);

          return (
            <div
              key={siren.id}
              className="absolute z-19 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: coords.x, top: coords.y }}
            >
              <div className="w-3 h-3 rounded-full bg-violet-500/40 animate-pulse absolute -inset-0.5" />
              <div className="p-1 rounded-md border shadow-lg flex items-center gap-1 font-mono text-[9px] bg-slate-900/95 border-violet-500/70 text-violet-200">
                <Bell className="w-3 h-3 text-violet-400" />
                <span className="font-bold">{siren.village}</span>
                <span className="text-[8px] bg-violet-950/60 text-violet-300 px-1 rounded">{siren.db} dB</span>
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 top-6 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 border border-slate-700 p-2 rounded text-[10px] font-mono text-white whitespace-nowrap shadow-xl pointer-events-none z-30">
                <div className="font-bold text-violet-300">{siren.name}</div>
                <div className="text-slate-300">Acoustic SPL: {siren.db} dB • {siren.frequency_mhz} MHz RF</div>
                <div className="text-slate-300">CDMC Contact: {siren.focal_contact}</div>
                <div className="text-emerald-400 font-semibold">Status: {siren.status} (Solar Autonomous)</div>
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

      {/* Pre-surveyed Geological Vertical Safe Haven Waypoint Pins */}
      {layers.verticalSafeHavens &&
        VERTICAL_SAFE_HAVENS.map((haven) => {
          const coords = getCanvasCoords(haven.haven_coordinates[0], haven.haven_coordinates[1]);
          const timeToFlood = haven.flood_arrival_minutes - simTimeMinutes;
          const isFlooded = timeToFlood <= 0;
          const isUrgent = !isFlooded && timeToFlood <= haven.ascent_time_minutes;

          return (
            <div
              key={haven.id}
              className="absolute z-16 cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: coords.x, top: coords.y }}
              onMouseEnter={() => setHoveredHaven(haven)}
              onMouseLeave={() => setHoveredHaven(null)}
              onClick={() => setSelectedHaven(selectedHaven?.id === haven.id ? null : haven)}
            >
              {/* Pulsing Safety Contour Ring */}
              <div className="absolute -inset-2.5 rounded-full bg-emerald-500/25 animate-pulse pointer-events-none" />

              {/* Shield Pin */}
              <div className="relative flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-950 border-2 border-emerald-400 shadow-xl text-emerald-300 group-hover:scale-110 group-hover:bg-emerald-900 transition-all">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>

              {/* Compact Haven Elevation Pill */}
              <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-slate-950/90 border border-emerald-500/60 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-200 shadow-xl whitespace-nowrap flex items-center gap-1 group-hover:scale-105 transition-all">
                <span className="font-bold">+{haven.vertical_gain_m}m</span>
                <span className="text-slate-400 text-[9px]">({haven.ascent_time_minutes}m scramble)</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isFlooded
                      ? 'bg-rose-400'
                      : isUrgent
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-emerald-400'
                  }`}
                />
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

      {/* Hovered/Selected Safe Haven Inspection Card */}
      {(hoveredHaven || selectedHaven) && (
        <div className="absolute top-4 left-4 z-30 bg-slate-900/95 border border-emerald-500/50 rounded-xl p-3.5 shadow-2xl backdrop-blur-md max-w-sm font-mono text-xs text-slate-200">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Vertical Safe Haven Waypoint</span>
            </div>
            {selectedHaven && (
              <button
                onClick={() => setSelectedHaven(null)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {(() => {
            const haven = hoveredHaven || selectedHaven!;
            const timeToFlood = haven.flood_arrival_minutes - simTimeMinutes;
            const isFlooded = timeToFlood <= 0;
            const isUrgent = !isFlooded && timeToFlood <= haven.ascent_time_minutes;

            return (
              <div className="space-y-1.5">
                <div className="text-white font-bold text-sm">
                  {haven.haven_name}
                </div>
                <div className="text-[11px] text-emerald-300 font-semibold">
                  📍 {haven.settlement_name} • {haven.valley}
                </div>

                <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Haven Elevation:</span>
                    <span className="font-bold text-white">{haven.haven_elevation_m} m a.s.l.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vertical Height Gain:</span>
                    <span className="font-bold text-emerald-400">+{haven.vertical_gain_m} m above riverbed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ascent Scramble:</span>
                    <span className="font-bold text-cyan-300">{haven.ascent_distance_m} m ({haven.ascent_time_minutes} min scramble)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shelter Capacity:</span>
                    <span className="font-bold text-amber-300">{haven.capacity_persons} persons</span>
                  </div>
                </div>

                {/* Real-time Dynamic Evacuation Clearance Status */}
                <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-500/30">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Flood Wave Status:</span>
                    <span className={`font-bold ${isFlooded ? 'text-rose-400' : isUrgent ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                      {isFlooded
                        ? 'VALLEY INUNDATED (Haven Safe)'
                        : isUrgent
                        ? `URGENT: ARRIVES IN ${timeToFlood.toFixed(1)} MIN`
                        : `Arrives in ${timeToFlood.toFixed(1)} min`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-slate-400">Clearance Margin:</span>
                    <span className="font-bold text-white font-mono">
                      {isFlooded
                        ? 'Haven Secured'
                        : `+${Math.max(0, timeToFlood - haven.ascent_time_minutes).toFixed(1)} min lead buffer`}
                    </span>
                  </div>
                </div>

                {/* Safety Features */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Haven Emergency Equipment:</span>
                  <div className="space-y-0.5">
                    {haven.safety_features.map((feat, idx) => (
                      <div key={idx} className="text-[10px] text-slate-300 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
                  <span>CDMC Warden: <strong className="text-slate-300">{haven.focal_person}</strong></span>
                  <span className="text-cyan-400">{haven.emergency_contact}</span>
                </div>
              </div>
            );
          })()}
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
