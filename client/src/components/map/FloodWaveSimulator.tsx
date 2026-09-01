'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, SkipForward, Clock, ShieldAlert, Waves, Users, Zap, CheckCircle2 } from 'lucide-react';
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

  // Approximate distance reached along gorge (using ~45 km/h average speed in steep terrain)
  const currentDistanceKm = Math.min(50.0, simTimeMinutes * 0.85);

  return (
    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-sky-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-20 font-mono">
      {/* Top Status & Metrics Strip */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <Waves className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                3D Hydrodynamic Wave Simulator
              </span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/40">
                {activeCorridorName}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              NWS-BREACH & HEC-RAS 2D Steep-Gorge Kinematic Wave Propagation
            </p>
          </div>
        </div>

        {/* Live Simulation Metrics */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Time:</span>
            <span className="font-bold text-sky-300">T + {simTimeMinutes.toFixed(1)} min</span>
          </div>

          <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-slate-400">Front:</span>
            <span className="font-bold text-rose-300">{currentDistanceKm.toFixed(1)} km</span>
          </div>

          <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Villages Hit:</span>
            <span className="font-bold text-amber-300">{impactedSettlements.length} / {settlements.length}</span>
          </div>
        </div>
      </div>

      {/* Scrubber Slider */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>T = 0.0 min (Dam Breach Initiation)</span>
          <span className="text-rose-400 font-bold">
            {nextSettlement
              ? `Next Hit: ${nextSettlement.settlement_name} in ${(nextSettlement.travel_time_minutes - simTimeMinutes).toFixed(1)} min`
              : 'All Downstream Reaches Inundated'}
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
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
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
                  className={`w-2.5 h-2.5 rounded-full border-2 transform -translate-x-1/2 ${
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
                <Play className="w-3.5 h-3.5" /> Play Breach
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setSimTimeMinutes(0);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reset Simulation"
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
          <span className="text-slate-500 px-1.5">Speed:</span>
          {[1, 2, 5, 10].map((s) => (
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
