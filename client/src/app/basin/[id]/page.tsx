'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { GlacierMap } from '@/components/map/GlacierMap';
import { StatCard } from '@/components/ui/StatCard';
import { RiskBadge } from '@/components/alerts/RiskBadge';
import { LakeDetailDrawer } from '@/components/drawer/LakeDetailDrawer';
import { Mountain, Droplet, CloudRain, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { GlacialLake } from '@/types';

const BASIN_METRICS: Record<string, { name: string; area: string; glaciers: number; highRiskLakes: number; description: string }> = {
  koshi: {
    name: 'Koshi River Basin',
    area: '74,500 km²',
    glaciers: 2168,
    highRiskLakes: 3,
    description: 'Eastern Himalaya sub-basin containing highest concentration of high-hazard moraine-dammed glacial lakes (Tsho Rolpa, Imja Tsho, Lower Barun).',
  },
  gandaki: {
    name: 'Gandaki (Narayani) Basin',
    area: '46,300 km²',
    glaciers: 1719,
    highRiskLakes: 1,
    description: 'Central Nepal basin encompassing the Annapurna and Manaslu glacier systems, including the Thulagi glacial lake.',
  },
  karnali: {
    name: 'Karnali River Basin',
    area: '44,000 km²',
    glaciers: 1361,
    highRiskLakes: 1,
    description: 'Western Nepal basin with high-altitude alpine headwaters flowing from the Tibetan plateau border regions.',
  },
  mahakali: {
    name: 'Mahakali River Basin',
    area: '15,260 km²',
    glaciers: 454,
    highRiskLakes: 1,
    description: 'Far-Western Nepal basin bordering Uttarakhand, India, draining the Api-Nampa mountain range.',
  },
};

const BASIN_LAKES: Record<string, GlacialLake[]> = {
  koshi: [
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
      danger_level: 'MEDIUM',
      centroid: { type: 'Point', coordinates: [87.102, 27.808] },
      freeboard_m: 18.5,
      moraine_slope_deg: 35.0,
      downstream_villages: ['Yangkharca', 'Mumbuk', 'Tashigaon', 'Num'],
    },
  ],
  gandaki: [
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
    },
  ],
  karnali: [
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
    },
  ],
  mahakali: [
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
    },
  ],
};

export default function BasinDetailPage() {
  const params = useParams();
  const basinId = ((params?.id as string) || 'koshi').toLowerCase();
  const info = BASIN_METRICS[basinId] || BASIN_METRICS.koshi;
  const lakes = BASIN_LAKES[basinId] || BASIN_LAKES.koshi;

  const [selectedLake, setSelectedLake] = useState<GlacialLake | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const handleSelectLake = (lake: GlacialLake) => {
    setSelectedLake(lake);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/"
            className="text-xs text-sky-400 hover:underline flex items-center gap-1 mb-1 font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Pan-Himalaya Overview
          </Link>
          <h1 className="text-2xl font-bold text-white">{info.name}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">{info.description}</p>
        </div>
        <span className="text-xs font-mono uppercase bg-blue-500/20 text-blue-300 border border-blue-500/40 px-3 py-1.5 rounded-lg">
          Basin Code: {basinId.toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Catchment Drainage Area"
          value={info.area}
          icon={<Droplet className="w-5 h-5" />}
          highlightColor="blue"
        />
        <StatCard
          title="Upstream Glaciers"
          value={info.glaciers}
          icon={<Mountain className="w-5 h-5" />}
          highlightColor="blue"
        />
        <StatCard
          title="Monitored High-Risk Lakes"
          value={info.highRiskLakes}
          icon={<ShieldCheck className="w-5 h-5" />}
          highlightColor="red"
        />
        <StatCard
          title="Basin Telemetry"
          value="Online"
          subtitle="GPM IMERG 30-min feeds"
          icon={<CloudRain className="w-5 h-5" />}
          highlightColor="emerald"
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          {info.name} Glacial Lake Geometry & Sentinel-2 Extractions
        </h2>
        <GlacierMap lakes={lakes} onSelectLake={handleSelectLake} basinName={info.name} />
      </div>

      <div className="bg-himalaya-card border border-himalaya-border rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">
          Basin Lake Inventory ({lakes.length} High-Risk Lakes)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-himalaya-border text-slate-400">
                <th className="pb-2">Glacial Lake</th>
                <th className="pb-2">Sub-Basin</th>
                <th className="pb-2">Elevation</th>
                <th className="pb-2">Surface Area</th>
                <th className="pb-2">GLOF Status</th>
                <th className="pb-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lakes.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-slate-800/40 cursor-pointer"
                  onClick={() => handleSelectLake(l)}
                >
                  <td className="py-2.5 font-bold text-white">{l.name}</td>
                  <td className="py-2.5 text-slate-300">{l.sub_basin}</td>
                  <td className="py-2.5 text-slate-300">{l.elevation_m} m</td>
                  <td className="py-2.5 text-sky-400 font-bold">
                    {(l.current_area_sqm / 1e6).toFixed(3)} km²
                  </td>
                  <td className="py-2.5">
                    <RiskBadge level={l.danger_level} size="sm" />
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectLake(l);
                      }}
                      className="px-2 py-0.5 bg-blue-600/20 text-sky-400 rounded border border-blue-500/30 text-[11px]"
                    >
                      Inspect →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Drawer for Basin View */}
      <LakeDetailDrawer
        lake={selectedLake}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        observations={[
          { date: '2024-05-10', area_sqm: 1540000, area_sqkm: 1.540, sensor_name: 'Sentinel-2A MSI L2A', mean_mndwi: 0.65, cloud_cover_pct: 1.8 },
          { date: '2024-11-04', area_sqm: 1590000, area_sqkm: 1.590, sensor_name: 'Sentinel-2B MSI L2A', mean_mndwi: 0.68, cloud_cover_pct: 3.4 },
          { date: '2025-05-18', area_sqm: 1660000, area_sqkm: 1.660, sensor_name: 'Sentinel-2A MSI L2A', mean_mndwi: 0.70, cloud_cover_pct: 0.9 },
          { date: '2026-08-30', area_sqm: 1820000, area_sqkm: 1.820, sensor_name: 'Sentinel-2A MSI L2A', mean_mndwi: 0.76, cloud_cover_pct: 1.2 },
        ]}
        precipitationData={[
          { timestamp: '2026-09-01T00:00:00Z', precip_mm: 4.2, accumulated_48h_mm: 12.5, sensor: 'GPM_IMERG_V07B' },
          { timestamp: '2026-09-01T12:00:00Z', precip_mm: 16.4, accumulated_48h_mm: 37.4, sensor: 'GPM_IMERG_V07B' },
          { timestamp: '2026-09-01T18:00:00Z', precip_mm: 21.0, accumulated_48h_mm: 58.4, sensor: 'GPM_IMERG_V07B' },
        ]}
      />
    </div>
  );
}
