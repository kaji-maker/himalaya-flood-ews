'use client';

import React, { useState, useEffect } from 'react';
import { GlacierMap } from '@/components/map/GlacierMap';
import { AlertBanner } from '@/components/alerts/AlertBanner';
import { LakeDetailDrawer } from '@/components/drawer/LakeDetailDrawer';
import { StatCard } from '@/components/ui/StatCard';
import { RiskBadge } from '@/components/alerts/RiskBadge';
import { EnvironmentalTriggerHub } from '@/components/environmental/EnvironmentalTriggerHub';
import { LakeComparisonModal } from '@/components/satellite/LakeComparisonModal';
import { CueSlewTaskingConsole } from '@/components/satellite/CueSlewTaskingConsole';
import { GlacialLake, FloodAlert, ObservationPoint, PrecipitationPoint } from '@/types';
import {
  ShieldAlert,
  Mountain,
  TrendingUp,
  CloudRain,
  Layers,
  Search,
  Filter,
  ExternalLink,
  Clock,
  Satellite,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const NEPAL_GLACIAL_LAKES: GlacialLake[] = [
  {
    id: 'l-tsho-rolpa',
    icimod_code: 'PDGL_NEP_KOSHI_001',
    name: 'Tsho Rolpa Glacial Lake',
    basin_name: 'Koshi',
    sub_basin: 'Tama Koshi',
    elevation_m: 4580,
    initial_area_sqm: 1540000.0,
    current_area_sqm: 1820000.0,
    danger_level: 'CRITICAL', // Red
    centroid: { type: 'Point', coordinates: [86.475, 27.868] },
    freeboard_m: 12.5,
    moraine_slope_deg: 28.5,
    downstream_villages: ['Na', 'Bedding', 'Chhetchhet', 'Simigaon', 'Gongar Khola'],
    polygon_coordinates: [
      [
        [86.468, 27.855],
        [86.485, 27.862],
        [86.495, 27.873],
        [86.488, 27.881],
        [86.465, 27.876],
        [86.458, 27.864],
        [86.468, 27.855],
      ],
    ],
  },
  {
    id: 'l-imja-tsho',
    icimod_code: 'PDGL_NEP_KOSHI_002',
    name: 'Imja Tsho (Everest Region)',
    basin_name: 'Koshi',
    sub_basin: 'Dudh Koshi',
    elevation_m: 5010,
    initial_area_sqm: 1280000.0,
    current_area_sqm: 1460000.0,
    danger_level: 'HIGH', // Yellow
    centroid: { type: 'Point', coordinates: [86.924, 27.910] },
    freeboard_m: 14.2,
    moraine_slope_deg: 32.0,
    downstream_villages: ['Chhukung', 'Dingboche', 'Pangboche', 'Tengboche', 'Namche Bazaar'],
    polygon_coordinates: [
      [
        [86.910, 27.898],
        [86.932, 27.905],
        [86.940, 27.915],
        [86.928, 27.922],
        [86.905, 27.912],
        [86.910, 27.898],
      ],
    ],
  },
  {
    id: 'l-thulagi',
    icimod_code: 'PDGL_NEP_GANDAKI_001',
    name: 'Thulagi Lake (Manaslu)',
    basin_name: 'Gandaki',
    sub_basin: 'Marsyangdi',
    elevation_m: 4040,
    initial_area_sqm: 940000.0,
    current_area_sqm: 1040000.0,
    danger_level: 'HIGH', // Yellow
    centroid: { type: 'Point', coordinates: [84.532, 28.517] },
    freeboard_m: 22.0,
    moraine_slope_deg: 24.5,
    downstream_villages: ['Dharapani', 'Tal', 'Chamje', 'Jagat', 'Syange'],
    polygon_coordinates: [
      [
        [84.525, 28.505],
        [84.542, 28.512],
        [84.548, 28.524],
        [84.535, 28.530],
        [84.518, 28.518],
        [84.525, 28.505],
      ],
    ],
  },
  {
    id: 'l-lower-barun',
    icimod_code: 'PDGL_NEP_KOSHI_003',
    name: 'Lower Barun Lake',
    basin_name: 'Koshi',
    sub_basin: 'Barun / Arun',
    elevation_m: 4570,
    initial_area_sqm: 1720000.0,
    current_area_sqm: 1910000.0,
    danger_level: 'MEDIUM', // Yellow
    centroid: { type: 'Point', coordinates: [87.102, 27.808] },
    freeboard_m: 18.5,
    moraine_slope_deg: 35.0,
    downstream_villages: ['Yangkharca', 'Mumbuk', 'Tashigaon', 'Num'],
    polygon_coordinates: [
      [
        [87.085, 27.790],
        [87.112, 27.802],
        [87.125, 27.815],
        [87.108, 27.822],
        [87.080, 27.805],
        [87.085, 27.790],
      ],
    ],
  },
  {
    id: 'l-karnali-alpine',
    icimod_code: 'PDGL_NEP_KARNALI_001',
    name: 'Karnali High-Alpine Glacial Lake',
    basin_name: 'Karnali',
    sub_basin: 'Humla Karnali',
    elevation_m: 4920,
    initial_area_sqm: 680000.0,
    current_area_sqm: 695000.0,
    danger_level: 'LOW', // Green
    centroid: { type: 'Point', coordinates: [82.342, 29.893] },
    freeboard_m: 25.0,
    moraine_slope_deg: 19.5,
    downstream_villages: ['Simikot', 'Hilsa', 'Yari', 'Dharapuri'],
    polygon_coordinates: [
      [
        [82.335, 29.882],
        [82.350, 29.890],
        [82.355, 29.900],
        [82.342, 29.905],
        [82.328, 29.895],
        [82.335, 29.882],
      ],
    ],
  },
  {
    id: 'l-api-nampa',
    icimod_code: 'PDGL_NEP_MAHAKALI_001',
    name: 'Api Nampa Proglacial Lake',
    basin_name: 'Mahakali',
    sub_basin: 'Chameliya',
    elevation_m: 4750,
    initial_area_sqm: 420000.0,
    current_area_sqm: 428000.0,
    danger_level: 'LOW', // Green
    centroid: { type: 'Point', coordinates: [80.950, 29.980] },
    freeboard_m: 30.0,
    moraine_slope_deg: 16.0,
    downstream_villages: ['Khandeswari', 'Gokuleshwor', 'Darchula'],
    polygon_coordinates: [
      [
        [80.940, 29.970],
        [80.960, 29.975],
        [80.965, 29.988],
        [80.948, 29.992],
        [80.938, 29.982],
        [80.940, 29.970],
      ],
    ],
  },
];

const INITIAL_ALERTS: FloodAlert[] = [
  {
    id: 'alt-01',
    lake_id: 'l-tsho-rolpa',
    lake_name: 'Tsho Rolpa Glacial Lake',
    basin_name: 'Koshi',
    severity: 'EMERGENCY',
    trigger_reason: 'GLOF EMERGENCY Alert: Moraine crest pressure surge with +18.2% rapid expansion and 72h antecedent rainfall exceeding 142mm.',
    created_at: '2026-09-01T14:30:00.000Z',
    resolved_at: null,
    affected_villages: ['Na', 'Bedding', 'Chhetchhet', 'Simigaon', 'Gongar Khola'],
  },
  {
    id: 'alt-02',
    lake_id: 'l-imja-tsho',
    lake_name: 'Imja Tsho (Everest Region)',
    basin_name: 'Koshi',
    severity: 'WARNING',
    trigger_reason: 'GLOF WARNING Alert: Accelerated supraglacial calving expanding water perimeter toward terminal moraine face.',
    created_at: '2026-09-01T10:15:00.000Z',
    resolved_at: null,
    affected_villages: ['Dingboche', 'Pangboche', 'Tengboche', 'Namche Bazaar'],
  },
];

const MOCK_OBSERVATIONS: ObservationPoint[] = [
  { date: '2024-05-10', area_sqm: 1540000, area_sqkm: 1.540, sensor_name: 'Sentinel-2A MSI L2A', mean_mndwi: 0.65, cloud_cover_pct: 1.8 },
  { date: '2024-11-04', area_sqm: 1590000, area_sqkm: 1.590, sensor_name: 'Sentinel-2B MSI L2A', mean_mndwi: 0.68, cloud_cover_pct: 3.4 },
  { date: '2025-05-18', area_sqm: 1660000, area_sqkm: 1.660, sensor_name: 'Sentinel-2A MSI L2A', mean_mndwi: 0.70, cloud_cover_pct: 0.9 },
  { date: '2025-10-25', area_sqm: 1740000, area_sqkm: 1.740, sensor_name: 'Sentinel-2B MSI L2A', mean_mndwi: 0.72, cloud_cover_pct: 2.5 },
  { date: '2026-08-30', area_sqm: 1820000, area_sqkm: 1.820, sensor_name: 'Sentinel-2A MSI L2A', mean_mndwi: 0.76, cloud_cover_pct: 1.2 },
];

const MOCK_PRECIPITATION: PrecipitationPoint[] = [
  { timestamp: '2026-09-01T00:00:00Z', precip_mm: 4.2, accumulated_48h_mm: 12.5, sensor: 'GPM_IMERG_V07B' },
  { timestamp: '2026-09-01T06:00:00Z', precip_mm: 8.5, accumulated_48h_mm: 21.0, sensor: 'GPM_IMERG_V07B' },
  { timestamp: '2026-09-01T12:00:00Z', precip_mm: 16.4, accumulated_48h_mm: 37.4, sensor: 'GPM_IMERG_V07B' },
  { timestamp: '2026-09-01T18:00:00Z', precip_mm: 21.0, accumulated_48h_mm: 58.4, sensor: 'GPM_IMERG_V07B' },
];

export default function DashboardPage() {
  const [lakes, setLakes] = useState<GlacialLake[]>(NEPAL_GLACIAL_LAKES);
  const [alerts, setAlerts] = useState<FloodAlert[]>(INITIAL_ALERTS);
  const [selectedLake, setSelectedLake] = useState<GlacialLake | null>(null);
  const [lakeObservations, setLakeObservations] = useState<ObservationPoint[]>(MOCK_OBSERVATIONS);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [basinFilter, setBasinFilter] = useState<string>('ALL');
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState<boolean>(false);
  const [comparisonLakeTarget, setComparisonLakeTarget] = useState<{ id: string; name: string; code?: string }>({
    id: 'l-tsho-rolpa',
    name: 'Tsho Rolpa Glacial Lake',
    code: 'PDGL_NEP_KOSHI_001',
  });
  const [isCueSlewModalOpen, setIsCueSlewModalOpen] = useState<boolean>(false);

  // Fetch live lakes and alerts from PostGIS API
  useEffect(() => {
    async function fetchLiveData() {
      try {
        const [lakesRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE}/lakes`).catch(() => null),
          fetch(`${API_BASE}/alerts`).catch(() => null),
        ]);

        if (lakesRes && lakesRes.ok) {
          const lakesJson = await lakesRes.json();
          if (lakesJson?.data && Array.isArray(lakesJson.data) && lakesJson.data.length > 0) {
            setLakes((prev) =>
              lakesJson.data.map((l: any, idx: number) => {
                const match = prev.find((p) => p.icimod_code === l.icimod_code || p.name === l.name);
                return {
                  id: l.id || match?.id || `lake-${idx}`,
                  icimod_code: l.icimod_code || match?.icimod_code || `PDGL-${idx}`,
                  name: l.name || match?.name,
                  basin_name: l.basin_name || match?.basin_name || 'Koshi',
                  sub_basin: match?.sub_basin,
                  elevation_m: l.elevation_m || match?.elevation_m || 4500,
                  initial_area_sqm: Number(l.initial_area_sqm || match?.initial_area_sqm || 1000000),
                  current_area_sqm: Number(l.current_area_sqm || match?.current_area_sqm || 1150000),
                  danger_level: l.danger_level || match?.danger_level || 'LOW',
                  centroid: l.centroid || match?.centroid || { type: 'Point', coordinates: [86.5, 27.9] },
                  freeboard_m: match?.freeboard_m || 15.0,
                  moraine_slope_deg: match?.moraine_slope_deg || 25.0,
                  downstream_villages: match?.downstream_villages || ['Downstream Catchment'],
                  polygon_coordinates: match?.polygon_coordinates,
                };
              })
            );
          }
        }

        if (alertsRes && alertsRes.ok) {
          const alertsJson = await alertsRes.json();
          if (alertsJson?.data && Array.isArray(alertsJson.data) && alertsJson.data.length > 0) {
            setAlerts(alertsJson.data);
          }
        }
      } catch (err) {
        console.warn('API polling fallback to initial datasets:', err);
      }
    }

    fetchLiveData();
  }, []);

  // Fetch lake history upon lake selection
  const handleSelectLake = async (lake: GlacialLake) => {
    setSelectedLake(lake);
    setIsDrawerOpen(true);

    try {
      const res = await fetch(`${API_BASE}/lakes/${lake.icimod_code || lake.id}/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.time_series && data.time_series.length > 0) {
          setLakeObservations(data.time_series);
        }
      }
    } catch (e) {
      setLakeObservations(MOCK_OBSERVATIONS);
    }
  };

  const handleSelectLakeById = (lakeId: string) => {
    const found = lakes.find((l) => l.id === lakeId || l.icimod_code === lakeId);
    if (found) {
      handleSelectLake(found);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE}/alerts/${alertId}/resolve`, { method: 'PATCH' });
    } catch (e) {
      // Offline fallback
    }

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId ? { ...a, resolved_at: new Date().toISOString() } : a
      )
    );
  };

  const filteredLakes = lakes.filter((l) => {
    if (basinFilter === 'ALL') return true;
    return l.basin_name.toUpperCase() === basinFilter.toUpperCase();
  });

  const activeWarningsCount = alerts.filter(
    (a) => !a.resolved_at && (a.severity === 'EMERGENCY' || a.severity === 'WARNING')
  ).length;

  return (
    <div className="space-y-6">
      {/* 1. Real-time Warning & Emergency Banner across Nepal */}
      <AlertBanner
        alerts={alerts}
        onAcknowledge={handleAcknowledgeAlert}
        onSelectLakeById={handleSelectLakeById}
      />

      {/* 2. Top Telemetry KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Nepal GLOF Warnings"
          value={activeWarningsCount}
          subtitle="Real-time PostGIS dispatch"
          icon={<ShieldAlert className="w-5 h-5" />}
          highlightColor="red"
        />
        <StatCard
          title="Monitored High-Risk Lakes"
          value={lakes.length}
          subtitle="Sentinel-2 Optical (10m)"
          icon={<Mountain className="w-5 h-5" />}
          highlightColor="blue"
        />
        <StatCard
          title="Max Surface Area Surge"
          value="+18.2%"
          subtitle="Tsho Rolpa (Tama Koshi)"
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: "+4.2%", isPositive: false }}
          highlightColor="yellow"
        />
        <StatCard
          title="48h Upstream Rain"
          value="58.4 mm"
          subtitle="NASA GPM IMERG V07B"
          icon={<CloudRain className="w-5 h-5" />}
          highlightColor="blue"
        />
      </div>

      {/* 3. 3D Terrain Map Centered on Nepal */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Himalayan Glacial Lake 3D Monitoring Grid
            </h2>
            <p className="text-xs text-slate-400">
              Centered on Nepal (28.3949° N, 84.1240° E) • Click any lake pin to inspect detailed telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 20-Year Retrospective Launch Button */}
            <button
              onClick={() => {
                if (selectedLake) {
                  setComparisonLakeTarget({ id: selectedLake.id, name: selectedLake.name, code: selectedLake.icimod_code });
                }
                setIsComparisonModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 transition-all hover:border-cyan-400"
              title="Open Pan-Himalayan 20-Year Multi-Lake Satellite Comparison (2004-2026)"
            >
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>20-Yr Satellite Comparison</span>
            </button>

            {/* Autonomous Satellite Tasking & InSAR Button */}
            <button
              onClick={() => setIsCueSlewModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 transition-all hover:border-indigo-400"
              title="Autonomous High-Resolution Satellite Tasking (SkySat 0.5m) & InSAR Moraine Console"
            >
              <Satellite className="w-3.5 h-3.5 text-indigo-400" />
              <span>SkySat Tasking & InSAR</span>
            </button>

            {/* Basin Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 p-1 rounded-xl">
              {['ALL', 'KOSHI', 'GANDAKI', 'KARNALI', 'MAHAKALI'].map((b) => (
                <button
                  key={b}
                  onClick={() => setBasinFilter(b)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                    basinFilter === b
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        <GlacierMap
          lakes={filteredLakes}
          selectedLake={selectedLake}
          onSelectLake={handleSelectLake}
        />
      </div>

      {/* 4. Live Environmental Ingest & Seismic Trigger Hub */}
      <EnvironmentalTriggerHub
        onAlertCreated={(newAlert) =>
          setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)])
        }
        onSelectLakeById={handleSelectLakeById}
      />

      {/* 5. Monitored Glacial Lakes Directory & Status Table */}
      <div className="bg-himalaya-card border border-himalaya-border rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-himalaya-border">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Glacial Lake Catchments Directory ({filteredLakes.length} Monitored)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            CRS: EPSG:4326 (WGS84) / Metric Area: EPSG:32645
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-2.5">Glacial Lake</th>
                <th className="pb-2.5">ICIMOD Code</th>
                <th className="pb-2.5">River Basin</th>
                <th className="pb-2.5">Elevation</th>
                <th className="pb-2.5">Current Area</th>
                <th className="pb-2.5">Risk Rating</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLakes.map((lake) => {
                const isCritical = ['CRITICAL', 'EMERGENCY'].includes(lake.danger_level.toUpperCase());
                const isWatch = ['HIGH', 'MEDIUM', 'WATCH'].includes(lake.danger_level.toUpperCase());

                return (
                  <tr
                    key={lake.id}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    onClick={() => handleSelectLake(lake)}
                  >
                    <td className="py-3 font-bold text-white flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isCritical
                            ? 'bg-rose-500 animate-pulse'
                            : isWatch
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      {lake.name}
                    </td>
                    <td className="py-3 text-slate-400">{lake.icimod_code}</td>
                    <td className="py-3 text-slate-300">
                      {lake.basin_name} ({lake.sub_basin || 'Main'})
                    </td>
                    <td className="py-3 text-slate-300">{lake.elevation_m} m</td>
                    <td className="py-3 text-sky-400 font-bold">
                      {(lake.current_area_sqm / 1e6).toFixed(3)} km²
                    </td>
                    <td className="py-3">
                      <RiskBadge level={lake.danger_level} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setComparisonLakeTarget({ id: lake.id, name: lake.name, code: lake.icimod_code });
                            setIsComparisonModalOpen(true);
                          }}
                          className="px-2 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 rounded border border-cyan-500/40 text-[11px] font-mono transition-colors flex items-center gap-1"
                          title="20-Year Satellite Comparison (2004-2026)"
                        >
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>20-Yr Timelapse</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectLake(lake);
                          }}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-sky-400 hover:text-white rounded border border-blue-500/40 text-[11px] font-mono transition-colors"
                        >
                          Drawer →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Interactive Side Drawer */}
      <LakeDetailDrawer
        lake={selectedLake}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        observations={lakeObservations}
        precipitationData={MOCK_PRECIPITATION}
      />

      {/* 6. 20-Year Pan-Himalayan Satellite Comparison Modal */}
      <LakeComparisonModal
        lakeId={comparisonLakeTarget.id}
        lakeName={comparisonLakeTarget.name}
        icimodCode={comparisonLakeTarget.code}
        isOpen={isComparisonModalOpen}
        onClose={() => setIsComparisonModalOpen(false)}
      />

      {/* 7. Autonomous High-Resolution Satellite Tasking & InSAR Console */}
      <CueSlewTaskingConsole
        isOpen={isCueSlewModalOpen}
        onClose={() => setIsCueSlewModalOpen(false)}
        defaultLakeCode={selectedLake?.icimod_code || 'PDGL_NEP_KOSHI_001'}
      />
    </div>
  );
}
