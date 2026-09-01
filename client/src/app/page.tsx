'use client';

import React, { useState } from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { GlacierMap } from '@/components/map/GlacierMap';
import { RiskBadge } from '@/components/alerts/RiskBadge';
import { TimeSeriesAreaChart } from '@/components/charts/TimeSeriesAreaChart';
import { Lake, GLOFAlert } from '@/types';
import {
  ShieldAlert,
  Mountain,
  TrendingUp,
  CloudRain,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

const SAMPLE_LAKES: Lake[] = [
  {
    id: 'l1',
    glims_id: 'G086475E27885N',
    name: 'Tsho Rolpa',
    basin_id: 'b1',
    basin_code: 'KOSHI',
    sub_basin: 'Tama Koshi',
    elevation_m: 4580,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'VERY_HIGH',
    baseline_area_sqkm: 1.54,
    baseline_volume_mcm: 85.9,
    freeboard_m: 12.5,
    moraine_slope_deg: 28.5,
    downstream_settlements_count: 14,
    current_risk_score: 0.88,
    centroid: { type: 'Point', coordinates: [86.475, 27.868] },
  },
  {
    id: 'l2',
    glims_id: 'G086915E27902N',
    name: 'Imja Tsho',
    basin_id: 'b1',
    basin_code: 'KOSHI',
    sub_basin: 'Dudh Koshi',
    elevation_m: 5010,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'VERY_HIGH',
    baseline_area_sqkm: 1.28,
    baseline_volume_mcm: 75.8,
    freeboard_m: 14.2,
    moraine_slope_deg: 32.0,
    downstream_settlements_count: 19,
    current_risk_score: 0.82,
    centroid: { type: 'Point', coordinates: [86.924, 27.910] },
  },
  {
    id: 'l3',
    glims_id: 'G087095E27798N',
    name: 'Lower Barun Lake',
    basin_id: 'b1',
    basin_code: 'KOSHI',
    sub_basin: 'Barun / Arun',
    elevation_m: 4570,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'HIGH',
    baseline_area_sqkm: 1.72,
    baseline_volume_mcm: 92.0,
    freeboard_m: 18.5,
    moraine_slope_deg: 35.0,
    downstream_settlements_count: 8,
    current_risk_score: 0.74,
    centroid: { type: 'Point', coordinates: [87.102, 27.808] },
  },
  {
    id: 'l4',
    glims_id: 'G084534E28512N',
    name: 'Thulagi Lake',
    basin_id: 'b2',
    basin_code: 'GANDAKI',
    sub_basin: 'Marsyangdi',
    elevation_m: 4040,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'HIGH',
    baseline_area_sqkm: 0.94,
    baseline_volume_mcm: 35.3,
    freeboard_m: 22.0,
    moraine_slope_deg: 24.5,
    downstream_settlements_count: 11,
    current_risk_score: 0.68,
    centroid: { type: 'Point', coordinates: [84.532, 28.517] },
  },
  {
    id: 'l5',
    glims_id: 'G082342E29891N',
    name: 'Karnali High Lake',
    basin_id: 'b3',
    basin_code: 'KARNALI',
    sub_basin: 'Humla Karnali',
    elevation_m: 4920,
    dam_type: 'MORAINE_DAMMED',
    pdgl_status: 'MEDIUM',
    baseline_area_sqkm: 0.68,
    baseline_volume_mcm: 18.5,
    freeboard_m: 25.0,
    moraine_slope_deg: 19.5,
    downstream_settlements_count: 6,
    current_risk_score: 0.45,
    centroid: { type: 'Point', coordinates: [82.342, 29.893] },
  },
];

const SAMPLE_ALERTS: GLOFAlert[] = [
  {
    id: 'a1',
    alert_code: 'GLOF-2026-TSHOROLPA-01',
    lake_id: 'l1',
    lake_name: 'Tsho Rolpa',
    basin_code: 'KOSHI',
    alert_level: 'CRITICAL',
    risk_score: 0.88,
    headline: 'High Risk GLOF Alert: Tsho Rolpa Moraine Pressure Surge',
    description: 'Rapid lake expansion (+18.2% annualized) coupled with heavy antecedent 72h monsoon rainfall (142mm) indicates critical moraine crest breach risk.',
    triggers: {
      expansion_rate_pct_yr: 18.2,
      accumulated_72h_rain_mm: 142.0,
      freeboard_m: 12.5,
    },
    affected_villages: ['Na', 'Bedding', 'Chhetchhet', 'Simigaon', 'Gongar Khola'],
    status: 'ACTIVE',
    issued_at: '2026-09-01T16:30:00Z',
  },
];

const SAMPLE_OBSERVATIONS = [
  { date: '2023-05-10', area_sqkm: 1.38 },
  { date: '2023-10-15', area_sqkm: 1.42 },
  { date: '2024-04-20', area_sqkm: 1.46 },
  { date: '2024-11-05', area_sqkm: 1.51 },
  { date: '2025-05-12', area_sqkm: 1.59 },
  { date: '2025-10-22', area_sqkm: 1.68 },
  { date: '2026-08-30', area_sqkm: 1.78 },
];

export default function DashboardPage() {
  const [selectedLake, setSelectedLake] = useState<Lake>(SAMPLE_LAKES[0]);
  const [alerts, setAlerts] = useState<GLOFAlert[]>(SAMPLE_ALERTS);

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Telemetry & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active GLOF Alerts"
          value={alerts.filter((a) => a.status === 'ACTIVE').length}
          subtitle="1 Critical, 0 Watch"
          icon={<ShieldAlert className="w-5 h-5" />}
          highlightColor="red"
        />
        <StatCard
          title="High-Risk Glacial Lakes"
          value={SAMPLE_LAKES.length}
          subtitle="Monitored via Sentinel-2"
          icon={<Mountain className="w-5 h-5" />}
          highlightColor="blue"
        />
        <StatCard
          title="Max Expansion Rate"
          value="+18.2%"
          subtitle="Annualized growth (Tsho Rolpa)"
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: "+4.5%", isPositive: false }}
          highlightColor="yellow"
        />
        <StatCard
          title="72h Peak Rainfall"
          value="142 mm"
          subtitle="NASA GPM (Tama Koshi)"
          icon={<CloudRain className="w-5 h-5" />}
          highlightColor="blue"
        />
      </div>

      {/* Critical Early Warning Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-rose-600/30 rounded-xl border border-rose-500/50 text-rose-300 shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <RiskBadge level={alerts[0].alert_level} size="sm" />
                  <span className="text-xs font-mono text-slate-400">
                    {alerts[0].alert_code} • {alerts[0].basin_code} Basin
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {alerts[0].headline}
                </h3>
                <p className="text-xs text-rose-200/80 mt-1 max-w-3xl">
                  {alerts[0].description}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {alerts[0].affected_villages.map((v, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-rose-900/60 text-rose-200 px-2 py-0.5 rounded border border-rose-700/50 font-mono"
                    >
                      📍 {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              {alerts[0].status === 'ACTIVE' ? (
                <button
                  onClick={() => handleAcknowledgeAlert(alerts[0].id)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Acknowledge Warning
                </button>
              ) : (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  ✓ Acknowledged
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Geospatial Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Pan-Himalaya Glacial Lake Monitoring Grid
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            CRS: EPSG:4326 (WGS84) • Spatial Extent: 80.0°E - 89.0°E
          </span>
        </div>
        <GlacierMap
          lakes={SAMPLE_LAKES}
          selectedLake={selectedLake}
          onSelectLake={(lake) => setSelectedLake(lake)}
        />
      </div>

      {/* Bottom Section: Glacial Lake Watchlist & Surface Area Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Watchlist Panel */}
        <div className="lg:col-span-1 bg-himalaya-card border border-himalaya-border rounded-2xl p-5">
          <div className="flex items-center justify-between pb-3 border-b border-himalaya-border mb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Priority Glacial Lakes
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {SAMPLE_LAKES.length} Tracked
            </span>
          </div>

          <div className="space-y-2.5">
            {SAMPLE_LAKES.map((lake) => {
              const isSelected = selectedLake?.id === lake.id;
              return (
                <div
                  key={lake.id}
                  onClick={() => setSelectedLake(lake)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500/50 shadow-md'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      {lake.name}
                    </h4>
                    <RiskBadge level={lake.pdgl_status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1">
                    <span>{lake.sub_basin}</span>
                    <span>{lake.elevation_m} m</span>
                    <span className={lake.current_risk_score >= 0.7 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      Score: {lake.current_risk_score.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Lake Detailed Surface Growth Chart */}
        <div className="lg:col-span-2 space-y-4">
          <TimeSeriesAreaChart
            data={SAMPLE_OBSERVATIONS}
            lakeName={selectedLake.name}
            baselineArea={selectedLake.baseline_area_sqkm}
          />

          {/* Lake Parameters Breakdown */}
          <div className="bg-himalaya-card border border-himalaya-border rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Dam Geometry</span>
              <span className="text-slate-200 font-bold mt-1 block">{selectedLake.dam_type}</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Moraine Freeboard</span>
              <span className="text-slate-200 font-bold mt-1 block">{selectedLake.freeboard_m} m</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Moraine Slope</span>
              <span className="text-slate-200 font-bold mt-1 block">{selectedLake.moraine_slope_deg}°</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Downstream Settlements</span>
              <span className="text-slate-200 font-bold mt-1 block">{selectedLake.downstream_settlements_count} Villages</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
