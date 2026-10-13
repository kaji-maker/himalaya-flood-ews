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
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpRight,
  Droplet,
  CheckCircle2,
  Globe,
  Sliders,
  Database,
} from 'lucide-react';
import { SeismicEvent, LiveGpmPrecipitationTelemetry, FloodAlert, LakeCatchmentPredictiveForecast } from '@/types';

interface EnvironmentalTriggerHubProps {
  onAlertCreated?: (alert: FloodAlert) => void;
  onSelectLakeById?: (lakeId: string, lakeName?: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const EnvironmentalTriggerHub: React.FC<EnvironmentalTriggerHubProps> = ({
  onAlertCreated,
  onSelectLakeById,
}) => {
  const [activeTab, setActiveTab] = useState<'SEISMIC' | 'GPM' | 'NWP_PREDICTIVE'>('SEISMIC');
  const [seismicEvents, setSeismicEvents] = useState<SeismicEvent[]>([]);
  const [gpmTelemetry, setGpmTelemetry] = useState<LiveGpmPrecipitationTelemetry[]>([]);
  const [nwpForecast, setNwpForecast] = useState<LakeCatchmentPredictiveForecast | null>(null);
  const [isSimulatingQuake, setIsSimulatingQuake] = useState<boolean>(false);
  const [isSimulatingRain, setIsSimulatingRain] = useState<boolean>(false);
  const [isSyncingUsgs, setIsSyncingUsgs] = useState<boolean>(false);
  const [isSyncingGpm, setIsSyncingGpm] = useState<boolean>(false);
  const [isSyncingNwp, setIsSyncingNwp] = useState<boolean>(false);
  const [showDrillControls, setShowDrillControls] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastActionStatus, setLastActionStatus] = useState<string | null>(null);

  // Fetch initial environmental telemetry with live scientific sync enabled
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const [seismicRes, gpmRes, nwpRes] = await Promise.all([
          fetch(`${API_BASE}/telemetry/seismic?sync=true&limit=8`),
          fetch(`${API_BASE}/telemetry/precipitation/live?sync=true`),
          fetch(`${API_BASE}/telemetry/nwp-forecast?lake_id=l-tsho-rolpa&elevation_m=4580`),
        ]);

        if (seismicRes.ok) {
          const sJson = await seismicRes.json();
          if (sJson?.data) setSeismicEvents(sJson.data);
        }

        if (gpmRes.ok) {
          const gJson = await gpmRes.json();
          if (gJson?.data) setGpmTelemetry(gJson.data);
        }

        if (nwpRes.ok) {
          const nJson = await nwpRes.json();
          if (nJson?.data) setNwpForecast(nJson.data);
        }
        setLastSyncedAt(new Date().toLocaleTimeString());
      } catch (err) {
        console.warn('Live environmental API polling fallback:', err);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  // Handler: Sync USGS live feed (M4.5+ Himalayan Arc)
  const handleSyncUsgs = async () => {
    setIsSyncingUsgs(true);
    setLastActionStatus('Syncing live M4.5+ Himalayan feed from USGS Earthquake Hazards Program...');
    try {
      const res = await fetch(`${API_BASE}/telemetry/seismic/sync`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setSeismicEvents(json.data);
          setLastActionStatus(`USGS Feed Synced: ${json.count} real-world earthquakes along Himalayan Arc.`);
          setLastSyncedAt(new Date().toLocaleTimeString());
        }
      }
    } catch (err: any) {
      setLastActionStatus(`USGS sync offline fallback: ${err.message}`);
    } finally {
      setIsSyncingUsgs(false);
    }
  };

  // Handler: Sync GPM & Open-Meteo high-altitude precipitation
  const handleSyncGpm = async () => {
    setIsSyncingGpm(true);
    setLastActionStatus('Syncing high-altitude precipitation from Open-Meteo & NASA GPM IMERG...');
    try {
      const res = await fetch(`${API_BASE}/telemetry/precipitation/live?sync=true`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setGpmTelemetry(json.data);
          setLastActionStatus(`Synced ${json.data.length} real-world alpine basin precipitation feeds.`);
          setLastSyncedAt(new Date().toLocaleTimeString());
        }
      }
    } catch (err: any) {
      setLastActionStatus(`Precipitation sync offline fallback: ${err.message}`);
    } finally {
      setIsSyncingGpm(false);
    }
  };

  // Handler: Sync 72h NWP predictive ensemble
  const handleSyncNwp = async () => {
    setIsSyncingNwp(true);
    setLastActionStatus('Fetching 72-hour ECMWF / Open-Meteo high-altitude predictive ensemble...');
    try {
      const res = await fetch(`${API_BASE}/telemetry/nwp-forecast?lake_id=l-tsho-rolpa&elevation_m=4580`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setNwpForecast(json.data);
          setLastActionStatus('72-hour predictive weather ensemble updated from high-altitude reanalysis.');
          setLastSyncedAt(new Date().toLocaleTimeString());
        }
      }
    } catch (err: any) {
      setLastActionStatus(`NWP sync fallback: ${err.message}`);
    } finally {
      setIsSyncingNwp(false);
    }
  };

  // Handler: Reset to live scientific feeds
  const handleResetToLive = async () => {
    setLastActionStatus('Resetting all telemetry to authoritative live scientific feeds...');
    await Promise.all([handleSyncUsgs(), handleSyncGpm(), handleSyncNwp()]);
  };

  // Handler: Simulate Mw 6.2 Earthquake (Drill Mode)
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

  // Handler: Simulate GPM extreme cloudburst pulse (Drill Mode)
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
              {lastSyncedAt && (
                <span className="text-[10px] text-slate-400">
                  Last Sync: {lastSyncedAt}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="text-sky-300 font-semibold flex items-center gap-1">
                <Globe className="w-3 h-3" /> Real Feeds:
              </span>
              <span>USGS FDSNWS Seismic Arc ($M_w \ge 4.5$)</span>
              <span>•</span>
              <span>Open-Meteo High-Altitude Reanalysis & NASA GPM</span>
              <span>•</span>
              <span>ECMWF HRES 72h Ensemble</span>
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
            <Droplet className="w-3.5 h-3.5" />
            <span>NASA GPM & Reanalysis ({gpmTelemetry.length} Basins)</span>
          </button>

          <button
            onClick={() => setActiveTab('NWP_PREDICTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'NWP_PREDICTIVE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>72h NWP Ensemble ({nwpForecast?.model_source ? 'ECMWF HRES' : 'Forecast'})</span>
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

      {/* Operator Drill & Stress Testing Console (Collapsible) */}
      {showDrillControls && (
        <div className="mb-3.5 p-3 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold text-amber-200 text-xs uppercase tracking-wider">
                Operator Drill & Synthetic Simulation Console
              </span>
            </div>
            <span className="text-[10px] text-amber-300/90 bg-amber-900/50 px-2 py-0.5 rounded border border-amber-600/40 font-mono">
              Drill Mode Active
            </span>
          </div>
          <p className="text-[11px] text-amber-100/70 leading-relaxed">
            Inject synthetic extreme environmental forcing triggers to stress-test downstream industrial SCADA gate interlocks, acoustic siren towers, and civil protection evacuation routing without waiting for natural disasters.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-500/30">
            <button
              onClick={handleSimulateQuake}
              disabled={isSimulatingQuake}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition-all disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isSimulatingQuake ? 'Computing GMPE...' : '⚡ Simulate Mw 6.2 Quake (Dolakha)'}</span>
            </button>

            <button
              onClick={handleSimulateRainPulse}
              disabled={isSimulatingRain}
              className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-sky-950/50 transition-all disabled:opacity-50"
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>{isSimulatingRain ? 'Injecting Rain...' : '🌧️ Simulate 28.5 mm/hr Cloudburst (Koshi)'}</span>
            </button>

            <button
              onClick={handleResetToLive}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs flex items-center gap-1.5 ml-auto transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Live Feeds</span>
            </button>
          </div>
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
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-amber-950/40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUsgs ? 'animate-spin' : ''}`} />
                <span>{isSyncingUsgs ? 'Querying USGS...' : 'Sync USGS M4.5+ Arc'}</span>
              </button>

              <button
                onClick={() => setShowDrillControls(!showDrillControls)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                  showDrillControls
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>Drill Mode</span>
                {showDrillControls ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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
                Open-Meteo High-Altitude Reanalysis & NASA GPM IMERG • Surge Threshold: <strong>&gt;15 mm/hr or &gt;50 mm/3h</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncGpm}
                disabled={isSyncingGpm}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-sky-950/40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGpm ? 'animate-spin' : ''}`} />
                <span>{isSyncingGpm ? 'Syncing Precipitation...' : 'Sync Live Inflow Feeds'}</span>
              </button>

              <button
                onClick={() => setShowDrillControls(!showDrillControls)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all ${
                  showDrillControls
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>Drill Mode</span>
                {showDrillControls ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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

      {/* Tab 3: Forward 72-Hour Elevation-Calibrated NWP Predictive Ensemble */}
      {activeTab === 'NWP_PREDICTIVE' && nwpForecast && (
        <div className="space-y-3">
          {/* Summary Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/40">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{nwpForecast.lake_name} Catchment ({nwpForecast.elevation_m_asl} m ASL)</span>
                </h4>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-900 text-indigo-200 border border-indigo-600">
                  {nwpForecast.model_source}
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Lapse-rate calibrated 0°C freezing level isotherm tracking with proactive reservoir pre-drawdown window.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                  nwpForecast.rain_on_snow_risk === 'CRITICAL_HYDROSTATIC_SPIKE'
                    ? 'bg-rose-500 text-white animate-pulse border-rose-400'
                    : nwpForecast.rain_on_snow_risk === 'MODERATE_MELT_SURGE'
                    ? 'bg-amber-500/30 text-amber-300 border-amber-500'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {nwpForecast.rain_on_snow_risk.replace(/_/g, ' ')}
              </span>

              <button
                onClick={handleSyncNwp}
                disabled={isSyncingNwp}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md shadow-indigo-950/40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNwp ? 'animate-spin' : ''}`} />
                <span>{isSyncingNwp ? 'Refreshing...' : 'Refresh Forecast'}</span>
              </button>
            </div>
          </div>

          {/* Key Atmospheric Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Current 0°C Isotherm:</span>
              <span className="font-bold text-amber-300 text-sm">{nwpForecast.freezing_level_current_m_asl} m ASL</span>
              <span className="text-[9px] text-slate-500 block">
                {nwpForecast.freezing_level_current_m_asl >= nwpForecast.elevation_m_asl
                  ? '⚠️ Above Moraine (Liquid Rain)'
                  : '❄️ Below Moraine (Solid Snow)'}
              </span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Forward 24h QPF:</span>
              <span className="font-bold text-cyan-300 text-sm">{nwpForecast.forward_24h_qpf_mm} mm</span>
              <span className="text-[9px] text-slate-500 block">48h: {nwpForecast.forward_48h_qpf_mm} mm • 72h: {nwpForecast.forward_72h_qpf_mm} mm</span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Advance Decision Lead Time:</span>
              <span className="font-bold text-emerald-300 text-sm">+{nwpForecast.advance_lead_time_hours} Hours</span>
              <span className="text-[9px] text-slate-500 block">Proactive Reservoir Buffer Window</span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[9px] text-slate-400 block">Recommended Pre-Drawdown:</span>
              <span className="font-bold text-rose-300 text-sm">+{nwpForecast.recommended_drawdown_buffer_m} m Buffer</span>
              <span className="text-[9px] text-slate-500 block">Gradual headpond pre-release</span>
            </div>
          </div>

          {/* Forecast Time Steps */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400">Step-by-Step Numerical Weather Prediction Ensembles:</div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {nwpForecast.forecast_steps.map((step) => (
                <div
                  key={step.step_hours}
                  className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-[10px] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300">T+{step.step_hours}h</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                        step.is_rain_on_snow
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step.is_rain_on_snow ? '🌧️ Rain-on-Snow' : '❄️ Snowpack'}
                    </span>
                  </div>
                  <div className="text-slate-200">
                    <div>Rate: <span className="font-bold text-white">{step.precipitation_rate_mm_hr} mm/hr</span></div>
                    <div>Accum: <span className="font-bold text-cyan-300">{step.accumulated_forward_mm} mm</span></div>
                    <div>Temp: <span className="font-bold">{step.temperature_c}°C</span></div>
                    <div className="text-slate-400 text-[9px]">0°C Elev: {step.freezing_level_m_asl} m</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
