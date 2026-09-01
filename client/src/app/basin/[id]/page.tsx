'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { GlacierMap } from '@/components/map/GlacierMap';
import { StatCard } from '@/components/ui/StatCard';
import { RiskBadge } from '@/components/alerts/RiskBadge';
import { Mountain, Droplet, CloudRain, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Lake } from '@/types';

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
};

const BASIN_LAKES: Record<string, Lake[]> = {
  koshi: [
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
  ],
  gandaki: [
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
  ],
  karnali: [
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
  ],
};

export default function BasinDetailPage() {
  const params = useParams();
  const basinId = ((params?.id as string) || 'koshi').toLowerCase();
  const info = BASIN_METRICS[basinId] || BASIN_METRICS.koshi;
  const lakes = BASIN_LAKES[basinId] || BASIN_LAKES.koshi;

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
        <GlacierMap lakes={lakes} basinCode={basinId.toUpperCase()} />
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
                <th className="pb-2">Dam Type</th>
                <th className="pb-2">GLOF Status</th>
                <th className="pb-2">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lakes.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 font-bold text-white">{l.name}</td>
                  <td className="py-2.5 text-slate-300">{l.sub_basin}</td>
                  <td className="py-2.5 text-slate-300">{l.elevation_m} m</td>
                  <td className="py-2.5 text-slate-300">{l.baseline_area_sqkm} km²</td>
                  <td className="py-2.5 text-slate-400">{l.dam_type}</td>
                  <td className="py-2.5">
                    <RiskBadge level={l.pdgl_status} size="sm" />
                  </td>
                  <td className="py-2.5">
                    <span className={l.current_risk_score >= 0.7 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {l.current_risk_score.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
