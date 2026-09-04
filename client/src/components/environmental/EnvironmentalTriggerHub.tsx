'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  CloudRain,
  ShieldAlert,
  RefreshCw,
  Radio,
  Mountain,
  AlertTriangle,
  Waves,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Droplet,
  CheckCircle2,
} from 'lucide-react';
import { SeismicEvent, LiveGpmPrecipitationTelemetry, FloodAlert } from '@/types';

interface EnvironmentalTriggerHubProps {
  onAlertCreated?: (alert: FloodAlert) => void;
  onSelectLakeById?: (lakeId: string, lakeName?: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const EnvironmentalTriggerHub: React.FC<EnvironmentalTriggerHubProps> = ({
  onAlertCreated,
  onSelectLakeById,
}) => {
  const [activeTab, setActiveTab] = useState<'SEISMIC' | 'GPM'>('SEISMIC');
  const [seismicEvents, setSeismicEvents] = useState<SeismicEvent[]>([]);
  const [gpmTelemetry, setGpmTelemetry] = useState<LiveGpmPrecipitationTelemetry[]>([]);
  const [isSimulatingQuake, setIsSimulatingQuake] = useState<boolean>(false);
  const [isSimulatingRain, setIsSimulatingRain] = useState<boolean>(false);
  const [isSyncingUsgs, setIsSyncingUsgs] = useState<boolean>(false);
  const [lastActionStatus, setLastActionStatus] = useState<string | null>(null);

  // Fetch initial environmental telemetry
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const [seismicRes, gpmRes] = await Promise.all([
          fetch(`${API_BASE}/telemetry/seismic?limit=8`),
          fetch(`${API_BASE}/telemetry/precipitation/live`),
        ]);

        if (seismicRes.ok) {
          const sJson = await seismicRes.json();
          if (sJson?.data) setSeismicEvents(sJson.data);
        }

        if (gpmRes.ok) {
          const gJson = await gpmRes.json();
          if (gJson?.data) setGpmTelemetry(gJson.data);
        }
      } catch (err) {
        console.warn('Live environmental API polling fallback:', err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Handler: Simulate Mw 6.2 Earthquake
  const handleSimulateQuake = async () => {
    setIsSimulatingQuake(true);
    setLastActionStatus('Simulating Mw 6.2 thrust fault earthquake in Dolakha...');
    try {
      const res = await fetch(`${API_BASE}/telemetry/seismic/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          magnitude: 6.2,
          depth_km: 10.0,
          latitude: 27.84,
          longitude: 86.44,
          place: '12 km SW of Tsho Rolpa (Dolakha, Rolwaling Arc)',
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setSeismicEvents((prev) => [json.data, ...prev]);
          setLastActionStatus(
            `⚡ Triggered! PGA: ${json.data.max_pga_g}g at Tsho Rolpa Moraine Dam. Dispatched ${json.alerts_triggered} emergency alerts!`
          );

          if (json.alerts && Array.isArray(json.alerts) && json.alerts.length > 0 && onAlertCreated) {
            json.alerts.forEach((a: FloodAlert) => onAlertCreated(a));
          }
        }
      }
    } catch (err: any) {
      setLastActionStatus(`Failed to simulate quake: ${err.message}`);
    } finally {
      setIsSimulatingQuake(false);
    }
  };

  // Handler: Sync USGS live feed
  const handleSyncUsgs = async () => {
    setIsSyncingUsgs(true);
    setLastActionStatus('Syncing live M4.5+ Himalayan feed from USGS Earthquake Hazards Program...');
    try {
      const res = await fetch(`${API_BASE}/telemetry/seismic/sync`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setSeismicEvents(json.data);
          setLastActionStatus(`USGS Feed Synced: ${json.count} earthquakes verified along Himalayan Arc.`);
        }
      }
    } catch (err: any) {
      setLastActionStatus(`USGS sync offline fallback.`);
    } finally {
      setIsSyncingUsgs(false);
    }
  };

  // Handler: Simulate GPM extreme cloudburst pulse
  const handleSimulateRainPulse = async () => {
    setIsSimulatingRain(true);
    setLastActionStatus('Simulating NASA GPM IMERG 28.5 mm/hr cloudburst pulse in Koshi headwaters...');
    try {
      const res = await fetch(`${API_BASE}/telemetry/precipitation/simulate-pulse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          basin_id: 'KOSHI',
          rate_mm_hr: 28.5,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setGpmTelemetry((prev) =>
            prev.map((item) => (item.basin_id === 'KOSHI' ? json.data : item))
          );
          setLastActionStatus('🌧️ Cloudburst pulse recorded! Pore-pressure critical surge alert triggered.');
          if (json.alert && onAlertCreated) {
            onAlertCreated(json.alert);
          }
        }
      }
    } catch (err: any) {
      setLastActionStatus(`Failed to pulse GPM: ${err.message}`);
    } finally {
      setIsSimulatingRain(false);
    }
  };

  return (
    <div className="bg-slate-900/95 border border-sky-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-xl font-mono text-xs">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live Environmental Trigger Hub
              </span>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Ingest Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              USGS Real-time Seismic Arc ($M_w \ge 4.5$) • Ground Motion Prediction (GMPE) • NASA GPM IMERG 30-min Inflow
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('SEISMIC')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'SEISMIC'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>USGS Seismic Arc ({seismicEvents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('GPM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'GPM'
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>NASA GPM IMERG ({gpmTelemetry.length} Basins)</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {lastActionStatus && (
        <div className="mb-3 p-2 rounded-lg bg-sky-950/50 border border-sky-500/40 text-[11px] text-sky-200 flex items-center justify-between">
          <span>{lastActionStatus}</span>
          <button onClick={() => setLastActionStatus(null)} className="text-slate-400 hover:text-white text-xs px-1">
            ✕
          </button>
        </div>
      )}

      {/* Tab 1: USGS Seismic Monitor & Moraine GMPE Analyzer */}
      {activeTab === 'SEISMIC' && (
        <div className="space-y-3">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <Mountain className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Monitored Crests: <strong>6 Glacial Dams</strong> • Peak Ground Acceleration (PGA) Alert Threshold: <strong>&ge; 0.12g</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncUsgs}
                disabled={isSyncingUsgs}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncingUsgs ? 'animate-spin' : ''}`} />
                <span>{isSyncingUsgs ? 'Syncing...' : 'Sync USGS Feed'}</span>
              </button>

              <button
                onClick={handleSimulateQuake}
                disabled={isSimulatingQuake}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition-all disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSimulatingQuake ? 'Computing GMPE...' : '⚡ Simulate Mw 6.2 Quake'}</span>
              </button>
            </div>
          </div>

          {/* Earthquakes Feed Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {seismicEvents.map((evt) => {
              const isHigh = evt.magnitude >= 5.5 || evt.max_pga_g >= 0.15;
              const hasCritical = evt.affected_lakes.some(
                (l) => l.destabilization_risk === 'CRITICAL_MORAINE_FAILURE'
              );

              return (
                <div
                  key={evt.id}
                  className={`p-3 rounded-xl border transition-all ${
                    hasCritical
                      ? 'bg-rose-950/40 border-rose-500/80 text-slate-200 ring-1 ring-rose-500/40'
                      : isHigh
                      ? 'bg-amber-950/30 border-amber-500/50 text-slate-200'
                      : 'bg-slate-950/80 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-black ${
                            evt.magnitude >= 6.0
                              ? 'bg-rose-600 text-white'
                              : evt.magnitude >= 5.0
                              ? 'bg-amber-600 text-white'
                              : 'bg-sky-600 text-white'
                          }`}
                        >
                          M_w {evt.magnitude.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Depth: {evt.depth_km} km
                        </span>
                      </div>
                      <h5 className="font-bold text-white text-xs mt-1 leading-tight">
                        {evt.place}
                      </h5>
                    </div>

                    <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400">
                      {evt.source}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-400 mb-2">
                    {new Date(evt.occurred_at).toLocaleDateString()} {new Date(evt.occurred_at).toLocaleTimeString()}
                  </div>

                  {/* Moraine Dam Acceleration & Shaking Table */}
                  <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">
                      Target Lake Crest Acceleration (GMPE):
                    </span>

                    {evt.affected_lakes.slice(0, 2).map((l, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[10px]"
                      >
                        <div>
                          <span
                            onClick={() => onSelectLakeById && onSelectLakeById(l.lake_id, l.lake_name)}
                            className="font-bold text-white hover:text-sky-300 cursor-pointer flex items-center gap-1"
                          >
                            {l.lake_name.split('(')[0]}
                            <ArrowUpRight className="w-2.5 h-2.5 text-slate-400" />
                          </span>
                          <span className="text-slate-400 text-[9px] block">
                            Distance: {l.distance_km} km • PGA: {l.computed_pga_g}g
                          </span>
                        </div>

                        <div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              l.destabilization_risk === 'CRITICAL_MORAINE_FAILURE'
                                ? 'bg-rose-500 text-white animate-pulse'
                                : l.destabilization_risk === 'HIGH_SLUMP_RISK'
                                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                : l.destabilization_risk === 'MODERATE_LIQUEFACTION'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {l.destabilization_risk.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Interlock Action Status */}
                  {evt.alert_dispatched && (
                    <div className="mt-2 pt-1 border-t border-slate-800 flex items-center justify-between text-[9px] text-rose-300 font-bold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-rose-400" />
                        SCADA Gate Interlock Tripped
                      </span>
                      <span>SkySat Tasked</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: NASA GPM IMERG 30-Minute Precipitation Pipeline */}
      {activeTab === 'GPM' && (
        <div className="space-y-3">
          {/* Top Quick Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <Droplet className="w-3.5 h-3.5 text-sky-400" />
              <span>
                NASA GPM Early Run IMERG V07B • Extreme Cloudburst Trigger: <strong>&gt;15 mm/hr or &gt;50 mm/3h</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSimulateRainPulse}
                disabled={isSimulatingRain}
                className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-950/50 transition-all disabled:opacity-50"
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>{isSimulatingRain ? 'Injecting Rain...' : '🌧️ Simulate 28.5 mm/hr Cloudburst'}</span>
              </button>
            </div>
          </div>

          {/* Sub-Basin Precipitation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gpmTelemetry.map((item) => {
              const isSurge = item.surge_status === 'EXTREME_PORE_PRESSURE_SURGE';
              const isElevated = item.surge_status === 'ELEVATED';

              return (
                <div
                  key={item.basin_id}
                  className={`p-3 rounded-xl border transition-all ${
                    isSurge
                      ? 'bg-rose-950/40 border-rose-500/80 text-white ring-1 ring-rose-500/40'
                      : isElevated
                      ? 'bg-amber-950/30 border-amber-500/50 text-slate-200'
                      : 'bg-slate-950/80 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div>
                      <h5 className="font-bold text-white text-xs">{item.basin_name}</h5>
                      <span className="text-[10px] text-slate-400 block">{item.sensor}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        isSurge
                          ? 'bg-rose-500 text-white animate-pulse'
                          : isElevated
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {item.surge_status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Precipitation Key Metrics */}
                  <div className="grid grid-cols-2 gap-2 my-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[9px]">30-Min Rain Rate:</span>
                      <span className="font-bold text-cyan-300 text-sm">{item.precip_rate_mm_hr} mm/hr</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">3h Accumulated:</span>
                      <span className="font-bold text-white">{item.accumulated_3h_mm} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">24h Total Rain:</span>
                      <span className="font-bold text-white">{item.accumulated_24h_mm} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px]">Monsoon Anomaly:</span>
                      <span className={`font-bold ${item.anomaly_pct > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {item.anomaly_pct > 0 ? `+${item.anomaly_pct}%` : `${item.anomaly_pct}%`}
                      </span>
                    </div>
                  </div>

                  {/* 72h Total Progress vs Climatology */}
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-slate-400">
                      <span>72h Rain Accumulation:</span>
                      <span className="text-white font-bold">{item.accumulated_72h_mm} mm</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.accumulated_72h_mm > 100
                            ? 'bg-rose-500'
                            : item.accumulated_72h_mm > 50
                            ? 'bg-amber-500'
                            : 'bg-sky-500'
                        }`}
                        style={{ width: `${Math.min(100, (item.accumulated_72h_mm / 150.0) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 block text-right">
                      Baseline Norm: {item.climatology_norm_72h_mm} mm
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
