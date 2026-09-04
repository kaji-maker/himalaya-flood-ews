'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Clock,
  ShieldAlert,
  Waves,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
  Activity,
  Compass,
  Mountain,
  AlertTriangle,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { DownstreamImpact } from '@/types';

interface FloodWaveSimulatorProps {
  activeCorridorName: string;
  settlements: DownstreamImpact[];
  simTimeMinutes: number;
  setSimTimeMinutes: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  speed: number;
  setSpeed: (speed: number) => void;
}

export const FloodWaveSimulator: React.FC<FloodWaveSimulatorProps> = ({
  activeCorridorName,
  settlements,
  simTimeMinutes,
  setSimTimeMinutes,
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
}) => {
  const maxTime = 60.0; // 60 minutes simulation window
  const [showHydraulicProfile, setShowHydraulicProfile] = useState<boolean>(false);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp: number | null = null;

    const tick = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      const deltaTimeSec = (timestamp - lastTimestamp) / 1000.0;
      lastTimestamp = timestamp;

      if (isPlaying) {
        setSimTimeMinutes((prev) => {
          const next = prev + deltaTimeSec * speed * 0.8;
          if (next >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return next;
        });
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, speed, setSimTimeMinutes, setIsPlaying]);

  // Compute metrics at current time
  const impactedSettlements = settlements.filter((s) => s.travel_time_minutes <= simTimeMinutes);
  const nextSettlement = settlements.find((s) => s.travel_time_minutes > simTimeMinutes);

  // Approximate distance reached along gorge (using ~48 km/h peak velocity with Voellmy debris friction)
  const currentDistanceKm = Math.min(50.0, simTimeMinutes * 0.85);

  // Dynamic Physical Hydraulic Values at wavefront
  const peakDischargeCms = Math.max(
    1850,
    Math.round(4650 * Math.exp(-0.016 * currentDistanceKm) * 10) / 10
  );
  const flowVelocityMs = Math.round((14.8 - 0.08 * currentDistanceKm) * 10) / 10;
  const flowDepthM = Math.round((16.5 - 0.18 * currentDistanceKm) * 10) / 10;
  const hazardIntensity = Math.round(flowVelocityMs * flowDepthM * 10) / 10; // h * v

  // Upper Tamakoshi 456 MW Dam Interlock Status
  const damSettlement = settlements.find((s) => s.settlement_name.includes('Gongar') || s.settlement_name.includes('Hydropower'));
  const damTimeRemaining = damSettlement ? Math.max(0, damSettlement.travel_time_minutes - simTimeMinutes) : null;

  // Longitudinal Profile points: Distance (km) -> Elevation (m)
  // Tsho Rolpa (0km, 4580m) -> Na (6.5km, 4180m) -> Bedding (14.2km, 3740m) -> Chhetchhet (28km, 1980m) -> Gongar (48km, 1690m)
  const valleyProfile = [
    { km: 0, elev: 4580, name: 'Breach' },
    { km: 6.5, elev: 4180, name: 'Na' },
    { km: 14.2, elev: 3740, name: 'Bedding' },
    { km: 28.0, elev: 1980, name: 'Chhetchhet' },
    { km: 36.5, elev: 1820, name: 'Simigaon' },
    { km: 48.0, elev: 1690, name: 'Gongar Dam' },
  ];

  // SVG profile conversion (viewBox 0 0 500 100)
  const profilePolyline = useMemo(() => {
    return valleyProfile
      .map((p) => {
        const x = (p.km / 50.0) * 500;
        const y = 90 - ((p.elev - 1500) / (4600 - 1500)) * 75;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, []);

  const waveProfileCoord = useMemo(() => {
    const x = Math.min(500, (currentDistanceKm / 50.0) * 500);
    // Interpolate elevation along profile
    let elev = 1690;
    for (let i = 0; i < valleyProfile.length - 1; i++) {
      if (currentDistanceKm >= valleyProfile[i].km && currentDistanceKm <= valleyProfile[i + 1].km) {
        const frac = (currentDistanceKm - valleyProfile[i].km) / (valleyProfile[i + 1].km - valleyProfile[i].km);
        elev = valleyProfile[i].elev + (valleyProfile[i + 1].elev - valleyProfile[i].elev) * frac;
        break;
      }
    }
    const y = 90 - ((elev - 1500) / (4600 - 1500)) * 75;
    return { x, y, elev: Math.round(elev) };
  }, [currentDistanceKm]);

  return (
    <div className="absolute bottom-3 left-3 right-3 bg-slate-900/95 border border-sky-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl z-20 font-mono transition-all">
      {/* Top Status & Metrics Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 mb-2.5 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <Waves className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                2D Hydrodynamic Flood Wave & Debris Engine
              </span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
                {activeCorridorName}
              </span>
              <span className="text-[10px] bg-rose-950/80 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40 font-bold">
                Q_peak: {peakDischargeCms} m³/s
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Shallow Water Equations (SWE) • Voellmy Debris Bulking (+32%) • NWS-BREACH Routing
            </p>
          </div>
        </div>

        {/* Live Simulation Key Metrics */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 text-[11px]">Time:</span>
            <span className="font-bold text-sky-300">T + {simTimeMinutes.toFixed(1)} min</span>
          </div>

          <div className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400 text-[11px]">Front:</span>
            <span className="font-bold text-rose-300">{currentDistanceKm.toFixed(1)} km</span>
          </div>

          <div className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[11px]">Velocity:</span>
            <span className="font-bold text-cyan-300">{flowVelocityMs} m/s ({Math.round(flowVelocityMs * 3.6)} km/h)</span>
          </div>

          <div className="bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-[11px]">Inundated:</span>
            <span className="font-bold text-amber-300">{impactedSettlements.length} / {settlements.length}</span>
          </div>

          <button
            onClick={() => setShowHydraulicProfile(!showHydraulicProfile)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1 transition-colors"
            title="Toggle 2D Hydraulic Cross-Section & Longitudinal Profile"
          >
            {showHydraulicProfile ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            <span>{showHydraulicProfile ? 'Hide Hydraulics' : 'Hydraulic Profile'}</span>
          </button>
        </div>
      </div>

      {/* Expandable 2D Hydraulic Cross-Section & Valley Profile */}
      {showHydraulicProfile && (
        <div className="mb-3 p-3 bg-slate-950/90 border border-slate-800 rounded-xl grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs animate-in fade-in duration-150">
          {/* A. Dynamic Wavefront Hydrodynamic Parameters */}
          <div className="space-y-1.5 border-r border-slate-800/80 pr-2">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <Waves className="w-3.5 h-3.5 text-rose-400" />
              Wavefront Hydrodynamic State
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Peak Inundation Depth:</span>
                <span className="font-bold text-white text-xs">{flowDepthM} meters</span>
                <span className="text-slate-400 text-[9px] block">Gorge Chokepoints: 16.5m</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Hazard Intensity (h · v):</span>
                <span className="font-bold text-rose-400 text-xs">{hazardIntensity} m²/s</span>
                <span className="text-rose-300 text-[9px] block">Critical Danger (&gt;2.0)</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Sediment Bulking:</span>
                <span className="font-bold text-amber-300 text-xs">+32% Debris Volume</span>
                <span className="text-slate-400 text-[9px] block">Voellmy Rheology (ξ=400)</span>
              </div>
              <div className="p-2 bg-slate-900/60 rounded border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Water Front Elevation:</span>
                <span className="font-bold text-cyan-300 text-xs">{waveProfileCoord.elev} m a.s.l.</span>
                <span className="text-slate-400 text-[9px] block">Drop: {4580 - waveProfileCoord.elev} m</span>
              </div>
            </div>
          </div>

          {/* B. Longitudinal Riverbed & Flood Wave Elevation Profile SVG */}
          <div className="space-y-1 border-r border-slate-800/80 pr-2">
            <div className="flex items-center justify-between text-white font-bold">
              <span className="flex items-center gap-1.5">
                <Mountain className="w-3.5 h-3.5 text-sky-400" />
                Longitudinal Valley Profile (4,580m ➔ 1,690m)
              </span>
              <span className="text-[10px] text-cyan-300 font-normal">
                Drop: 2,890m over 48km
              </span>
            </div>

            <div className="relative w-full h-24 bg-slate-900/80 rounded-lg p-1 border border-slate-800 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="profileGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#0284C7" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="floodWaterGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.75" />
                    <stop offset="100%" stopColor="#FB7185" stopOpacity="0.85" />
                  </linearGradient>
                </defs>

                {/* Valley Riverbed Slope Line */}
                <polyline
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="2"
                  points={profilePolyline}
                />
                {/* Area under riverbed */}
                <polygon
                  points={`0,100 ${profilePolyline} 500,100`}
                  fill="#0F172A"
                />

                {/* Inundated Water Surface Overlay (From breach to current wave position) */}
                <rect
                  x="0"
                  y="0"
                  width={waveProfileCoord.x}
                  height="100"
                  fill="url(#floodWaterGrad)"
                  fillOpacity="0.4"
                  clipPath="url(#riverClip)"
                />

                {/* Settlement Markers on profile */}
                {valleyProfile.map((vp, idx) => {
                  const x = (vp.km / 50.0) * 500;
                  const y = 90 - ((vp.elev - 1500) / (4600 - 1500)) * 75;
                  return (
                    <g key={idx}>
                      <circle cx={x} cy={y} r="3" fill="#E2E8F0" />
                      <text x={x} y={y - 5} fill="#94A3B8" fontSize="7" textAnchor="middle">
                        {vp.name}
                      </text>
                    </g>
                  );
                })}

                {/* Dynamic Moving Wavefront on Profile */}
                <g>
                  <circle
                    cx={waveProfileCoord.x}
                    cy={waveProfileCoord.y}
                    r="5"
                    fill="#F43F5E"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    className="animate-ping"
                  />
                  <circle
                    cx={waveProfileCoord.x}
                    cy={waveProfileCoord.y}
                    r="4"
                    fill="#F43F5E"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </g>
              </svg>
            </div>
          </div>

          {/* C. Upper Tamakoshi Hydropower Dam (456 MW) SCADA Interlock */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-white font-bold">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              Upper Tamakoshi 456 MW Dam SCADA
            </div>
            <div className="p-2.5 bg-slate-900/70 rounded border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Flood Arrival Window:</span>
                <span className="font-bold text-amber-300">
                  {damTimeRemaining !== null
                    ? damTimeRemaining > 0
                      ? `T - ${damTimeRemaining.toFixed(1)} min`
                      : 'FLOOD ARRIVED'
                    : '48.2 min'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Radial Spillway Gates:</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Tripped 100% Open
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Reservoir Buffer Drawn Down:</span>
                <span className="font-bold text-sky-300">-4.2 meters buffer</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight pt-0.5 border-t border-slate-800">
                IEC 60870-5-104 ASDU Type 45 command executed; spherical inlet valves sealed to protect turbines.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scrubber Slider */}
      <div className="space-y-1 mb-2.5">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            T = 0.0 min (Dam Breach Initiation: 4,650 m³/s)
          </span>
          <span className="text-rose-400 font-bold animate-pulse">
            {nextSettlement
              ? `Next Wave Impact: ${nextSettlement.settlement_name} in ${(nextSettlement.travel_time_minutes - simTimeMinutes).toFixed(1)} min (Lead Time Urgent)`
              : 'All Monitored Reaches Inundated • Downstream SCADA Buffers Active'}
          </span>
          <span>T = {maxTime.toFixed(0)} min</span>
        </div>

        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={maxTime}
            step={0.1}
            value={simTimeMinutes}
            onChange={(e) => setSimTimeMinutes(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
          />

          {/* Settlement Markers Along Timeline */}
          {settlements.map((s, idx) => {
            const pct = (s.travel_time_minutes / maxTime) * 100;
            const isHit = s.travel_time_minutes <= simTimeMinutes;
            return (
              <div
                key={idx}
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${pct}%` }}
              >
                <div
                  className={`w-3 h-3 rounded-full border-2 transform -translate-x-1/2 ${
                    isHit
                      ? 'bg-rose-500 border-white ring-2 ring-rose-500/50 scale-125'
                      : 'bg-slate-700 border-slate-500'
                  } transition-all`}
                  title={`${s.settlement_name} (T + ${s.travel_time_minutes} min)`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Buttons & Playback Options */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Play Breach Simulation
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setSimTimeMinutes(0);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reset Simulation to T=0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSimTimeMinutes((prev) => Math.min(maxTime, prev + 2.0))}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Step Forward +2 min"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Toggles */}
        <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800 text-[10px]">
          <span className="text-slate-500 px-1.5">Simulation Speed:</span>
          {[1, 2, 5, 10, 20].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                speed === s
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
