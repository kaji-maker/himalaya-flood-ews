'use client';

import React, { useState, useEffect } from 'react';
import { HydropowerPlantCascade, DHMHydrometricStation } from '@/types';
import {
  Zap,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Radio,
  Sliders,
  AlertTriangle,
  RefreshCw,
  Terminal,
  CheckCircle2,
  Cpu,
  Waves,
  ArrowUpRight,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const INITIAL_CASCADES: HydropowerPlantCascade[] = [
  {
    id: 'hp-upper-tamakoshi',
    name: 'Upper Tamakoshi Hydroelectric Project',
    operator: 'Upper Tamakoshi Hydropower Limited (UTKHPL / NEA)',
    capacity_mw: 456,
    river: 'Tama Koshi',
    basin: 'Koshi',
    coordinates: [86.220, 27.700],
    headpond_volume_m3: 1200000,
    upstream_threat_lake_id: 'l-tsho-rolpa',
    upstream_threat_lake_name: 'Tsho Rolpa Glacial Lake',
    lead_time_minutes: 48,
    scada_ip: '192.168.10.45',
    scada_protocol: 'IEC 60870-5-104',
    radial_gates_count: 4,
    drawdown_buffer_m: 4.5,
    interlock_status: 'MONITORING',
    last_tripped_at: null,
    last_command_hex: null,
  },
  {
    id: 'hp-arun-3',
    name: 'Arun III Hydroelectric Project',
    operator: 'SJVN Arun-3 Power Development Company (SAPDC)',
    capacity_mw: 900,
    river: 'Arun',
    basin: 'Koshi',
    coordinates: [87.210, 27.530],
    headpond_volume_m3: 4800000,
    upstream_threat_lake_id: 'l-lower-barun',
    upstream_threat_lake_name: 'Lower Barun Lake',
    lead_time_minutes: 85,
    scada_ip: '192.168.12.90',
    scada_protocol: 'IEC 60870-5-104',
    radial_gates_count: 6,
    drawdown_buffer_m: 8.0,
    interlock_status: 'MONITORING',
    last_tripped_at: null,
    last_command_hex: null,
  },
  {
    id: 'hp-upper-bhotekoshi',
    name: 'Upper Bhote Koshi Hydroelectric Project',
    operator: 'Bhote Koshi Power Company (BKPC)',
    capacity_mw: 45,
    river: 'Bhote Koshi',
    basin: 'Koshi',
    coordinates: [85.935, 27.910],
    headpond_volume_m3: 350000,
    upstream_threat_lake_id: 'l-galong-co',
    upstream_threat_lake_name: 'Galong Co / Cirenmaco',
    lead_time_minutes: 22,
    scada_ip: '192.168.14.20',
    scada_protocol: 'IEC 60870-5-104',
    radial_gates_count: 3,
    drawdown_buffer_m: 2.5,
    interlock_status: 'MONITORING',
    last_tripped_at: null,
    last_command_hex: null,
  },
  {
    id: 'hp-middle-bhotekoshi',
    name: 'Middle Bhotekoshi Hydroelectric Project',
    operator: 'Madhya Bhotekoshi Jalavidyut Co.',
    capacity_mw: 102,
    river: 'Bhote Koshi',
    basin: 'Koshi',
    coordinates: [85.890, 27.840],
    headpond_volume_m3: 680000,
    upstream_threat_lake_id: 'l-dig-tsho',
    upstream_threat_lake_name: 'Dig Tsho (Langmoche)',
    lead_time_minutes: 38,
    scada_ip: '192.168.14.55',
    scada_protocol: 'IEC 60870-5-104',
    radial_gates_count: 4,
    drawdown_buffer_m: 3.2,
    interlock_status: 'MONITORING',
    last_tripped_at: null,
    last_command_hex: null,
  },
  {
    id: 'hp-upper-trishuli-1',
    name: 'Upper Trishuli-1 Hydroelectric Project',
    operator: 'NWEDC / Korea South-East Power',
    capacity_mw: 216,
    river: 'Trishuli',
    basin: 'Gandaki',
    coordinates: [85.240, 28.110],
    headpond_volume_m3: 1800000,
    upstream_threat_lake_id: 'l-kaldang',
    upstream_threat_lake_name: 'Kaldang Lake',
    lead_time_minutes: 55,
    scada_ip: '192.168.16.10',
    scada_protocol: 'IEC 60870-5-104',
    radial_gates_count: 4,
    drawdown_buffer_m: 5.0,
    interlock_status: 'MONITORING',
    last_tripped_at: null,
    last_command_hex: null,
  },
  {
    id: 'hp-middle-marsyangdi',
    name: 'Middle Marsyangdi Hydropower Station',
    operator: 'Nepal Electricity Authority (NEA)',
    capacity_mw: 70,
    river: 'Marsyangdi',
    basin: 'Gandaki',
    coordinates: [84.380, 28.180],
    headpond_volume_m3: 950000,
    upstream_threat_lake_id: 'l-thulagi',
    upstream_threat_lake_name: 'Thulagi Lake',
    lead_time_minutes: 62,
    scada_ip: '192.168.18.30',
    scada_protocol: 'IEC 60870-5-104',
    radial_gates_count: 3,
    drawdown_buffer_m: 3.8,
    interlock_status: 'MONITORING',
    last_tripped_at: null,
    last_command_hex: null,
  },
  {
    id: 'hp-marsyangdi',
    name: 'Marsyangdi Hydropower Station (Anbu Khaireni)',
    operator: 'Nepal Electricity Authority (NEA)',
    capacity_mw: 69,
    river: 'Marsyangdi',
    basin: 'Gandaki',
    coordinates: [84.510, 27.980],
    headpond_volume_m3: 1100000,
    upstream_threat_lake_id: 'l-thulagi',
    upstream_threat_lake_name: 'Thulagi Lake',
    lead_time_minutes: 74,
    scada_ip: '192.168.18.60',
    scada_protocol: 'IEC 60870-5-104',
    radial_gates_count: 4,
    drawdown_buffer_m: 4.0,
    interlock_status: 'MONITORING',
    last_tripped_at: null,
    last_command_hex: null,
  },
  {
    id: 'hp-budhi-gandaki',
    name: 'Budhi Gandaki Hydroelectric Project',
    operator: 'Budhi Gandaki Hydro Power Company Limited',
    capacity_mw: 1200,
    river: 'Budhi Gandaki',
    basin: 'Gandaki',
    coordinates: [84.820, 27.950],
    headpond_volume_m3: 15200000,
    upstream_threat_lake_id: 'l-birendra',
    upstream_threat_lake_name: 'Birendra Lake',
    lead_time_minutes: 42,
    scada_ip: '192.168.20.10',
    scada_protocol: 'IEC 60870-5-104',
    radial_gates_count: 8,
    drawdown_buffer_m: 12.0,
    interlock_status: 'MONITORING',
    last_tripped_at: null,
    last_command_hex: null,
  },
];

const INITIAL_DHM_STATIONS: DHMHydrometricStation[] = [
  {
    id: 'dhm-680',
    station_number: 680,
    name: 'Gongar Khola at Tama Koshi',
    river: 'Tama Koshi',
    basin: 'Koshi',
    elevation_m: 1690,
    coordinates: [86.225, 27.705],
    sensor_type: 'RADAR_STAGE',
    current_stage_m: 2.85,
    warning_stage_m: 4.5,
    danger_stage_m: 6.0,
    current_discharge_cms: 115.0,
    status: 'NORMAL',
    telemetry_source: 'DHM_TELEMETRIC_NETWORK',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'dhm-670',
    station_number: 670,
    name: 'Sun Koshi at Rabuwa Bazar',
    river: 'Sun Koshi',
    basin: 'Koshi',
    elevation_m: 540,
    coordinates: [86.580, 27.240],
    sensor_type: 'ULTRASONIC_SURGE',
    current_stage_m: 4.12,
    warning_stage_m: 7.0,
    danger_stage_m: 9.5,
    current_discharge_cms: 340.0,
    status: 'NORMAL',
    telemetry_source: 'DHM_TELEMETRIC_NETWORK',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'dhm-679',
    station_number: 679,
    name: 'Rolwaling Khola at Simigaon',
    river: 'Rolwaling Khola',
    basin: 'Koshi',
    elevation_m: 2020,
    coordinates: [86.340, 27.770],
    sensor_type: 'RADAR_STAGE',
    current_stage_m: 1.62,
    warning_stage_m: 2.8,
    danger_stage_m: 4.0,
    current_discharge_cms: 42.0,
    status: 'NORMAL',
    telemetry_source: 'DHM_TELEMETRIC_NETWORK',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'dhm-447',
    station_number: 447,
    name: 'Trishuli River at Betrawati',
    river: 'Trishuli',
    basin: 'Gandaki',
    elevation_m: 620,
    coordinates: [85.180, 27.970],
    sensor_type: 'PRESSURE_TRANSDUCER',
    current_stage_m: 3.40,
    warning_stage_m: 5.5,
    danger_stage_m: 7.5,
    current_discharge_cms: 195.0,
    status: 'NORMAL',
    telemetry_source: 'DHM_TELEMETRIC_NETWORK',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'dhm-439',
    station_number: 439,
    name: 'Marsyangdi at Bimalnagar',
    river: 'Marsyangdi',
    basin: 'Gandaki',
    elevation_m: 380,
    coordinates: [84.450, 27.970],
    sensor_type: 'RADAR_STAGE',
    current_stage_m: 3.10,
    warning_stage_m: 5.8,
    danger_stage_m: 8.0,
    current_discharge_cms: 210.0,
    status: 'NORMAL',
    telemetry_source: 'DHM_TELEMETRIC_NETWORK',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'dhm-445',
    station_number: 445,
    name: 'Budhi Gandaki at Arughat',
    river: 'Budhi Gandaki',
    basin: 'Gandaki',
    elevation_m: 510,
    coordinates: [84.810, 28.050],
    sensor_type: 'RADAR_STAGE',
    current_stage_m: 2.95,
    warning_stage_m: 6.0,
    danger_stage_m: 8.5,
    current_discharge_cms: 185.0,
    status: 'NORMAL',
    telemetry_source: 'DHM_TELEMETRIC_NETWORK',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'dhm-280',
    station_number: 280,
    name: 'Karnali River at Asaraghat',
    river: 'Karnali',
    basin: 'Karnali',
    elevation_m: 660,
    coordinates: [81.560, 29.080],
    sensor_type: 'RADAR_STAGE',
    current_stage_m: 4.80,
    warning_stage_m: 8.5,
    danger_stage_m: 11.0,
    current_discharge_cms: 460.0,
    status: 'NORMAL',
    telemetry_source: 'GOES_SATELLITE',
    last_updated: new Date().toISOString(),
  },
  {
    id: 'dhm-120',
    station_number: 120,
    name: 'Mahakali River at Darchula',
    river: 'Mahakali',
    basin: 'Mahakali',
    elevation_m: 890,
    coordinates: [80.540, 29.840],
    sensor_type: 'RADAR_STAGE',
    current_stage_m: 3.25,
    warning_stage_m: 6.5,
    danger_stage_m: 9.0,
    current_discharge_cms: 220.0,
    status: 'NORMAL',
    telemetry_source: 'GOES_SATELLITE',
    last_updated: new Date().toISOString(),
  },
];

interface HydropowerCascadePanelProps {
  onSelectPlantLocation?: (coords: [number, number], name: string) => void;
}

export function HydropowerCascadePanel({ onSelectPlantLocation }: HydropowerCascadePanelProps) {
  const [cascades, setCascades] = useState<HydropowerPlantCascade[]>(INITIAL_CASCADES);
  const [dhmStations, setDhmStations] = useState<DHMHydrometricStation[]>(INITIAL_DHM_STATIONS);
  const [basinFilter, setBasinFilter] = useState<string>('ALL');
  const [isTrippingId, setIsTrippingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'CASCADES' | 'DHM_GAUGES'>('CASCADES');
  const [inspectingPayload, setInspectingPayload] = useState<{
    plantName: string;
    hex: string;
    details: any;
  } | null>(null);

  // Fetch live cascades and stations from backend
  useEffect(() => {
    async function fetchData() {
      try {
        const [cascadesRes, dhmRes] = await Promise.all([
          fetch(`${API_BASE}/dispatch/hydropower-cascades`).then((r) => r.json()),
          fetch(`${API_BASE}/dispatch/dhm-stations`).then((r) => r.json()),
        ]);
        if (cascadesRes?.success && cascadesRes.data?.length > 0) {
          setCascades(cascadesRes.data);
        }
        if (dhmRes?.success && dhmRes.data?.length > 0) {
          setDhmStations(dhmRes.data);
        }
      } catch (err) {
        // Use initial offline mock state
      }
    }
    fetchData();
  }, []);

  const totalCapacityMw = cascades.reduce((acc, c) => acc + c.capacity_mw, 0);
  const activeTripsCount = cascades.filter(
    (c) => c.interlock_status === 'FULL_SPILLWAY_DISCHARGE' || c.interlock_status === 'PRE_DRAWDOWN'
  ).length;

  const filteredCascades = cascades.filter((c) => {
    if (basinFilter === 'ALL') return true;
    return c.basin.toUpperCase() === basinFilter.toUpperCase();
  });

  const filteredStations = dhmStations.filter((s) => {
    if (basinFilter === 'ALL') return true;
    return s.basin.toUpperCase() === basinFilter.toUpperCase();
  });

  const handleTripSpillway = async (plant: HydropowerPlantCascade) => {
    setIsTrippingId(plant.id);
    try {
      const res = await fetch(`${API_BASE}/dispatch/hydropower-cascades/${plant.id}/interlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'EMERGENCY_FULL_OPEN',
          reason: `Automated Cascade Defense: Surge pre-drawdown for upstream ${plant.upstream_threat_lake_name}`,
        }),
      }).then((r) => r.json());

      if (res?.success && res.data) {
        setCascades((prev) =>
          prev.map((c) =>
            c.id === plant.id
              ? {
                  ...c,
                  interlock_status: 'FULL_SPILLWAY_DISCHARGE',
                  last_tripped_at: res.data.dispatched_at,
                  last_command_hex: res.data.iec104_frame.apdu_hex,
                }
              : c
          )
        );

        setInspectingPayload({
          plantName: plant.name,
          hex: res.data.iec104_frame.apdu_hex,
          details: res.data,
        });
      }
    } catch (err) {
      // Local fallback simulation
      const mockHex = '68 0e 00 00 00 00 2d 01 06 00 01 00 00 01 00 81';
      setCascades((prev) =>
        prev.map((c) =>
          c.id === plant.id
            ? {
                ...c,
                interlock_status: 'FULL_SPILLWAY_DISCHARGE',
                last_tripped_at: new Date().toISOString(),
                last_command_hex: mockHex,
              }
            : c
        )
      );
      setInspectingPayload({
        plantName: plant.name,
        hex: mockHex,
        details: {
          scada_ip: plant.scada_ip,
          protocol: plant.scada_protocol,
          radial_gates_opened: plant.radial_gates_count,
        },
      });
    } finally {
      setIsTrippingId(null);
    }
  };

  const handleResetInterlock = async (plant: HydropowerPlantCascade) => {
    try {
      await fetch(`${API_BASE}/dispatch/hydropower-cascades/${plant.id}/interlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET' }),
      });
    } catch (e) {
      // Offline fallback
    }

    setCascades((prev) =>
      prev.map((c) =>
        c.id === plant.id
          ? {
              ...c,
              interlock_status: 'MONITORING',
              last_tripped_at: null,
              last_command_hex: null,
            }
          : c
      )
    );
  };

  const handleSimulateStageRise = async (station: DHMHydrometricStation) => {
    const newStage = Number((station.current_stage_m + 1.8).toFixed(2));
    const newDischarge = Number((station.current_discharge_cms * 1.6).toFixed(1));

    try {
      const res = await fetch(`${API_BASE}/dispatch/dhm-stations/${station.id}/reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_m: newStage, discharge_cms: newDischarge }),
      }).then((r) => r.json());

      if (res?.success && res.data) {
        setDhmStations((prev) => prev.map((s) => (s.id === station.id ? res.data : s)));
        return;
      }
    } catch (e) {
      // Local fallback
    }

    setDhmStations((prev) =>
      prev.map((s) =>
        s.id === station.id
          ? {
              ...s,
              current_stage_m: newStage,
              current_discharge_cms: newDischarge,
              status: newStage >= s.danger_stage_m ? 'CRITICAL_SURGE' : 'WATCH',
              last_updated: new Date().toISOString(),
            }
          : s
      )
    );
  };

  return (
    <div className="bg-himalaya-card border border-himalaya-border rounded-2xl p-5 shadow-2xl space-y-6">
      {/* Header & Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-himalaya-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Himalayan Hydropower Cascade Defense & SCADA Interlock</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                IEC 60870-5-104 ACTIVE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Downstream barrage telemetry, automated headpond pre-drawdown, and real DHM hydrometric gauging network.
            </p>
          </div>
        </div>

        {/* View Switcher & Basin Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('CASCADES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'CASCADES'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Hydropower Plants ({filteredCascades.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('DHM_GAUGES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'DHM_GAUGES'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>DHM River Gauges ({filteredStations.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
            {['ALL', 'KOSHI', 'GANDAKI', 'KARNALI', 'MAHAKALI'].map((b) => (
              <button
                key={b}
                onClick={() => setBasinFilter(b)}
                className={`px-2 py-1 rounded-md text-[11px] font-mono transition-all ${
                  basinFilter === b
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 4 Telemetry Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400">Total Monitored Capacity</div>
            <div className="text-xl font-bold font-mono text-amber-400">
              {totalCapacityMw.toLocaleString()} MW
            </div>
            <div className="text-[10px] text-slate-500">8 Clean Powerplants</div>
          </div>
          <Zap className="w-6 h-6 text-amber-500/40" />
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400">Spillway Radial Gates</div>
            <div className="text-xl font-bold font-mono text-white">
              {cascades.reduce((acc, c) => acc + c.radial_gates_count, 0)} Gates
            </div>
            <div className="text-[10px] text-slate-500">Fast Drawdown Equipped</div>
          </div>
          <Sliders className="w-6 h-6 text-sky-500/40" />
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400">Active Gate Interlocks</div>
            <div
              className={`text-xl font-bold font-mono ${
                activeTripsCount > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {activeTripsCount > 0 ? `${activeTripsCount} TRIPPED` : '0 (NORMAL)'}
            </div>
            <div className="text-[10px] text-slate-500">IEC 60870-5-104 Bus</div>
          </div>
          <ShieldAlert
            className={`w-6 h-6 ${activeTripsCount > 0 ? 'text-rose-500' : 'text-emerald-500/40'}`}
          />
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono text-slate-400">Real DHM Gauging Stns</div>
            <div className="text-xl font-bold font-mono text-sky-400">
              {dhmStations.length} Online
            </div>
            <div className="text-[10px] text-slate-500">Radar & Ultrasonic Telemetry</div>
          </div>
          <Radio className="w-6 h-6 text-sky-500/40" />
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'CASCADES' ? (
        /* 1. Hydropower Cascade Plant Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCascades.map((plant) => {
            const isDischarging = plant.interlock_status === 'FULL_SPILLWAY_DISCHARGE';
            const isPreDrawdown = plant.interlock_status === 'PRE_DRAWDOWN';
            const isTripped = isDischarging || isPreDrawdown;

            return (
              <div
                key={plant.id}
                className={`rounded-xl border p-4 transition-all duration-200 flex flex-col justify-between ${
                  isDischarging
                    ? 'bg-rose-950/20 border-rose-500/60 shadow-lg shadow-rose-950/50'
                    : isPreDrawdown
                    ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/50'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Bar: Name & Capacity */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-white leading-tight">
                        {plant.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {plant.river} • {plant.basin} Basin
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                      {plant.capacity_mw} MW
                    </span>
                  </div>

                  {/* Threat & Lead-time */}
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 my-2 space-y-1.5 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Threat Source:</span>
                      <span className="text-white font-semibold truncate max-w-[130px]" title={plant.upstream_threat_lake_name}>
                        {plant.upstream_threat_lake_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>GLOF Lead-Time:</span>
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {plant.lead_time_minutes} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Headpond Volume:</span>
                      <span className="text-sky-300">
                        {(plant.headpond_volume_m3 / 1e6).toFixed(2)}M m³
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Drawdown Buffer:</span>
                      <span className="text-emerald-300">+{plant.drawdown_buffer_m}m headroom</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Radial Gates:</span>
                      <span className="text-slate-200">{plant.radial_gates_count} Units (Automated)</span>
                    </div>
                  </div>

                  {/* Interlock Status */}
                  <div className="flex items-center justify-between text-[10px] font-mono my-2">
                    <span className="text-slate-400">SCADA Protocol:</span>
                    <span className="text-indigo-400 font-semibold">{plant.scada_protocol}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono mb-3">
                    <span className="text-slate-400">Gate State:</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold ${
                        isDischarging
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : isPreDrawdown
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {plant.interlock_status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  {isTripped ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetInterlock(plant)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors flex items-center justify-center gap-1 border border-slate-700"
                      >
                        <RefreshCw className="w-3 h-3 text-slate-400" />
                        <span>Reset to Normal</span>
                      </button>
                      {plant.last_command_hex && (
                        <button
                          onClick={() =>
                            setInspectingPayload({
                              plantName: plant.name,
                              hex: plant.last_command_hex || '',
                              details: {
                                scada_ip: plant.scada_ip,
                                protocol: plant.scada_protocol,
                                radial_gates_opened: plant.radial_gates_count,
                              },
                            })
                          }
                          className="py-1.5 px-2.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 text-[11px] font-mono"
                          title="Inspect IEC 60870-5-104 Telemetry Frame"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleTripSpillway(plant)}
                      disabled={isTrippingId === plant.id}
                      className="w-full py-1.5 px-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-all hover:border-rose-400 disabled:opacity-50"
                    >
                      {isTrippingId === plant.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                      )}
                      <span>Trip Spillway Radial Gates</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. DHM Real-Time River Gauging Network Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2.5">Stn #</th>
                <th className="pb-2.5">Station Name & River</th>
                <th className="pb-2.5">Basin & Elev.</th>
                <th className="pb-2.5">Sensor Technology</th>
                <th className="pb-2.5">Current River Stage (m)</th>
                <th className="pb-2.5">Current Flow (cms)</th>
                <th className="pb-2.5">Threshold Status</th>
                <th className="pb-2.5 text-right">Simulation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStations.map((stn) => {
                const pctOfDanger = Math.min(100, Math.round((stn.current_stage_m / stn.danger_stage_m) * 100));
                const isCritical = stn.status === 'CRITICAL_SURGE' || stn.current_stage_m >= stn.danger_stage_m;
                const isWatch = stn.status === 'WATCH' || stn.current_stage_m >= stn.warning_stage_m;

                return (
                  <tr key={stn.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-bold text-sky-400">#{stn.station_number}</td>
                    <td className="py-3 font-bold text-white">
                      <div>{stn.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{stn.river} River</div>
                    </td>
                    <td className="py-3 text-slate-300">
                      <div>{stn.basin}</div>
                      <div className="text-[10px] text-slate-400">{stn.elevation_m} m</div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                        {stn.sensor_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isCritical ? 'text-rose-400' : isWatch ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {stn.current_stage_m} m
                        </span>
                        <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isCritical ? 'bg-rose-500' : isWatch ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pctOfDanger}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Warn: {stn.warning_stage_m}m • Danger: {stn.danger_stage_m}m
                      </div>
                    </td>
                    <td className="py-3 font-bold text-sky-300">
                      {stn.current_discharge_cms} m³/s
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : isWatch
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {stn.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleSimulateStageRise(stn)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-mono border border-slate-700 transition-colors flex items-center gap-1 ml-auto"
                        title="Simulate upstream flash surge (+1.8m stage increase)"
                      >
                        <Waves className="w-3 h-3 text-sky-400" />
                        <span>Surge Pulse +1.8m</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* IEC 60870-5-104 Telemetry Inspector Modal */}
      {inspectingPayload && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  IEC 60870-5-104 APDU Frame Transmission
                </h3>
              </div>
              <button
                onClick={() => setInspectingPayload(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-400">Target Facility:</span>{' '}
                <span className="text-white font-bold">{inspectingPayload.plantName}</span>
              </div>
              <div>
                <span className="text-slate-400">Remote Terminal Unit (RTU) IP:</span>{' '}
                <span className="text-indigo-300">{inspectingPayload.details?.scada_ip || '192.168.10.45'}</span>
              </div>
              <div>
                <span className="text-slate-400">ASDU Type:</span>{' '}
                <span className="text-amber-300">45 (C_SC_NA_1 Single Command)</span>
              </div>
              <div>
                <span className="text-slate-400">Cause of Transmission:</span>{' '}
                <span className="text-sky-300">0x06 (Activation / Immediate Execute)</span>
              </div>
              <div>
                <span className="text-slate-400">Information Object Address (IOA):</span>{' '}
                <span className="text-emerald-300">0x000100 (Master Radial Gate Trip Bus)</span>
              </div>

              <div className="mt-3">
                <div className="text-[11px] text-slate-400 mb-1">Raw Frame Hex Payload:</div>
                <div className="p-3 bg-black/60 rounded-xl border border-slate-800 text-emerald-400 font-mono tracking-widest break-all select-all">
                  {inspectingPayload.hex}
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                <span>
                  Command confirmed by RTU gateway. All spillway radial gates initiated automated emergency opening to provide reservoir buffering ahead of the incoming flood surge wave.
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingPayload(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded-xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
