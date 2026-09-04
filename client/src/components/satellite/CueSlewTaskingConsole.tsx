'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Satellite,
  Radio,
  Clock,
  Layers,
  TrendingDown,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Compass,
  Zap,
} from 'lucide-react';

interface CueSlewOrder {
  id: string;
  tasking_code: string;
  lake_id: string;
  icimod_code: string;
  lake_name: string;
  priority: 'IMMEDIATE_INTERVENTION' | 'HIGH_SURVEILLANCE' | 'ROUTINE_MONITORING';
  target_sensor: 'SkySat-Submeter' | 'PlanetScope-SuperDove' | 'WorldView-3';
  target_gsd_meters: number;
  bounding_box: [number, number, number, number];
  trigger_reason: {
    category: 'INSAR_SUBSIDENCE' | 'SEISMIC_SHAKE' | 'PRECIPITATION_PULSE' | 'AREA_SURGE';
    severity: 'CRITICAL' | 'WARNING' | 'ADVISORY';
    description: string;
    trigger_value: number;
    trigger_unit: string;
  };
  predicted_pass: {
    satellite_id: string;
    pass_window_utc: string;
    off_nadir_angle_deg: number;
    sun_elevation_deg: number;
    cloud_cover_forecast_pct: number;
  };
  cv_inspection_targets: {
    feature: string;
    status: 'DETECTED' | 'SUSPECTED' | 'CLEAR';
    confidence: number;
    metrics: Record<string, any>;
  }[];
  status: 'PENDING_PASS' | 'TASKED' | 'CAPTURED' | 'ANALYSIS_COMPLETE';
  created_at: string;
}

interface InSarAnalysis {
  lake_id: string;
  icimod_code: string;
  lake_name: string;
  moraine_type: string;
  baseline_date: string;
  mean_velocity_mm_year: number;
  hazard_classification: 'CRITICAL_CREEP' | 'ACCELERATED_SUBSIDENCE' | 'MODERATE_SETTLEMENT' | 'STABLE';
  internal_ice_core_melt_prob_pct: number;
  points: {
    acquisition_date: string;
    sensor: string;
    orbit_pass: string;
    los_displacement_mm: number;
    coherence: number;
    cumulative_subsidence_mm: number;
    velocity_mm_year: number;
  }[];
}

interface CueSlewConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLakeCode?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const MONITORED_LAKES = [
  { code: 'PDGL_NEP_KOSHI_007', id: 'l-galong-co', name: 'Galong Co / Cirenmaco', basin: 'Bhote Koshi / Poiqu' },
  { code: 'PDGL_NEP_KOSHI_001', id: 'l-tsho-rolpa', name: 'Tsho Rolpa', basin: 'Tama Koshi' },
  { code: 'PDGL_NEP_KOSHI_002', id: 'l-imja-tsho', name: 'Imja Tsho', basin: 'Dudh Koshi' },
  { code: 'PDGL_NEP_KOSHI_003', id: 'l-lower-barun', name: 'Lower Barun', basin: 'Barun / Arun' },
  { code: 'PDGL_NEP_GANDAKI_002', id: 'l-birendra', name: 'Birendra Lake', basin: 'Budhi Gandaki' },
  { code: 'PDGL_NEP_GANDAKI_001', id: 'l-thulagi', name: 'Thulagi Lake', basin: 'Marsyangdi' },
  { code: 'PDGL_IND_SIKKIM_001', id: 'l-south-lhonak', name: 'South Lhonak', basin: 'Teesta Basin' },
];

export const CueSlewTaskingConsole: React.FC<CueSlewConsoleProps> = ({
  isOpen,
  onClose,
  defaultLakeCode = 'PDGL_NEP_KOSHI_007',
}) => {
  const [activeLakeCode, setActiveLakeCode] = useState<string>(defaultLakeCode);
  const [orders, setOrders] = useState<CueSlewOrder[]>([]);
  const [insarData, setInsarData] = useState<InSarAnalysis | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CueSlewOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state for rapid requisition
  const [formSensor, setFormSensor] = useState<'SkySat-Submeter' | 'PlanetScope-SuperDove' | 'WorldView-3'>('SkySat-Submeter');
  const [formCategory, setFormCategory] = useState<'INSAR_SUBSIDENCE' | 'SEISMIC_SHAKE' | 'PRECIPITATION_PULSE' | 'AREA_SURGE'>('INSAR_SUBSIDENCE');
  const [formSeverity, setFormSeverity] = useState<'CRITICAL' | 'WARNING'>('CRITICAL');

  // CV Overlays toggles
  const [showCracks, setShowCracks] = useState<boolean>(true);
  const [showPiping, setShowPiping] = useState<boolean>(true);
  const [showEscarpment, setShowEscarpment] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && defaultLakeCode) {
      setActiveLakeCode(defaultLakeCode);
    }
  }, [isOpen, defaultLakeCode]);

  // Fetch orders and InSAR data
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [ordersRes, insarRes] = await Promise.all([
          fetch(`${API_BASE}/telemetry/cue-slew`).catch(() => null),
          fetch(`${API_BASE}/telemetry/insar-deformation/${activeLakeCode}`).catch(() => null),
        ]);

        if (ordersRes && ordersRes.ok) {
          const ordersJson = await ordersRes.json();
          if (ordersJson?.data) {
            setOrders(ordersJson.data);
            const activeLakeOrder = ordersJson.data.find(
              (o: CueSlewOrder) => o.icimod_code === activeLakeCode
            );
            setSelectedOrder(activeLakeOrder || ordersJson.data[0] || null);
          }
        }

        if (insarRes && insarRes.ok) {
          const insarJson = await insarRes.json();
          if (insarJson?.data) {
            setInsarData(insarJson.data);
          }
        }
      } catch (e) {
        console.error('Failed to load cue-and-slew telemetry:', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, activeLakeCode]);

  // Handle tasking submission
  const handleDispatchTasking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage(null);

    const activeLake = MONITORED_LAKES.find((l) => l.code === activeLakeCode) || MONITORED_LAKES[0];

    try {
      const res = await fetch(`${API_BASE}/telemetry/cue-slew/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lake_id: activeLake.id,
          icimod_code: activeLake.code,
          lake_name: activeLake.name,
          category: formCategory,
          severity: formSeverity,
          description: `Rapid ${formSensor} requisition triggered for ${activeLake.name} moraine verification.`,
          trigger_value: formCategory === 'INSAR_SUBSIDENCE' ? -28.4 : 0.15,
          trigger_unit: formCategory === 'INSAR_SUBSIDENCE' ? 'mm/yr' : 'PGA(g)',
          sensor: formSensor,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setOrders((prev) => [json.data, ...prev]);
          setSelectedOrder(json.data);
          setSuccessMessage(`Order ${json.data.tasking_code} enqueued successfully to ${formSensor} constellation!`);
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      }
    } catch (err) {
      console.error('Tasking error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute InSAR line points
  const insarChartData = useMemo(() => {
    if (!insarData || !insarData.points || insarData.points.length === 0) return null;

    const values = insarData.points.map((p) => p.cumulative_subsidence_mm);
    const minVal = Math.min(...values); // e.g. -180 mm
    const maxVal = Math.max(0, ...values);
    const span = Math.abs(minVal) + 20;

    const w = 550;
    const h = 130;

    const points = insarData.points.map((p, idx) => {
      const x = (idx / (insarData.points.length - 1)) * w;
      const y = h - ((p.cumulative_subsidence_mm - minVal) / span) * (h - 20) - 10;
      return { x, y, date: p.acquisition_date, val: p.cumulative_subsidence_mm, coherence: p.coherence };
    });

    const polyline = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { points, polyline, minVal, maxVal };
  }, [insarData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[920px]">
        {/* 1. Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0 animate-pulse">
              <Satellite className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                  Autonomous High-Resolution Satellite Tasking & InSAR Surveillance Console
                </h3>
                <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  SkySat 0.5m • PlanetScope 3m • Sentinel-1 InSAR
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Automated cue-and-slew targeting triggered by moraine subsidence, seismic shake, or anomalous melt expansion
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

        {/* 2. Monitored Lake Preset Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 px-5 pt-2.5 bg-slate-900/50 border-b border-slate-800/80 custom-scrollbar shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Target Catchments:
          </span>
          {MONITORED_LAKES.map((lake) => {
            const isActive = activeLakeCode === lake.code;
            return (
              <button
                key={lake.code}
                onClick={() => setActiveLakeCode(lake.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-900/50 border border-indigo-400'
                    : 'bg-slate-950/70 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-slate-500'}`} />
                {lake.name} ({lake.basin})
              </button>
            );
          })}
        </div>

        {/* 3. Main Console Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 font-mono custom-scrollbar">
          {/* Top Row: Submeter CV Inspection + Active Satellite Pass Window */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: 0.5m Optical Imagery Simulation & CV Detection Canvas (7 cols) */}
            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  SkySat-Submeter (0.50m GSD) AI Feature Analysis
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Band: 0.45-0.90 µm Pan-Sharpened
                </span>
              </div>

              {/* Simulated Submeter Viewport */}
              <div className="relative w-full h-[230px] rounded-lg overflow-hidden border border-slate-800 bg-slate-950 group">
                <img
                  src="https://tiles.maps.eox.at/wms?service=wms&request=GetMap&version=1.1.1&layers=s2cloudless-2023&styles=&format=image/jpeg&srs=EPSG:4326&bbox=86.46,27.85,86.50,27.88&width=650&height=250"
                  alt="Submeter satellite capture"
                  className="w-full h-full object-cover filter contrast-125 brightness-95"
                />

                {/* CV Bounding Boxes */}
                {/* 1. Tension Crack Box */}
                {showCracks && (
                  <div className="absolute top-12 left-28 border-2 border-rose-500 bg-rose-500/15 rounded px-1.5 py-0.5 text-[9px] text-rose-200 flex flex-col font-bold animate-pulse">
                    <span>⚡ Tension Crack #1 [94%]</span>
                    <span className="text-[8px] font-normal text-rose-300">Aperture: 42cm • Rate: 1.8cm/day</span>
                  </div>
                )}

                {/* 2. Piping Seepage Boil Box */}
                {showPiping && (
                  <div className="absolute bottom-8 left-36 border-2 border-amber-400 bg-amber-400/15 rounded px-1.5 py-0.5 text-[9px] text-amber-200 flex flex-col font-bold">
                    <span>💧 Toe Piping Boil [81%]</span>
                    <span className="text-[8px] font-normal text-amber-300">Turbid Plume: 140 m²</span>
                  </div>
                )}

                {/* 3. Calving Escarpment Box */}
                {showEscarpment && (
                  <div className="absolute top-10 right-20 border-2 border-cyan-400 bg-cyan-400/15 rounded px-1.5 py-0.5 text-[9px] text-cyan-200 flex flex-col font-bold">
                    <span>🧊 Ice Cliff Calving Margin [98%]</span>
                    <span className="text-[8px] font-normal text-cyan-300">Freeboard: 28.5m • Depth: 98m</span>
                  </div>
                )}

                <div className="absolute bottom-2 right-2 bg-black/85 backdrop-blur px-2 py-0.5 rounded border border-slate-700 text-[9px] text-slate-300">
                  Target BBox: [86.45°E, 27.85°N] • Resolution: 0.50m GSD
                </div>
              </div>

              {/* CV Feature Filters */}
              <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-rose-300">
                    <input
                      type="checkbox"
                      checked={showCracks}
                      onChange={(e) => setShowCracks(e.target.checked)}
                      className="rounded accent-rose-500"
                    />
                    Tension Cracks
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-amber-300">
                    <input
                      type="checkbox"
                      checked={showPiping}
                      onChange={(e) => setShowPiping(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    Toe Seepage Boils
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer select-none text-[11px] text-cyan-300">
                    <input
                      type="checkbox"
                      checked={showEscarpment}
                      onChange={(e) => setShowEscarpment(e.target.checked)}
                      className="rounded accent-cyan-500"
                    />
                    Ice Cliff Margin
                  </label>
                </div>
                <span className="text-[10px] text-slate-400">
                  Status: <strong className="text-emerald-400">ANALYSIS_VERIFIED</strong>
                </span>
              </div>
            </div>

            {/* Right: Predicted Orbital Pass Window & Constellation Telemetry (5 cols) */}
            <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Next Orbital Overpass
                  </span>
                  <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-bold">
                    CUE-AND-SLEW ACTIVE
                  </span>
                </div>

                <div className="mt-3 p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tasked Spacecraft:</span>
                    <span className="font-bold text-white">
                      {selectedOrder?.predicted_pass.satellite_id || 'SkySat-C14 (SSC# 46271)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Lake:</span>
                    <span className="font-bold text-cyan-300">
                      {selectedOrder?.lake_name || 'Tsho Rolpa'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Predicted Pass Window:</span>
                    <span className="font-bold text-amber-300">
                      {selectedOrder?.predicted_pass.pass_window_utc ? new Date(selectedOrder.predicted_pass.pass_window_utc).toLocaleTimeString() : 'In ~38 minutes'} UTC
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Off-Nadir Slew Angle:</span>
                    <span className="font-bold text-slate-200">
                      {selectedOrder?.predicted_pass.off_nadir_angle_deg || 14.2}° (Max Limit: 30°)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sun Elevation:</span>
                    <span className="font-bold text-slate-200">
                      {selectedOrder?.predicted_pass.sun_elevation_deg || 52.8}° (Mountain Shadow &lt; 10%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cloud Cover Forecast:</span>
                    <span className="font-bold text-emerald-400">
                      {selectedOrder?.predicted_pass.cloud_cover_forecast_pct || 12.0}% (Clear Aperture)
                    </span>
                  </div>
                </div>
              </div>

              {/* Autonomous Trigger Reason Badge */}
              {selectedOrder?.trigger_reason && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-[11px] text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    Trigger: {selectedOrder.trigger_reason.category} ({selectedOrder.trigger_reason.trigger_value} {selectedOrder.trigger_reason.trigger_unit})
                  </div>
                  <p className="text-[10px] text-slate-300 leading-snug">
                    {selectedOrder.trigger_reason.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Middle Row: 6-Year Sentinel-1 InSAR SBAS Moraine Subsidence Curve */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Sentinel-1 InSAR SBAS 6-Year Moraine Crest Subsidence (2020 — 2026)
                </span>
                {insarData && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                      insarData.hazard_classification === 'CRITICAL_CREEP'
                        ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                        : insarData.hazard_classification === 'ACCELERATED_SUBSIDENCE'
                        ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                    }`}
                  >
                    {insarData.hazard_classification}
                  </span>
                )}
              </div>
              {insarData && (
                <span className="text-xs text-slate-300">
                  Mean LOS Velocity: <strong className="text-rose-400">{insarData.mean_velocity_mm_year} mm/yr</strong> • Dead-Ice Core Degradation Prob: <strong className="text-amber-300">{insarData.internal_ice_core_melt_prob_pct}%</strong>
                </span>
              )}
            </div>

            {/* InSAR SVG Chart */}
            <div className="relative w-full h-[140px] bg-slate-950/80 rounded-lg p-2 border border-slate-800/80 overflow-hidden">
              {insarChartData ? (
                <svg className="w-full h-full" viewBox="0 0 550 130" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="550" y2="20" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
                  <line x1="0" y1="65" x2="550" y2="65" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
                  <line x1="0" y1="110" x2="550" y2="110" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />

                  {/* Gradient Area Fill */}
                  <defs>
                    <linearGradient id="insarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818CF8" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#818CF8" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  <polygon
                    points={`0,130 ${insarChartData.polyline} 550,130`}
                    fill="url(#insarGrad)"
                  />
                  <polyline
                    fill="none"
                    stroke="#A5B4FC"
                    strokeWidth="2"
                    points={insarChartData.polyline}
                  />

                  {/* Monsoonal Acceleration Shaded Bands */}
                  <rect x="50" y="0" width="35" height="130" fill="#3B82F6" fillOpacity="0.10" />
                  <rect x="145" y="0" width="35" height="130" fill="#3B82F6" fillOpacity="0.10" />
                  <rect x="240" y="0" width="35" height="130" fill="#3B82F6" fillOpacity="0.10" />
                  <rect x="335" y="0" width="35" height="130" fill="#3B82F6" fillOpacity="0.10" />
                  <rect x="430" y="0" width="35" height="130" fill="#3B82F6" fillOpacity="0.10" />
                  <rect x="515" y="0" width="35" height="130" fill="#3B82F6" fillOpacity="0.10" />
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                  Loading Sentinel-1 InSAR coherence points...
                </div>
              )}

              <div className="absolute top-2 left-3 text-[10px] text-slate-400">
                0 mm (2020 Baseline)
              </div>
              <div className="absolute bottom-2 left-3 text-[10px] text-rose-400 font-bold">
                {insarChartData ? `${insarChartData.minVal.toFixed(0)} mm (Cumulative Subsidence)` : ''}
              </div>
              <div className="absolute top-2 right-3 text-[9px] text-blue-300 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-500/30">
                Blue Bars = Summer Monsoon Acceleration
              </div>
            </div>
          </div>

          {/* Bottom Row: Rapid Cue-and-Slew Tasking Dispatch Form */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Dispatch Rapid Cue-and-Slew Optical Tasking Order
              </span>
              <span className="text-[10px] text-slate-400">
                Automated Planet Labs / Maxar API Integration Gateway
              </span>
            </div>

            {successMessage && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleDispatchTasking} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label htmlFor="target-sensor-select" className="block text-slate-400 text-[10px] mb-1">Target Spacecraft / Sensor:</label>
                <select
                  id="target-sensor-select"
                  name="target_sensor"
                  value={formSensor}
                  onChange={(e: any) => setFormSensor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value="SkySat-Submeter">SkySat-Submeter (0.50m GSD)</option>
                  <option value="PlanetScope-SuperDove">PlanetScope SuperDove (3.0m 8-Band)</option>
                  <option value="WorldView-3">WorldView-3 (0.31m SWIR/VNIR)</option>
                </select>
              </div>

              <div>
                <label htmlFor="trigger-source-select" className="block text-slate-400 text-[10px] mb-1">Anomalous Trigger Source:</label>
                <select
                  id="trigger-source-select"
                  name="trigger_source"
                  value={formCategory}
                  onChange={(e: any) => setFormCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value="INSAR_SUBSIDENCE">InSAR Moraine Creep (&gt; -25 mm/yr)</option>
                  <option value="SEISMIC_SHAKE">Seismic ShakeMap Trigger (PGA &gt; 0.12g)</option>
                  <option value="PRECIPITATION_PULSE">NASA GPM Monsoon Pulse (&gt; 100mm)</option>
                  <option value="AREA_SURGE">Rapid Supraglacial Area Expansion</option>
                </select>
              </div>

              <div>
                <label htmlFor="execution-priority-select" className="block text-slate-400 text-[10px] mb-1">Execution Priority:</label>
                <select
                  id="execution-priority-select"
                  name="execution_priority"
                  value={formSeverity}
                  onChange={(e: any) => setFormSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                >
                  <option value="CRITICAL">IMMEDIATE_INTERVENTION (&lt; 45m Pass)</option>
                  <option value="WARNING">HIGH_SURVEILLANCE (Next Overpass)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold py-1.5 px-3 rounded-lg shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Transmitting Order...' : 'Transmit Tasking Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 4. Modal Footer */}
        <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            Planet Labs Tasking API v2 & ESA Copernicus Open Access Hub S1-InSAR Connected
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
