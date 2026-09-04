'use client';

import React, { useState } from 'react';
import { HISTORICAL_GLOFS } from '@/data/historicalGlofs';
import { HistoricalGLOFRecord } from '@/types';
import {
  History,
  AlertTriangle,
  Waves,
  Mountain,
  Compass,
  ArrowUpRight,
  Filter,
  Layers,
  ChevronRight,
  Clock,
  ShieldAlert,
  Info,
  ExternalLink,
  MapPin,
  Flame,
  Activity,
  Calendar,
} from 'lucide-react';

interface HistoricalGlofPanelProps {
  onFocusLocation?: (coords: [number, number], zoom?: number) => void;
}

export const HistoricalGlofPanel: React.FC<HistoricalGlofPanelProps> = ({ onFocusLocation }) => {
  const [selectedEvent, setSelectedEvent] = useState<HistoricalGLOFRecord | null>(null);
  const [selectedBasin, setSelectedBasin] = useState<string>('ALL');
  const [selectedTrigger, setSelectedTrigger] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'year' | 'discharge' | 'volume'>('year');

  const filteredEvents = HISTORICAL_GLOFS.filter((event) => {
    const matchBasin =
      selectedBasin === 'ALL' ||
      event.basin.toLowerCase().includes(selectedBasin.toLowerCase()) ||
      (selectedBasin === 'TRANSBOUNDARY' && (event.country_region.includes('Tibet') || event.country_region.includes('Sikkim') || event.country_region.includes('Bhutan')));

    const matchTrigger =
      selectedTrigger === 'ALL' || event.trigger_mechanism === selectedTrigger;

    const matchSearch =
      searchQuery === '' ||
      event.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.lake_or_glacier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.river.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.country_region.toLowerCase().includes(searchQuery.toLowerCase());

    return matchBasin && matchTrigger && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'year') return b.year - a.year;
    if (sortBy === 'discharge') return b.peak_discharge_cms - a.peak_discharge_cms;
    if (sortBy === 'volume') return b.estimated_volume_m3 - a.estimated_volume_m3;
    return 0;
  });

  const totalDischarge = HISTORICAL_GLOFS.reduce((sum, e) => sum + e.peak_discharge_cms, 0);
  const totalVolume = HISTORICAL_GLOFS.reduce((sum, e) => sum + e.estimated_volume_m3, 0);
  const totalFatalities = HISTORICAL_GLOFS.reduce((sum, e) => sum + e.fatalities, 0);

  const getTriggerBadge = (trigger: string) => {
    switch (trigger) {
      case 'ICE_AVALANCHE':
        return { label: 'Ice Avalanche', color: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60' };
      case 'MORAINE_COLLAPSE':
        return { label: 'Moraine Collapse', color: 'bg-amber-950/80 text-amber-400 border-amber-800/60' };
      case 'PIPING_FAILURE':
        return { label: 'Piping Failure', color: 'bg-violet-950/80 text-violet-400 border-violet-800/60' };
      case 'EXTREME_CLOUDBURST':
        return { label: 'Cloudburst & Slump', color: 'bg-blue-950/80 text-blue-400 border-blue-800/60' };
      case 'ROCK_ICE_DETACHMENT':
        return { label: 'Rock-Ice Detachment', color: 'bg-rose-950/80 text-rose-400 border-rose-800/60' };
      default:
        return { label: trigger, color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>Documented Disasters</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">{HISTORICAL_GLOFS.length} Events</div>
          <div className="text-[10px] text-slate-500 mt-0.5">1981 – 2026 Cryospheric Record</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Waves className="w-3.5 h-3.5 text-rose-400" />
            <span>Max Historic Discharge</span>
          </div>
          <div className="text-xl font-bold text-rose-400 font-mono">16,000 m³/s</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cirenmaco / Poiqu 1981</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Mountain className="w-3.5 h-3.5 text-amber-400" />
            <span>Total Flood Mass</span>
          </div>
          <div className="text-xl font-bold text-amber-300 font-mono">
            {(totalVolume / 1e6).toFixed(1)}M m³
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Water & Pulverized Permafrost</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
            <span>Documented Fatalities</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">{totalFatalities.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across Nepal, India & Tibet</div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Basin:</span>
          </div>
          {['ALL', 'Koshi', 'Gandaki', 'Karnali', 'TRANSBOUNDARY'].map((b) => (
            <button
              key={b}
              onClick={() => setSelectedBasin(b)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                selectedBasin === b
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {b === 'TRANSBOUNDARY' ? 'Transboundary' : b}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search event, river, glacier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full md:w-56"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="year">Sort: Year</option>
            <option value="discharge">Sort: Peak Discharge</option>
            <option value="volume">Sort: Flood Volume</option>
          </select>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEvents.map((event) => {
          const badge = getTriggerBadge(event.trigger_mechanism);
          const isSelected = selectedEvent?.id === event.id;

          return (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? 'bg-blue-950/40 border-blue-500/80 shadow-lg ring-1 ring-blue-500/50'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-blue-400">{event.year}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{event.basin} Basin</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-100">{event.event_name}</h4>
                  <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                    <span>{event.river} • {event.country_region}</span>
                  </div>
                </div>

                {onFocusLocation && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocusLocation(event.coordinates, 11);
                    }}
                    title="Focus on Map"
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-blue-600 transition-colors shrink-0"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Metrics bar */}
              <div className="grid grid-cols-3 gap-2 py-2 my-2 border-y border-slate-800/80 bg-slate-950/40 rounded-lg px-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-500">Peak Discharge</div>
                  <div className="text-xs font-bold text-rose-400 font-mono">
                    {event.peak_discharge_cms.toLocaleString()} m³/s
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Breach Volume</div>
                  <div className="text-xs font-bold text-sky-400 font-mono">
                    {(event.estimated_volume_m3 / 1e6).toFixed(1)}M m³
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Reach / Deaths</div>
                  <div className="text-xs font-bold text-slate-300 font-mono">
                    {event.downstream_impact_km}km / {event.fatalities}
                  </div>
                </div>
              </div>

              {/* Snippet */}
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {event.infrastructure_impact}
              </p>

              <div className="mt-3 flex items-center justify-between text-[11px] text-blue-400 font-medium">
                <span>View Forensic Breach Analysis</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Event Forensic Modal / Detail Drawer */}
      {selectedEvent && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-500/40 shadow-2xl relative">
          <button
            onClick={() => setSelectedEvent(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-white text-xs px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700"
          >
            Close Forensic View
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-rose-950 text-rose-400 border border-rose-800/60 rounded-full text-xs font-semibold">
              Historical Breach Archive
            </span>
            <span className="text-xs text-slate-400 font-mono">Date: {selectedEvent.event_date}</span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1">{selectedEvent.event_name}</h3>
          <p className="text-xs text-slate-400 mb-4">
            Source: <span className="text-slate-200">{selectedEvent.lake_or_glacier}</span> ({selectedEvent.river}, {selectedEvent.country_region})
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Trigger Mechanism</div>
              <div className="text-xs font-semibold text-amber-400 mt-0.5">
                {getTriggerBadge(selectedEvent.trigger_mechanism).label}
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Peak Surge Discharge</div>
              <div className="text-xs font-semibold text-rose-400 font-mono mt-0.5">
                {selectedEvent.peak_discharge_cms.toLocaleString()} m³/s
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Released Water Volume</div>
              <div className="text-xs font-semibold text-sky-400 font-mono mt-0.5">
                {(selectedEvent.estimated_volume_m3 / 1e6).toFixed(2)} Million m³
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase">Downstream Propagation</div>
              <div className="text-xs font-semibold text-emerald-400 font-mono mt-0.5">
                {selectedEvent.downstream_impact_km} km Runout
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Infrastructure & Humanitarian Impact
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedEvent.infrastructure_impact}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-300 mb-1">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Hydraulic Failure Mechanics & Early Warning Takeaways
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedEvent.key_findings}
              </p>
            </div>
          </div>

          {onFocusLocation && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => onFocusLocation(selectedEvent.coordinates, 12)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg transition-all"
              >
                <Compass className="w-4 h-4" />
                <span>Fly to Breach Coordinates [{selectedEvent.coordinates.join(', ')}]</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
