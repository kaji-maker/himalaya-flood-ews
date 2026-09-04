'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Layers,
  TrendingUp,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Info,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Columns,
  Sliders,
  Ruler,
  AlertTriangle,
} from 'lucide-react';

export interface TimelapsePresetLake {
  code: string;
  name: string;
  basin: string;
  region: string;
  elevation: string;
  tag: string;
  isBreached?: boolean;
}

export const TIMELAPSE_PRESET_LAKES: TimelapsePresetLake[] = [
  {
    code: 'PDGL_NEP_KOSHI_007',
    name: 'Galong Co / Cirenmaco',
    basin: 'Bhote Koshi / Poiqu',
    region: 'Transboundary Tibet-Nepal Border',
    elevation: '4,380m',
    tag: 'Aug 2026 Surge Trigger',
  },
  {
    code: 'PDGL_NEP_KOSHI_001',
    name: 'Tsho Rolpa',
    basin: 'Tama Koshi',
    region: 'Rolwaling Himal, Nepal',
    elevation: '4,580m',
    tag: 'High Hazard Anchor',
  },
  {
    code: 'PDGL_NEP_KOSHI_002',
    name: 'Imja Tsho',
    basin: 'Dudh Koshi',
    region: 'Everest Khumbu, Nepal',
    elevation: '5,010m',
    tag: 'Canal Lowered 2016',
  },
  {
    code: 'PDGL_NEP_KOSHI_003',
    name: 'Lower Barun',
    basin: 'Barun / Arun',
    region: 'Makalu-Barun, Nepal',
    elevation: '4,570m',
    tag: '+197% Rapid Expansion',
  },
  {
    code: 'PDGL_NEP_GANDAKI_002',
    name: 'Birendra Lake',
    basin: 'Budhi Gandaki',
    region: 'Manaslu Arc, Nepal',
    elevation: '3,620m',
    tag: 'April 2024 Surge',
  },
  {
    code: 'PDGL_NEP_GANDAKI_001',
    name: 'Thulagi Lake',
    basin: 'Marsyangdi',
    region: 'Manaslu Arc, Nepal',
    elevation: '4,040m',
    tag: 'Steep Moraine Watch',
  },
  {
    code: 'PDGL_IND_SIKKIM_001',
    name: 'South Lhonak',
    basin: 'Teesta Basin',
    region: 'Sikkim Himalaya',
    elevation: '5,200m',
    tag: 'Oct 2023 GLOF Breach',
    isBreached: true,
  },
];

interface LakeComparisonModalProps {
  lakeId: string;
  lakeName: string;
  icimodCode?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface HistoricalEpoch {
  epoch_year: number;
  capture_date: string;
  sensor: string;
  resolution_m: number;
  area_sqm: number;
  area_sqkm: number;
  delta_area_pct: number;
  terminus_retreat_m: number;
  estimated_volume_million_m3: number;
  glaciological_note: string;
  image_chip_url: string;
  polygon_coords: number[][];
}

interface ComparisonData {
  lake_id: string;
  lake_name: string;
  icimod_code: string;
  basin?: string;
  elevation_m?: number;
  coordinates: [number, number];
  study_period: string;
  glacier_name?: string;
  net_summary: {
    initial_area_sqm_2004: number;
    current_area_sqm_2026: number;
    net_expansion_sqm: number;
    net_expansion_pct: number;
    annual_expansion_rate_sqm_year: number;
    total_glacier_terminus_retreat_m: number;
    net_volume_added_million_m3: number;
    primary_driver: string;
  };
  epochs: HistoricalEpoch[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const LakeComparisonModal: React.FC<LakeComparisonModalProps> = ({
  lakeId,
  lakeName,
  icimodCode,
  isOpen,
  onClose,
}) => {
  const [activeLakeCode, setActiveLakeCode] = useState<string>(icimodCode || lakeId || 'PDGL_NEP_KOSHI_007');
  const [data, setData] = useState<ComparisonData | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50); // Split swipe slider (0 to 100%)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Inspection Display Mode: 'side-by-side' | 'split'
  const [viewMode, setViewMode] = useState<'side-by-side' | 'split'>('side-by-side');
  const [showExpansionHighlight, setShowExpansionHighlight] = useState<boolean>(true);
  const [showCalvingLine, setShowCalvingLine] = useState<boolean>(true);

  // Sync active lake when props change or modal opens
  useEffect(() => {
    if (isOpen) {
      const target = icimodCode || lakeId || 'PDGL_NEP_KOSHI_007';
      setActiveLakeCode(target);
      setSelectedYear(2026);
      setIsPlaying(false);
    }
  }, [isOpen, icimodCode, lakeId]);

  // Dynamic preset pills (ensure the active inspected lake is always present and selectable)
  const displayedPresets = useMemo(() => {
    const activeExists = TIMELAPSE_PRESET_LAKES.some(
      (p) =>
        p.code.toLowerCase() === activeLakeCode.toLowerCase() ||
        (data && p.code.toLowerCase() === data.icimod_code.toLowerCase())
    );
    if (!activeExists && (data || lakeName)) {
      const customPreset: TimelapsePresetLake = {
        code: data?.icimod_code || activeLakeCode,
        name: data?.lake_name || lakeName || 'Active Target',
        basin: data?.basin || 'Monitored Basin',
        region: 'Himalayan Arc',
        elevation: data?.elevation_m ? `${data.elevation_m}m` : 'Alpine',
        tag: 'Inspected Target',
      };
      return [customPreset, ...TIMELAPSE_PRESET_LAKES];
    }
    return TIMELAPSE_PRESET_LAKES;
  }, [activeLakeCode, data, lakeName]);

  // Fetch comparison data for current active lake
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/lakes/${activeLakeCode}/timelapse-comparison`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setSelectedYear(2026);
        }
      } catch (err) {
        console.error('Failed to fetch timelapse data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, activeLakeCode]);

  // Automated playback through consecutive years (2004 to 2026)
  useEffect(() => {
    if (!isPlaying || !data || data.epochs.length === 0) return;

    const intervalTime = Math.max(350, 1200 / playbackSpeed);
    const timer = setInterval(() => {
      setSelectedYear((prevYear) => {
        if (prevYear >= 2026) {
          return 2004;
        }
        return prevYear + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, data, playbackSpeed]);

  const baselineEpoch = useMemo(() => {
    return data?.epochs.find((e) => e.epoch_year === 2004) || data?.epochs[0] || null;
  }, [data]);

  const currentEpoch = useMemo(() => {
    return data?.epochs.find((e) => e.epoch_year === selectedYear) || data?.epochs[data.epochs.length - 1] || null;
  }, [data, selectedYear]);

  // Dynamic Sparkline Path Calculation across 23 years based on each lake's area bounds
  const { minArea, maxArea, sparklinePoints, activePointCoord } = useMemo(() => {
    if (!data || data.epochs.length === 0) {
      return { minArea: 0, maxArea: 1, sparklinePoints: '', activePointCoord: { x: 0, y: 0 } };
    }
    const areas = data.epochs.map((e) => e.area_sqkm);
    const rawMin = Math.min(...areas);
    const rawMax = Math.max(...areas);
    const span = Math.max(0.04, rawMax - rawMin);
    const min = Math.max(0, rawMin - span * 0.1);
    const max = rawMax + span * 0.1;
    const w = 500;
    const h = 50;

    const points = data.epochs
      .map((ep, idx) => {
        const x = (idx / (data.epochs.length - 1)) * w;
        const y = h - ((ep.area_sqkm - min) / (max - min)) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    let activeCoord = { x: 0, y: 0 };
    if (currentEpoch) {
      const idx = data.epochs.findIndex((e) => e.epoch_year === currentEpoch.epoch_year);
      if (idx !== -1) {
        const x = (idx / (data.epochs.length - 1)) * w;
        const y = h - ((currentEpoch.area_sqkm - min) / (max - min)) * h;
        activeCoord = { x, y };
      }
    }

    return { minArea: min, maxArea: max, sparklinePoints: points, activePointCoord: activeCoord };
  }, [data, currentEpoch]);

  // Key landmark years for quick jumps
  const landmarkYears = [2004, 2007, 2011, 2015, 2018, 2021, 2023, 2026];

  // Calculate geometric retreat ratio (0.0 for 2004 -> 1.0 for max retreat)
  const retreatRatio = useMemo(() => {
    if (!currentEpoch || !data) return 1.0;
    const maxRetreat = Math.max(100, data.net_summary?.total_glacier_terminus_retreat_m || 1240);
    return Math.min(1.0, Math.max(0.0, currentEpoch.terminus_retreat_m / maxRetreat));
  }, [currentEpoch, data]);

  if (!isOpen) return null;

  const initialAreaSqm = data?.net_summary?.initial_area_sqm_2004 || 1390000;
  const initialAreaSqkm = (initialAreaSqm / 1e6).toFixed(3);
  const currentAreaSqm = currentEpoch?.area_sqm || 0;
  const deltaSqm = currentAreaSqm - initialAreaSqm;
  const isSouthLhonakBreach = data?.icimod_code === 'PDGL_IND_SIKKIM_001' && selectedYear >= 2023;

  // Render SVG Lake Canvas with authentic morphological glacier tongue retreat
  const renderLakeSvg = (is2004Baseline: boolean) => {
    // Coordinate space: 700 x 300
    // Lake starts at Outlet Dam: (140, 160)
    // Baseline Terminus: X = 410
    // Retreated Terminus: X = 410 + retreatRatio * 160
    const baselineTerminusX = 410;
    const activeTerminusX = is2004Baseline ? 410 : 410 + retreatRatio * 160;
    const retreatDistPx = activeTerminusX - baselineTerminusX;

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 700 300"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Glacial Water Gradient 2004 (Landsat 7 False Color NIR Navy) */}
          <linearGradient id="waterGrad2004" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0B3C5D" stopOpacity="0.88" />
            <stop offset="70%" stopColor="#1D5F8A" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#2A7B9B" stopOpacity="0.95" />
          </linearGradient>

          {/* Glacial Water Gradient Modern (Sentinel-2 True Color Milky Turquoise) */}
          <linearGradient id="waterGradModern" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0891B2" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#06B6D4" stopOpacity="0.90" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.95" />
          </linearGradient>

          {/* Post-Breach Drained Lake Water Gradient (South Lhonak) */}
          <linearGradient id="waterGradBreached" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#450A0A" stopOpacity="0.88" />
            <stop offset="70%" stopColor="#7F1D1D" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#991B1B" stopOpacity="0.95" />
          </linearGradient>

          {/* Expansion Zone Striped Pattern */}
          <pattern id="expansionHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#F43F5E" strokeWidth="2.5" strokeOpacity="0.7" />
          </pattern>

          {/* Debris-covered Glacier Tongue Texture */}
          <pattern id="glacierDebrisPattern" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="12" height="12" fill="#4B5563" fillOpacity="0.82" />
            <circle cx="3" cy="3" r="1.5" fill="#9CA3AF" />
            <circle cx="9" cy="8" r="1.2" fill="#D1D5DB" />
            <path d="M 0,6 Q 6,2 12,6" fill="none" stroke="#374151" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* 1. Base Glacial Lake Water Body (Western section up to active terminus) */}
        <path
          d={`M 140,165 
             C 170,145 220,135 290,140 
             C 340,145 380,150 ${activeTerminusX},152 
             L ${activeTerminusX},198 
             C 380,205 320,210 250,205 
             C 190,200 160,185 140,165 Z`}
          fill={
            isSouthLhonakBreach && !is2004Baseline
              ? 'url(#waterGradBreached)'
              : is2004Baseline
              ? 'url(#waterGrad2004)'
              : 'url(#waterGradModern)'
          }
          stroke={isSouthLhonakBreach && !is2004Baseline ? '#EF4444' : is2004Baseline ? '#38BDF8' : '#67E8F9'}
          strokeWidth="2.5"
          className="filter drop-shadow-md"
        />

        {/* 2. New Expansion Zone Highlight (Between 2004 Baseline & Current Terminus) */}
        {!is2004Baseline && retreatDistPx > 4 && showExpansionHighlight && !isSouthLhonakBreach && (
          <g>
            <path
              d={`M ${baselineTerminusX},151 
                 L ${activeTerminusX},152 
                 L ${activeTerminusX},198 
                 L ${baselineTerminusX},200 Z`}
              fill="url(#expansionHatch)"
              stroke="#FB7185"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            {/* Expansion Glowing Water Fill */}
            <path
              d={`M ${baselineTerminusX},151 
                 L ${activeTerminusX},152 
                 L ${activeTerminusX},198 
                 L ${baselineTerminusX},200 Z`}
              fill="#F43F5E"
              fillOpacity="0.30"
            />
          </g>
        )}

        {/* 3. Upstream Glacier Tongue */}
        <path
          d={`M ${activeTerminusX},152 
             C ${activeTerminusX + 30},150 560,140 640,130 
             L 650,225 
             C 580,215 ${activeTerminusX + 30},202 ${activeTerminusX},198 Z`}
          fill="url(#glacierDebrisPattern)"
          stroke="#6B7280"
          strokeWidth="1.5"
        />
        <text x="560" y="195" fill="#E2E8F0" fontSize="9" fontWeight="bold" textAnchor="middle">
          {data?.glacier_name || 'Glacier Tongue'}
        </text>

        {/* 4. Terminal Outlet Moraine Dam (West End) */}
        <rect
          x="132"
          y="150"
          width="10"
          height="32"
          rx="2"
          fill={isSouthLhonakBreach && !is2004Baseline ? '#EF4444' : '#EAB308'}
          stroke={isSouthLhonakBreach && !is2004Baseline ? '#B91C1C' : '#CA8A04'}
          strokeWidth="1.5"
        />
        <text x="137" y="142" fill={isSouthLhonakBreach && !is2004Baseline ? '#FCA5A5' : '#FDE047'} fontSize="9" fontWeight="bold" textAnchor="middle">
          {data?.icimod_code === 'PDGL_NEP_KOSHI_007' ? '1981 BREACH NOTCH' : data?.icimod_code === 'PDGL_NEP_KOSHI_002' ? 'ENGINEERED CANAL' : data?.icimod_code === 'PDGL_NEP_KOSHI_001' ? 'SPILLWAY SIPHON' : 'OUTLET DAM'}
        </text>

        {/* 5. Special South Lhonak Oct 2023 Breach Channel */}
        {isSouthLhonakBreach && !is2004Baseline && (
          <g>
            <line x1="110" y1="165" x2="160" y2="165" stroke="#EF4444" strokeWidth="6" strokeDasharray="4 2" />
            <rect x="70" y="190" width="135" height="20" rx="4" fill="#450A0A" stroke="#EF4444" strokeWidth="1" />
            <text x="137" y="204" fill="#FCA5A5" fontSize="8.5" fontWeight="bold" textAnchor="middle">
              OCT 2023 BREACH GORGE
            </text>
          </g>
        )}

        {/* 6. 2004 Calving Baseline Reference Line */}
        {(!is2004Baseline || viewMode === 'split') && (
          <g>
            <line
              x1={baselineTerminusX}
              y1="130"
              x2={baselineTerminusX}
              y2="220"
              stroke="#FACC15"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
            <text x={baselineTerminusX} y="125" fill="#FDE047" fontSize="9" fontWeight="bold" textAnchor="middle">
              2004 CALVING WALL (0m)
            </text>
          </g>
        )}

        {/* 7. Active Calving Front Cliff Line & Distance Ruler */}
        {showCalvingLine && (
          <g>
            <line
              x1={activeTerminusX}
              y1="135"
              x2={activeTerminusX}
              y2="215"
              stroke={isSouthLhonakBreach && !is2004Baseline ? '#EF4444' : '#F43F5E'}
              strokeWidth="3"
            />
            <rect
              x={activeTerminusX - 38}
              y="222"
              width="76"
              height="18"
              rx="4"
              fill="#0F172A"
              fillOpacity="0.9"
              stroke={isSouthLhonakBreach && !is2004Baseline ? '#EF4444' : '#F43F5E'}
              strokeWidth="1"
            />
            <text
              x={activeTerminusX}
              y="234"
              fill="#FDA4AF"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              {is2004Baseline ? '2004 FRONT' : `-${currentEpoch?.terminus_retreat_m}m`}
            </text>

            {/* Retreat Measurement Arrow */}
            {!is2004Baseline && retreatDistPx > 20 && (
              <g>
                <line
                  x1={baselineTerminusX}
                  y1="175"
                  x2={activeTerminusX}
                  y2="175"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <rect
                  x={baselineTerminusX + (retreatDistPx / 2) - 32}
                  y="166"
                  width="64"
                  height="16"
                  rx="3"
                  fill="#000000"
                  fillOpacity="0.85"
                />
                <text
                  x={baselineTerminusX + (retreatDistPx / 2)}
                  y="178"
                  fill="#FFFFFF"
                  fontSize="8.5"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  +{currentEpoch?.terminus_retreat_m}m
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    );
  };

  const currentChipUrl = currentEpoch?.image_chip_url;
  const baselineChipUrl = baselineEpoch?.image_chip_url || currentChipUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[95vh] max-h-[920px]">
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                  {data?.lake_name || lakeName} • 20-Year Retrospective Glacial Calving & Expansion
                </h3>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  2004 — 2026 (23 Consecutive Years)
                </span>
                {data?.elevation_m && (
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    Elev: {data.elevation_m}m
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Multispectral Landsat 7/8 & Copernicus Sentinel-2 calibrated calving margin analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  viewMode === 'side-by-side'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Side-by-Side Comparison"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Side-by-Side</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('split');
                  setSliderPos(50);
                }}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all ${
                  viewMode === 'split'
                    ? 'bg-cyan-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Curtain Swipe Slider"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Swipe Curtain</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Lake Preset Switcher Bar (Pan-Himalayan Scope) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 px-5 pt-2.5 bg-slate-900/60 border-b border-slate-800/80 custom-scrollbar shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Glacial Lake Presets:
          </span>
          {displayedPresets.map((l) => {
            const isActive = (data?.icimod_code === l.code) || (activeLakeCode === l.code);
            return (
              <button
                key={l.code}
                onClick={() => {
                  setActiveLakeCode(l.code);
                  setSelectedYear(2026);
                  setIsPlaying(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-2 transition-all shrink-0 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-lg shadow-cyan-950 ring-1 ring-cyan-400/40'
                    : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                <span className="font-bold">{l.name}</span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">({l.basin})</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    l.isBreached
                      ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50'
                      : isActive
                      ? 'bg-cyan-950 text-cyan-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {l.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Scrollable Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 font-mono custom-scrollbar">
          {/* Overlay Feature Toggles & Active State */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showExpansionHighlight}
                  onChange={(e) => setShowExpansionHighlight(e.target.checked)}
                  className="rounded accent-rose-500"
                />
                <span className="text-[11px] text-rose-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-rose-400" />
                  Highlight New Meltwater Expansion ({data?.net_summary?.net_expansion_sqm ? (data.net_summary.net_expansion_sqm > 0 ? '+' : '') + data.net_summary.net_expansion_sqm.toLocaleString() + ' m²' : '+430,000 m²'})
                </span>
              </label>

              <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCalvingLine}
                  onChange={(e) => setShowCalvingLine(e.target.checked)}
                  className="rounded accent-cyan-500"
                />
                <span className="text-[11px] text-cyan-300 font-semibold flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-cyan-400" />
                  Show Calving Front Line & Distance Ruler
                </span>
              </label>
            </div>

            <div className="text-[11px] text-slate-400">
              Active Display: <strong className="text-white">2004 Baseline ({initialAreaSqkm} km²)</strong> vs <strong className="text-cyan-400">Year {selectedYear} ({currentEpoch?.area_sqkm.toFixed(3)} km²)</strong>
            </div>
          </div>

          {/* MAIN VISUALIZATION CONTAINER */}
          {viewMode === 'side-by-side' ? (
            /* SIDE-BY-SIDE MODE */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Left Pane: 2004 Baseline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    2004 Baseline (Landsat 7 ETM+)
                  </span>
                  <span className="font-mono font-bold text-slate-200">
                    {initialAreaSqkm} km² • 0 m Retreat
                  </span>
                </div>
                <div className="relative w-full h-[250px] rounded-xl overflow-hidden border border-amber-500/40 bg-slate-950 shadow-inner">
                  <img
                    src={baselineChipUrl}
                    alt="2004 Satellite View"
                    className="w-full h-full object-cover filter brightness-90 contrast-110"
                  />
                  {renderLakeSvg(true)}
                  <div className="absolute top-2.5 left-2.5 bg-black/85 backdrop-blur px-2.5 py-1 rounded border border-amber-500/50 text-[10px] text-amber-300 font-bold">
                    2004 • Baseline Anchor ({initialAreaSqkm} km²)
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 bg-slate-950/90 backdrop-blur px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-300">
                    Terminus: {data?.glacier_name || 'Glacier Tongue'} at 0 m baseline
                  </div>
                </div>
              </div>

              {/* Right Pane: Selected Year (Dynamic Evolution) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    Year {selectedYear} ({currentEpoch?.sensor.split(' ')[0] || 'Modern'})
                  </span>
                  <span className="font-mono font-bold text-rose-300">
                    {currentEpoch?.area_sqkm.toFixed(3)} km² ({currentEpoch?.delta_area_pct && currentEpoch.delta_area_pct > 0 ? `+${currentEpoch.delta_area_pct}%` : `${currentEpoch?.delta_area_pct || 0}%`})
                  </span>
                </div>
                <div className="relative w-full h-[250px] rounded-xl overflow-hidden border border-cyan-500/40 bg-slate-950 shadow-inner ring-1 ring-cyan-500/20">
                  <img
                    src={currentChipUrl}
                    alt={`${selectedYear} Satellite View`}
                    className="w-full h-full object-cover filter contrast-120 brightness-105"
                  />
                  {renderLakeSvg(false)}
                  <div className="absolute top-2.5 right-2.5 bg-black/85 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/50 text-[10px] text-cyan-300 font-bold">
                    {selectedYear} • Retreated -{currentEpoch?.terminus_retreat_m} m
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 bg-slate-950/90 backdrop-blur px-2.5 py-1 rounded border border-slate-800 text-[10px] text-slate-200">
                    {deltaSqm >= 0 ? (
                      <span className="text-rose-300">New Meltwater: +{currentEpoch?.delta_area_pct}% (+{deltaSqm.toLocaleString()} m²)</span>
                    ) : (
                      <span className="text-amber-400 font-bold">Post-Breach Drainage: {currentEpoch?.delta_area_pct}% ({deltaSqm.toLocaleString()} m²)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SWIPE CURTAIN / SPLIT MODE */
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-amber-400 font-bold">
                  ◀ 2004 Baseline ({initialAreaSqkm} km²)
                </span>
                <span className="text-slate-500 text-[10px]">
                  Drag the center slider (↔) left or right to peel between 2004 and {selectedYear}
                </span>
                <span className="text-cyan-400 font-bold">
                  Year {selectedYear} ({currentEpoch?.area_sqkm.toFixed(3)} km² • -{currentEpoch?.terminus_retreat_m}m) ▶
                </span>
              </div>

              <div className="relative w-full h-[270px] sm:h-[300px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 select-none shadow-inner group">
                {/* Background Layer: Selected Year */}
                <div className="absolute inset-0">
                  <img
                    src={currentChipUrl}
                    alt="Modern satellite layer"
                    className="w-full h-full object-cover filter contrast-120 brightness-105"
                  />
                  {renderLakeSvg(false)}
                  <div className="absolute top-3 right-3 bg-black/85 backdrop-blur px-2.5 py-1 rounded border border-cyan-500/50 text-[11px] text-cyan-300 font-bold">
                    {selectedYear} • {currentEpoch?.area_sqkm.toFixed(3)} km² (-{currentEpoch?.terminus_retreat_m}m)
                  </div>
                </div>

                {/* Foreground Layer: 2004 Baseline (Clipped by sliderPos) */}
                <div
                  className="absolute inset-0 overflow-hidden border-r-2 border-cyan-400"
                  style={{ width: `${sliderPos}%` }}
                >
                  <div className="absolute inset-0 w-full h-full min-w-[700px]">
                    <img
                      src={baselineChipUrl}
                      alt="2004 baseline satellite layer"
                      className="w-full h-full object-cover filter brightness-90 contrast-110"
                    />
                    {renderLakeSvg(true)}
                  </div>
                  <div className="absolute top-3 left-3 bg-black/85 backdrop-blur px-2.5 py-1 rounded border border-amber-500/50 text-[11px] text-amber-300 font-bold">
                    2004 Baseline • {initialAreaSqkm} km²
                  </div>
                </div>

                {/* Draggable Divider Handle */}
                <div
                  className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
                  style={{ left: `calc(${sliderPos}% - 14px)` }}
                >
                  <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center shadow-2xl border-2 border-white text-xs">
                    ↔
                  </div>
                </div>

                {/* Range Input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(Number(e.target.value))}
                  aria-label="Swipe curtain divider"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                />

                <div className="absolute bottom-2.5 left-2.5 z-10 bg-slate-950/85 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-200">
                  Drag divider across valley to inspect calving margin retreat
                </div>
              </div>
            </div>
          )}

          {/* 4. ANNUAL TIMELINE SCRUBBER (2004 — 2026) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Annual Timeline Scrubber (2004 — 2026)
                </span>
                <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-500/40">
                  Year {selectedYear}
                </span>
                {isSouthLhonakBreach && (
                  <span className="text-xs font-bold text-rose-300 bg-rose-950/90 px-2.5 py-0.5 rounded border border-rose-500/60 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    POST-OCTOBER 2023 GLOF BREACH STATE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSelectedYear((y) => Math.max(2004, y - 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  title="Previous Year"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs flex items-center gap-1 font-bold shadow transition-colors"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? 'Pause' : 'Play (2004-2026)'}
                </button>
                <button
                  onClick={() => setSelectedYear((y) => Math.min(2026, y + 1))}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  title="Next Year"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedYear(2004);
                    setIsPlaying(false);
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
                  title="Reset to 2004"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Range Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min="2004"
                max="2026"
                step="1"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setIsPlaying(false);
                }}
                aria-label="Annual timeline year slider"
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
                <span>2004 (Baseline)</span>
                <span>2008</span>
                <span>2012</span>
                <span>2015 (Gorkha Eq)</span>
                <span>2020</span>
                <span>2023 (Sikkim Breach)</span>
                <span className="text-cyan-400 font-bold">2026 (Present)</span>
              </div>
            </div>

            {/* Horizontal Scrollable Yearly Epoch Chips (23 Years) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-1">
              {data?.epochs.map((ep) => {
                const isSelected = selectedYear === ep.epoch_year;
                const isLandmark = landmarkYears.includes(ep.epoch_year);

                return (
                  <button
                    key={ep.epoch_year}
                    onClick={() => {
                      setSelectedYear(ep.epoch_year);
                      setIsPlaying(false);
                    }}
                    className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-mono border transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold border-white shadow-lg ring-1 ring-cyan-400'
                        : isLandmark
                        ? 'bg-slate-800/90 text-cyan-300 border-cyan-500/30 hover:bg-slate-700'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {ep.epoch_year}
                  </button>
                );
              })}
            </div>

            {/* Selected Year Detailed Glaciological Metric Box */}
            {currentEpoch && (
              <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Sensor & Capture Date:</span>
                  <span className="font-bold text-cyan-300 text-[11px] block truncate">
                    {currentEpoch.sensor}
                  </span>
                  <span className="text-slate-400 text-[10px]">{currentEpoch.capture_date} ({currentEpoch.resolution_m}m)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Area Expansion / Delta:</span>
                  <span className="font-bold text-white text-[11px]">
                    {currentEpoch.area_sqkm.toFixed(3)} km²
                  </span>
                  <span className="text-rose-400 text-[10px] block font-semibold">
                    {currentEpoch.delta_area_pct > 0
                      ? `+${currentEpoch.delta_area_pct}% (+${deltaSqm.toLocaleString()} m²)`
                      : currentEpoch.delta_area_pct < 0
                      ? `${currentEpoch.delta_area_pct}% (${deltaSqm.toLocaleString()} m²)`
                      : 'Baseline Anchor (0 m²)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Terminus Retreat & Volume:</span>
                  <span className="font-bold text-amber-300 text-[11px]">
                    -{currentEpoch.terminus_retreat_m} meters
                  </span>
                  <span className="text-blue-300 text-[10px] block">{currentEpoch.estimated_volume_million_m3} Million m³ water</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Glaciological Milestone:</span>
                  <span className="text-slate-300 text-[10px] leading-tight block">
                    {currentEpoch.glaciological_note}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Dynamic 23-Year Expansion Curve Sparkline Chart */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs flex-wrap gap-1">
              <span className="text-white font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                23-Year Surface Growth Curve ({initialAreaSqkm} km² ➔ {((data?.net_summary?.current_area_sqm_2026 || currentAreaSqm) / 1e6).toFixed(3)} km²)
              </span>
              <span className="text-[10px] text-slate-400">
                Rate: +{(data?.net_summary?.annual_expansion_rate_sqm_year || 0).toLocaleString()} m²/yr • Net Volume Delta: {data?.net_summary?.net_volume_added_million_m3 && data.net_summary.net_volume_added_million_m3 > 0 ? `+${data.net_summary.net_volume_added_million_m3}` : `${data?.net_summary?.net_volume_added_million_m3 || 0}`}M m³
              </span>
            </div>

            {/* SVG Sparkline */}
            <div className="relative w-full h-12 bg-slate-950/60 rounded-lg p-1.5 border border-slate-800/80 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 50" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,50 ${sparklinePoints} 500,50`}
                  fill="url(#areaGrad)"
                />
                <polyline
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2"
                  points={sparklinePoints}
                />
                {activePointCoord.x > 0 && (
                  <g>
                    <line
                      x1={activePointCoord.x}
                      y1="0"
                      x2={activePointCoord.x}
                      y2="50"
                      stroke="#F43F5E"
                      strokeDasharray="2 2"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={activePointCoord.x}
                      cy={activePointCoord.y}
                      r="4"
                      fill="#F43F5E"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* 6. Modal Footer */}
        <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0 flex-wrap gap-2">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Landsat 7/8 (15-30m) & Copernicus Sentinel-2 MSI (10m) Multi-Spectral Calibrated Feed • Drivers: {data?.net_summary?.primary_driver || 'Climate warming'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
