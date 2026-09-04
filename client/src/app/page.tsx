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
import { HydropowerCascadePanel } from '@/components/hydropower/HydropowerCascadePanel';
import { HistoricalGlofPanel } from '@/components/historical/HistoricalGlofPanel';
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
  Zap,
  History,
  LayoutGrid,
  Activity,
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
    danger_level: 'CRITICAL',
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
    danger_level: 'HIGH',
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
    id: 'l-lower-barun',
    icimod_code: 'PDGL_NEP_KOSHI_003',
    name: 'Lower Barun Lake',
    basin_name: 'Koshi',
    sub_basin: 'Barun / Arun',
    elevation_m: 4570,
    initial_area_sqm: 1720000.0,
    current_area_sqm: 1910000.0,
    danger_level: 'HIGH',
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
    id: 'l-lumding',
    icimod_code: 'PDGL_NEP_KOSHI_004',
    name: 'Lumding Tsho',
    basin_name: 'Koshi',
    sub_basin: 'Lumding / Dudh Koshi',
    elevation_m: 4870,
    initial_area_sqm: 1050000.0,
    current_area_sqm: 1150000.0,
    danger_level: 'HIGH',
    centroid: { type: 'Point', coordinates: [86.612, 27.765] },
    freeboard_m: 16.0,
    moraine_slope_deg: 30.5,
    downstream_villages: ['Lumding Kharka', 'Ghat', 'Phakding', 'Lukla'],
    polygon_coordinates: [
      [
        [86.602, 27.755],
        [86.620, 27.760],
        [86.625, 27.772],
        [86.615, 27.778],
        [86.600, 27.768],
        [86.602, 27.755],
      ],
    ],
  },
  {
    id: 'l-chamlang',
    icimod_code: 'PDGL_NEP_KOSHI_005',
    name: 'Chamlang Tsho (Hongu-2)',
    basin_name: 'Koshi',
    sub_basin: 'Hongu Valley',
    elevation_m: 5200,
    initial_area_sqm: 910000.0,
    current_area_sqm: 980000.0,
    danger_level: 'HIGH',
    centroid: { type: 'Point', coordinates: [86.974, 27.782] },
    freeboard_m: 15.0,
    moraine_slope_deg: 33.0,
    downstream_villages: ['Khare', 'Kote', 'Chetarwa', 'Bung'],
    polygon_coordinates: [
      [
        [86.965, 27.774],
        [86.982, 27.778],
        [86.988, 27.788],
        [86.978, 27.794],
        [86.962, 27.785],
        [86.965, 27.774],
      ],
    ],
  },
  {
    id: 'l-dig-tsho',
    icimod_code: 'PDGL_NEP_KOSHI_006',
    name: 'Dig Tsho (1985 Breach Benchmark)',
    basin_name: 'Koshi',
    sub_basin: 'Bhote Koshi / Langmoche',
    elevation_m: 4365,
    initial_area_sqm: 680000.0,
    current_area_sqm: 720000.0,
    danger_level: 'MEDIUM',
    centroid: { type: 'Point', coordinates: [86.584, 27.876] },
    freeboard_m: 21.0,
    moraine_slope_deg: 26.0,
    downstream_villages: ['Langmoche', 'Thame', 'Mende', 'Namche'],
    polygon_coordinates: [
      [
        [86.575, 27.868],
        [86.592, 27.872],
        [86.596, 27.882],
        [86.586, 27.888],
        [86.572, 27.879],
        [86.575, 27.868],
      ],
    ],
  },
  {
    id: 'l-galong-co',
    icimod_code: 'PDGL_NEP_KOSHI_007',
    name: 'Galong Co / Cirenmaco (Poiqu Transboundary)',
    basin_name: 'Koshi',
    sub_basin: 'Bhote Koshi Corridor',
    elevation_m: 4380,
    initial_area_sqm: 1580000.0,
    current_area_sqm: 1640000.0,
    danger_level: 'CRITICAL',
    centroid: { type: 'Point', coordinates: [85.996, 28.084] },
    freeboard_m: 11.0,
    moraine_slope_deg: 34.0,
    downstream_villages: ['Zhangmu / Kodari', 'Tatopani', 'Liping', 'Barhabise'],
    polygon_coordinates: [
      [
        [85.985, 28.075],
        [86.005, 28.080],
        [86.012, 28.092],
        [85.998, 28.098],
        [85.982, 28.088],
        [85.985, 28.075],
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
    danger_level: 'HIGH',
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
    id: 'l-birendra',
    icimod_code: 'PDGL_NEP_GANDAKI_002',
    name: 'Birendra Lake (April 2024 Avalanche Benchmark)',
    basin_name: 'Gandaki',
    sub_basin: 'Budhi Gandaki',
    elevation_m: 3620,
    initial_area_sqm: 350000.0,
    current_area_sqm: 380000.0,
    danger_level: 'CRITICAL',
    centroid: { type: 'Point', coordinates: [84.638, 28.563] },
    freeboard_m: 8.5,
    moraine_slope_deg: 38.0,
    downstream_villages: ['Samagaun', 'Lho', 'Namrung', 'Prok', 'Jagat'],
    polygon_coordinates: [
      [
        [84.630, 28.558],
        [84.644, 28.561],
        [84.648, 28.569],
        [84.639, 28.572],
        [84.628, 28.566],
        [84.630, 28.558],
      ],
    ],
  },
  {
    id: 'l-kaldang',
    icimod_code: 'PDGL_NEP_GANDAKI_003',
    name: 'Kaldang Lake (Langtang)',
    basin_name: 'Gandaki',
    sub_basin: 'Trishuli Basin',
    elevation_m: 4710,
    initial_area_sqm: 590000.0,
    current_area_sqm: 620000.0,
    danger_level: 'MEDIUM',
    centroid: { type: 'Point', coordinates: [85.485, 28.215] },
    freeboard_m: 24.0,
    moraine_slope_deg: 22.0,
    downstream_villages: ['Langtang Village', 'Kyanjin', 'Bamboo', 'Syabrubesi', 'Dhunche'],
    polygon_coordinates: [
      [
        [85.476, 28.208],
        [85.492, 28.212],
        [85.498, 28.222],
        [85.488, 28.228],
        [85.474, 28.219],
        [85.476, 28.208],
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
    danger_level: 'LOW',
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
    id: 'l-rara-headwater',
    icimod_code: 'PDGL_NEP_KARNALI_002',
    name: 'Rara Headwater Glacial Lake',
    basin_name: 'Karnali',
    sub_basin: 'Mugu Karnali',
    elevation_m: 4650,
    initial_area_sqm: 510000.0,
    current_area_sqm: 540000.0,
    danger_level: 'LOW',
    centroid: { type: 'Point', coordinates: [82.115, 29.542] },
    freeboard_m: 28.0,
    moraine_slope_deg: 18.0,
    downstream_villages: ['Gamgadhi', 'Rara', 'Pina', 'Soru'],
    polygon_coordinates: [
      [
        [82.106, 29.535],
        [82.122, 29.540],
        [82.126, 29.548],
        [82.118, 29.552],
        [82.105, 29.545],
        [82.106, 29.535],
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
    danger_level: 'LOW',
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
  {
    id: 'l-south-lhonak',
    icimod_code: 'PDGL_IND_SIKKIM_001',
    name: 'South Lhonak Lake (Oct 2023 Benchmark)',
    basin_name: 'Koshi',
    sub_basin: 'Teesta Corridor Anchor',
    elevation_m: 5200,
    initial_area_sqm: 810000.0,
    current_area_sqm: 840000.0,
    danger_level: 'CRITICAL',
    centroid: { type: 'Point', coordinates: [88.196, 27.912] },
    freeboard_m: 9.0,
    moraine_slope_deg: 36.5,
    downstream_villages: ['Chungthang', 'Mangan', 'Singtam', 'Rangpo'],
    polygon_coordinates: [
      [
        [88.185, 27.905],
        [88.204, 27.909],
        [88.210, 27.918],
        [88.199, 27.922],
        [88.182, 27.914],
        [88.185, 27.905],
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
  const [viewMode, setViewMode] = useState<'ALL' | 'MAP' | 'HYDRO' | 'HISTORIC' | 'ENVIRONMENTAL' | 'DIRECTORY'>('ALL');

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
    const found = lakes.find(
      (l) =>
        l.id === lakeId ||
        l.icimod_code === lakeId ||
        l.name.toLowerCase() === lakeId.toLowerCase() ||
        lakeId.toLowerCase().includes(l.name.toLowerCase())
    ) || lakes[0];
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

      {/* Executive Operations Navigation Bar */}
      <div className="sticky top-16 z-30 backdrop-blur-md bg-slate-900/90 border border-slate-800/90 rounded-2xl p-1.5 shadow-2xl flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-2.5 hidden sm:inline-block">
            Console View:
          </span>
          {[
            { id: 'ALL', label: 'All Modules', icon: LayoutGrid, count: null },
            { id: 'MAP', label: '3D Glacier Grid', icon: Mountain, count: filteredLakes.length },
            { id: 'ENVIRONMENTAL', label: 'Cryosphere Triggers', icon: CloudRain, count: null },
            { id: 'HYDRO', label: 'Cascade Defense', icon: Zap, count: '6 Dams' },
            { id: 'HISTORIC', label: 'Breach Archive', icon: History, count: '11 GLOFs' },
            { id: 'DIRECTORY', label: 'Catchments Directory', icon: Layers, count: filteredLakes.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40 border border-blue-400/40 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 px-3 py-1 bg-slate-950/60 rounded-xl border border-slate-800/80">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-slate-300 font-medium">Ops Active:</span>
          <span className="text-cyan-400 font-bold">{filteredLakes.length} High-Risk Basins</span>
        </div>
      </div>

      {/* 3. 3D Terrain Map Centered on Nepal */}
      {(viewMode === 'ALL' || viewMode === 'MAP') && (
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
      )}

      {/* 4. Live Environmental Ingest & Seismic Trigger Hub */}
      {(viewMode === 'ALL' || viewMode === 'ENVIRONMENTAL') && (
        <EnvironmentalTriggerHub
          onAlertCreated={(newAlert) =>
            setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)])
          }
          onSelectLakeById={handleSelectLakeById}
        />
      )}

      {/* 5. Hydropower Cascade Defense & SCADA Interlock Registry */}
      {(viewMode === 'ALL' || viewMode === 'HYDRO') && (
        <HydropowerCascadePanel />
      )}

      {/* 6. Historical GLOF Breach Archive & Forensic Hindcast Benchmark */}
      {(viewMode === 'ALL' || viewMode === 'HISTORIC') && (
        <div className="bg-himalaya-card border border-himalaya-border rounded-2xl p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-himalaya-border gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-orange-950/70 border border-orange-500/40 text-orange-400">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Historical GLOF & Flash Flood Breach Archive
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Empirical Hindcast Catalog of 11 Landmark Himalayan Cryospheric Catastrophes (1981 – 2026)
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
              Validated by ICIMOD & Nepal DHM
            </span>
          </div>
          <HistoricalGlofPanel
            onFocusLocation={(coords) => {
              window.scrollTo({ top: 380, behavior: 'smooth' });
            }}
          />
        </div>
      )}

      {/* 7. Monitored Glacial Lakes Directory & Status Table */}
      {(viewMode === 'ALL' || viewMode === 'DIRECTORY') && (
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
      )}

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
