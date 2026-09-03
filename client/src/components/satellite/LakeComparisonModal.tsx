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
} from 'lucide-react';

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
  coordinates: [number, number];
  study_period: string;
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
  const [data, setData] = useState<ComparisonData | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50); // Split swipe slider (0 to 100%)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/lakes/${icimodCode || lakeId}/timelapse-comparison`);
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
  }, [isOpen, lakeId, icimodCode]);

  // Automated playback through the 23 consecutive years (2004 to 2026)
  useEffect(() => {
    if (!isPlaying || !data || data.epochs.length === 0) return;

    const intervalTime = Math.max(400, 1400 / playbackSpeed);
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
    return data?.epochs.find((e) => e.epoch_year === 2004) || null;
  }, [data]);

  const currentEpoch = useMemo(() => {
    return data?.epochs.find((e) => e.epoch_year === selectedYear) || data?.epochs[data.epochs.length - 1] || null;
  }, [data, selectedYear]);

  // Mini Sparkline Path Calculation across 23 years
  const sparklinePoints = useMemo(() => {
    if (!data || data.epochs.length === 0) return '';
    const minArea = 1.35;
    const maxArea = 1.85;
    const w = 500;
    const h = 50;

    return data.epochs
      .map((ep, idx) => {
        const x = (idx / (data.epochs.length - 1)) * w;
        const y = h - ((ep.area_sqkm - minArea) / (maxArea - minArea)) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [data]);

  // Active Year point for the sparkline marker
  const activePointCoord = useMemo(() => {
    if (!data || !currentEpoch) return { x: 0, y: 0 };
    const idx = data.epochs.findIndex((e) => e.epoch_year === currentEpoch.epoch_year);
    if (idx === -1) return { x: 0, y: 0 };
    const minArea = 1.35;
    const maxArea = 1.85;
    const w = 500;
    const h = 50;
    const x = (idx / (data.epochs.length - 1)) * w;
    const y = h - ((currentEpoch.area_sqkm - minArea) / (maxArea - minArea)) * h;
    return { x, y };
  }, [data, currentEpoch]);

  // Key landmark years for quick jumps
  const landmarkYears = [2004, 2007, 2011, 2015, 2018, 2021, 2024, 2026];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92vh] max-h-[880px]">
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                  {lakeName} • 20-Year Retrospective Satellite Timelapse
                </h3>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  2004 — 2026 (23 Annual Steps)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Multi-temporal Landsat 7/8 & Copernicus Sentinel-2 proglacial calving & terminus retreat progression
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 font-mono custom-scrollbar">
          {/* A. Before & After Swipe Comparison Canvas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                ◀ 2004 Baseline (Landsat 7 • 1.390 km²)
              </span>
              <span className="text-slate-500 text-[10px] hidden sm:inline">
                Drag center slider (↔) to peel away 2004 baseline and reveal selected year
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                {currentEpoch ? `${currentEpoch.epoch_year} (${currentEpoch.sensor.split(' ')[0]} • ${currentEpoch.area_sqkm.toFixed(3)} km²)` : 'Present'} ▶
              </span>
            </div>

            {/* Split Comparison Canvas */}
            <div className="relative w-full h-[250px] sm:h-[280px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 select-none shadow-inner group">
              {/* Background Layer: Selected Year's Satellite Capture */}
              <div className="absolute inset-0">
                <img
                  src={
                    currentEpoch?.image_chip_url ||
                    'https://tiles.maps.eox.at/wms?service=wms&request=GetMap&version=1.1.1&layers=s2cloudless-2023&styles=&format=image/jpeg&srs=EPSG:4326&bbox=86.43,27.84,86.52,27.89&width=800&height=400'
                  }
                  alt={`${selectedYear} Satellite View`}
                  className="w-full h-full object-cover filter contrast-125 brightness-105"
                />
                <div className="absolute top-3 right-3 bg-black/80 backdrop-blur px-2.5 py-1 rounded-md border border-cyan-500/50 text-[11px] text-cyan-300 font-bold shadow-lg">
                  {currentEpoch?.epoch_year} • {currentEpoch?.area_sqkm.toFixed(3)} km² (+{currentEpoch?.delta_area_pct}%)
                </div>
              </div>

              {/* Foreground Layer: 2004 Baseline (Clipped by Slider) */}
              <div
                className="absolute inset-0 overflow-hidden border-r-2 border-cyan-400"
                style={{ width: `${sliderPos}%` }}
              >
                <div className="absolute inset-0 w-full h-full min-w-[700px]">
                  <img
                    src={
                      baselineEpoch?.image_chip_url ||
                      'https://tiles.maps.eox.at/wms?service=wms&request=GetMap&version=1.1.1&layers=s2cloudless-2023&styles=&format=image/jpeg&srs=EPSG:4326&bbox=86.43,27.84,86.50,27.89&width=800&height=400'
                    }
                    alt="2004 Baseline Landsat View"
                    className="w-full h-full object-cover filter sepia-[0.35] contrast-110 brightness-95"
                  />
                </div>
                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur px-2.5 py-1 rounded-md border border-amber-500/50 text-[11px] text-amber-300 font-bold shadow-lg">
                  2004 Baseline • 1.390 km²
                </div>
              </div>

              {/* Draggable Split Divider Line & Thumb */}
              <div
                className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
                style={{ left: `calc(${sliderPos}% - 14px)` }}
              >
                <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center shadow-2xl border-2 border-white text-xs">
                  ↔
                </div>
              </div>

              {/* Range Input overlay */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />

              {/* In-Canvas Calving & Retreat Badge */}
              <div className="absolute bottom-2.5 left-2.5 z-10 bg-slate-950/85 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-200">
                Calving Margin: <strong className="text-rose-400">+{currentEpoch?.delta_area_pct}%</strong> growth • Calving Front Retreat: <strong className="text-amber-400">-{currentEpoch?.terminus_retreat_m} m</strong>
              </div>
            </div>
          </div>

          {/* B. Yearly Continuous Timeline Scrubber (2004 to 2026) */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Annual Timeline Scrubber (2004 — 2026)
                </span>
                <span className="text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                  Year {selectedYear}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 text-xs flex items-center gap-1 font-semibold transition-colors"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {isPlaying ? 'Pause' : 'Play (2004-2026)'}
                </button>
                <button
                  onClick={() => setSelectedYear(2004)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition-colors"
                  title="Reset to 2004"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Continuous Year Range Slider */}
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
                className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
                <span>2004 (Baseline)</span>
                <span>2008</span>
                <span>2012</span>
                <span>2015 (Gorkha Eq)</span>
                <span>2020 (Rapid Calving)</span>
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

            {/* Selected Year Detailed Glaciological Card */}
            {currentEpoch && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Sensor & Capture Date:</span>
                  <span className="font-bold text-cyan-300 text-[11px] block truncate">
                    {currentEpoch.sensor}
                  </span>
                  <span className="text-slate-400 text-[10px]">{currentEpoch.capture_date} ({currentEpoch.resolution_m}m)</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Area Expansion:</span>
                  <span className="font-bold text-white text-[11px]">
                    {currentEpoch.area_sqkm.toFixed(3)} km²
                  </span>
                  <span className="text-rose-400 text-[10px] block">
                    {currentEpoch.delta_area_pct > 0 ? `+${currentEpoch.delta_area_pct}% from baseline` : 'Baseline Anchor'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Terminus Retreat & Water Stored:</span>
                  <span className="font-bold text-amber-300 text-[11px]">
                    -{currentEpoch.terminus_retreat_m} m
                  </span>
                  <span className="text-blue-300 text-[10px] block">{currentEpoch.estimated_volume_million_m3} M m³ water</span>
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

          {/* C. Mini 23-Year Expansion Curve Sparkline Chart */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                23-Year Lake Surface Growth Curve (1.390 km² ➔ 1.820 km²)
              </span>
              <span className="text-[10px] text-slate-400">
                Rate: +19,545 m²/yr • Net Volume Added: +35.8M m³
              </span>
            </div>

            {/* SVG Sparkline */}
            <div className="relative w-full h-14 bg-slate-950/60 rounded-lg p-1.5 border border-slate-800/80 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 50" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Area under curve */}
                <polygon
                  points={`0,50 ${sparklinePoints} 500,50`}
                  fill="url(#areaGrad)"
                />
                {/* Line */}
                <polyline
                  fill="none"
                  stroke="#22D3EE"
                  strokeWidth="2"
                  points={sparklinePoints}
                />
                {/* Active Year Marker */}
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

        {/* 3. Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Landsat 7/8 (15-30m) & Copernicus Sentinel-2 MSI (10m) Multi-Spectral Calibrated Feed
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
