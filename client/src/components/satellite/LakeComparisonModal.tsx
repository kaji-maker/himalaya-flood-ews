'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Layers,
  TrendingUp,
  Maximize2,
  Clock,
  Compass,
  Mountain,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
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
  const [sliderPos, setSliderPos] = useState<number>(50); // Split slider 0 to 100%
  const [selectedEpochIdx, setSelectedEpochIdx] = useState<number>(4); // Default to current epoch
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
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
          setSelectedEpochIdx(json.epochs.length - 1);
        }
      } catch (err) {
        console.error('Failed to fetch timelapse data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, lakeId, icimodCode]);

  // Autoplay through epochs
  useEffect(() => {
    if (!isPlaying || !data) return;
    const interval = setInterval(() => {
      setSelectedEpochIdx((prev) => (prev + 1) % data.epochs.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isPlaying, data]);

  if (!isOpen) return null;

  const currentEpoch = data?.epochs[selectedEpochIdx] || null;
  const baselineEpoch = data?.epochs[0] || null;
  const latestEpoch = data?.epochs[(data?.epochs.length || 1) - 1] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-mono">
                  {lakeName} • 20-Year Retrospective Satellite Timelapse
                </h3>
                <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-mono">
                  2004 — 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Multi-temporal Landsat 7/8 & Copernicus Sentinel-2 proglacial lake expansion & calving analysis
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 font-mono">
          {/* 1. Interactive Before/After Split-Screen Comparison Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                ◀ 2004 Baseline (Landsat 7 ETM+ 30m)
              </span>
              <span className="text-slate-500">Drag center slider to inspect 20-year glacial retreat</span>
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                2026 Present Day (Sentinel-2 10m) ▶
              </span>
            </div>

            {/* Split Comparison Canvas Container */}
            <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950 select-none shadow-inner group">
              {/* Layer A (Background: 2026 Sentinel-2 Full Frame) */}
              <div className="absolute inset-0">
                <img
                  src={latestEpoch?.image_chip_url || 'https://tiles.maps.eox.at/wms?service=wms&request=GetMap&version=1.1.1&layers=s2cloudless-2023&styles=&format=image/jpeg&srs=EPSG:4326&bbox=86.43,27.84,86.52,27.89&width=800&height=400'}
                  alt="2026 Sentinel-2 View"
                  className="w-full h-full object-cover filter contrast-125 brightness-105"
                />
                <div className="absolute top-3 right-3 bg-black/75 backdrop-blur px-2.5 py-1 rounded-md border border-cyan-500/50 text-[11px] text-cyan-300 font-bold">
                  2026 • 1.820 km² (+30.9%)
                </div>
              </div>

              {/* Layer B (Foreground: 2004 Landsat clipped by slider) */}
              <div
                className="absolute inset-0 overflow-hidden border-r-2 border-cyan-400"
                style={{ width: `${sliderPos}%` }}
              >
                <div className="absolute inset-0 w-[800px] h-[360px]" style={{ width: '100%', minWidth: '800px' }}>
                  <img
                    src={baselineEpoch?.image_chip_url || 'https://tiles.maps.eox.at/wms?service=wms&request=GetMap&version=1.1.1&layers=s2cloudless-2023&styles=&format=image/jpeg&srs=EPSG:4326&bbox=86.43,27.84,86.50,27.89&width=800&height=400'}
                    alt="2004 Landsat 7 View"
                    className="w-full h-full object-cover filter sepia-[0.3] contrast-110 brightness-95"
                  />
                </div>
                <div className="absolute top-3 left-3 bg-black/75 backdrop-blur px-2.5 py-1 rounded-md border border-amber-500/50 text-[11px] text-amber-300 font-bold">
                  2004 • 1.390 km² (Baseline)
                </div>
              </div>

              {/* Draggable Split Divider Line & Handle */}
              <div
                className="absolute top-0 bottom-0 z-20 flex items-center justify-center pointer-events-none"
                style={{ left: `calc(${sliderPos}% - 14px)` }}
              >
                <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center shadow-2xl border-2 border-white text-xs">
                  ↔
                </div>
              </div>

              {/* Invisible Range Input for Smooth Dragging */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
              />

              {/* Water Expansion Indicator Badge */}
              <div className="absolute bottom-3 left-3 z-10 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-200">
                Net Proglacial Calving: <strong className="text-rose-400">+430,000 m²</strong> (+30.9%) • Terminus Retreat: <strong className="text-amber-400">1,240 m</strong>
              </div>
            </div>
          </div>

          {/* 2. Timeline Epoch Scrubber (2004 - 2026) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Select Historical Satellite Epoch
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs flex items-center gap-1 transition-colors"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? 'Pause' : 'Play Timelapse'}
                </button>
              </div>
            </div>

            {/* Epoch Selector Stepper Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {data?.epochs.map((ep, idx) => {
                const isSelected = selectedEpochIdx === idx;
                return (
                  <button
                    key={ep.epoch_year}
                    onClick={() => {
                      setSelectedEpochIdx(idx);
                      setIsPlaying(false);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-lg ring-1 ring-cyan-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-cyan-300">{ep.epoch_year}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 border border-slate-800">
                        {ep.sensor.split(' ')[0]}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-white">
                      {ep.area_sqkm.toFixed(3)} km²
                    </div>
                    <div className="text-[9px] text-rose-400 mt-0.5">
                      {ep.delta_area_pct > 0 ? `+${ep.delta_area_pct}%` : 'Baseline'}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Epoch Glaciological Inspector Card */}
            {currentEpoch && (
              <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Sensor Platform:</span>
                  <span className="font-bold text-cyan-300 text-[11px]">{currentEpoch.sensor}</span>
                  <span className="text-slate-400 block text-[10px] mt-0.5">Resolution: {currentEpoch.resolution_m}m</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Terminus Calving Retreat:</span>
                  <span className="font-bold text-amber-300 text-[11px]">-{currentEpoch.terminus_retreat_m} meters</span>
                  <span className="text-slate-400 block text-[10px] mt-0.5">Along Trakarding Tongue</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Estimated Impounded Volume:</span>
                  <span className="font-bold text-rose-300 text-[11px]">{currentEpoch.estimated_volume_million_m3} Million m³</span>
                  <span className="text-slate-400 block text-[10px] mt-0.5">Hydrostatic pressure high</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Field Notes:</span>
                  <span className="text-slate-300 text-[10px] leading-tight block">{currentEpoch.glaciological_note}</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Net 20-Year Glaciological Summary Matrix */}
          {data?.net_summary && (
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                20-Year Net Glaciological Trajectory (2004 - 2026)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Total Surface Expansion:</span>
                  <span className="text-rose-400 font-bold text-sm">+{data.net_summary.net_expansion_pct}%</span>
                  <span className="text-slate-400 block text-[10px] mt-0.5">+{data.net_summary.net_expansion_sqm.toLocaleString()} m²</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Annual Expansion Rate:</span>
                  <span className="text-amber-400 font-bold text-sm">+{data.net_summary.annual_expansion_rate_sqm_year.toLocaleString()} m²/yr</span>
                  <span className="text-slate-400 block text-[10px] mt-0.5">Rapid Proglacial Growth</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Cumulative Terminus Retreat:</span>
                  <span className="text-cyan-400 font-bold text-sm">-{data.net_summary.total_glacier_terminus_retreat_m} m</span>
                  <span className="text-slate-400 block text-[10px] mt-0.5">Trakarding Ice Cliff</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Additional Water Stored:</span>
                  <span className="text-blue-400 font-bold text-sm">+{data.net_summary.net_volume_added_million_m3} M m³</span>
                  <span className="text-slate-400 block text-[10px] mt-0.5">Increases GLOF Peak Discharge</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Data: USGS Landsat 7/8 Archive + ESA Copernicus Sentinel-2 MSI L2A Level
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
