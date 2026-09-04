'use client';

import React, { useState, useEffect } from 'react';
import { HistoricalGLOFRecord } from '@/types';
import {
  X,
  History,
  AlertTriangle,
  Waves,
  Mountain,
  Compass,
  MapPin,
  Clock,
  ShieldAlert,
  Info,
  Activity,
  Zap,
  TrendingUp,
  FileText,
  Copy,
  Check,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';

interface ForensicBreachModalProps {
  event: HistoricalGLOFRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onFocusLocation?: (coords: [number, number], zoom?: number) => void;
}

export const ForensicBreachModal: React.FC<ForensicBreachModalProps> = ({
  event,
  isOpen,
  onClose,
  onFocusLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'HYDROGRAPH' | 'IMPACT' | 'MECHANICS'>('OVERVIEW');
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab when event changes
  useEffect(() => {
    if (event) {
      setActiveTab('OVERVIEW');
      setCopied(false);
    }
  }, [event?.id]);

  if (!isOpen || !event) return null;

  const getTriggerDetails = (trigger: string) => {
    switch (trigger) {
      case 'ROCK_ICE_DETACHMENT':
        return {
          label: 'Rock-Ice Detachment',
          badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-700/60',
          desc: 'High-altitude bedrock fracture and hanging glacier collapse into canyon/water body',
        };
      case 'ICE_AVALANCHE':
        return {
          label: 'Ice Avalanche / Serac Fall',
          badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60',
          desc: 'Large hanging ice detachment sending dynamic displacement tsunamis over moraine crest',
        };
      case 'MORAINE_COLLAPSE':
        return {
          label: 'Terminal Moraine Collapse',
          badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/60',
          desc: 'Structural breach and erosion of unstable moraine dam under hydrostatic pressure',
        };
      case 'PIPING_FAILURE':
        return {
          label: 'Internal Moraine Piping',
          badgeClass: 'bg-violet-950/80 text-violet-300 border-violet-700/60',
          desc: 'Subsurface seepage degrading buried ice core until catastrophic piping conduit forms',
        };
      case 'EXTREME_CLOUDBURST':
        return {
          label: 'Cloudburst & Debris Slump',
          badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-700/60',
          desc: 'Torrential localized precipitation causing massive lateral moraine slump and overtopping',
        };
      default:
        return {
          label: trigger,
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          desc: 'Cryospheric failure mechanism',
        };
    }
  };

  const triggerInfo = getTriggerDetails(event.trigger_mechanism);

  // Approximate baseline monsoon river discharge before the surge (typically 150-350 cms for Himalayan rivers)
  const baselineFlow = Math.max(120, Math.round(event.peak_discharge_cms * 0.04));
  const surgeMultiplier = Math.round(event.peak_discharge_cms / baselineFlow);

  const handleCopyDossier = () => {
    const text = `FORENSIC BREACH DOSSIER: ${event.event_name}
Date: ${event.event_date} | Basin: ${event.basin} | River: ${event.river}
Source: ${event.lake_or_glacier} (${event.country_region})
Coordinates: ${event.coordinates.join(', ')}
Trigger Mechanism: ${triggerInfo.label}
Peak Surge Discharge: ${event.peak_discharge_cms.toLocaleString()} m³/s (${surgeMultiplier}x baseline)
Estimated Release Volume: ${(event.estimated_volume_m3 / 1e6).toFixed(2)} Million m³
Downstream Inundation Runout: ${event.downstream_impact_km} km
Documented Casualties: ${event.fatalities}

INFRASTRUCTURE IMPACT:
${event.infrastructure_impact}

FORENSIC MECHANICS & TAKEAWAYS:
${event.key_findings}
`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 1. Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-orange-950/80 border border-orange-500/40 text-orange-400 mt-0.5 shrink-0 shadow-lg shadow-orange-950/50">
              <History className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/40">
                  {event.year} GLOF ARCHIVE
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border ${triggerInfo.badgeClass}`}>
                  {triggerInfo.label}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Date: <strong className="text-slate-200">{event.event_date}</strong>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {event.event_name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  {event.lake_or_glacier}
                </span>
                <span>•</span>
                <span className="text-sky-300">{event.river}</span>
                <span>•</span>
                <span>{event.country_region}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Close Forensic Modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Top Metric Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 px-6 py-3.5 bg-slate-900/40 border-b border-slate-800/80 shrink-0">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
              <Waves className="w-3 h-3 text-rose-400" />
              Peak Surge Discharge
            </div>
            <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">
              {event.peak_discharge_cms.toLocaleString()} <span className="text-xs text-slate-400">m³/s</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">{surgeMultiplier}x normal monsoon flow</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
              <Mountain className="w-3 h-3 text-sky-400" />
              Breach Release Volume
            </div>
            <div className="text-lg font-bold text-sky-300 font-mono mt-0.5">
              {(event.estimated_volume_m3 / 1e6).toFixed(1)} <span className="text-xs text-slate-400">M m³</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Water & Debris Pulverized</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              Downstream Inundation
            </div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {event.downstream_impact_km} <span className="text-xs text-slate-400">km</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">Total Propagation Runout</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-orange-400" />
              Documented Casualties
            </div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">
              {event.fatalities.toLocaleString()} <span className="text-xs text-slate-400">Deaths</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {event.fatalities === 0 ? 'Zero casualties (Early warning)' : 'Cross-valley humanitarian toll'}
            </div>
          </div>
        </div>

        {/* 3. Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800/80 bg-slate-950 shrink-0">
          {[
            { id: 'OVERVIEW', label: 'Executive Overview', icon: FileText },
            { id: 'HYDROGRAPH', label: 'Hydrograph & Surge Dynamics', icon: Waves },
            { id: 'IMPACT', label: 'Infrastructure & Casualties', icon: AlertTriangle },
            { id: 'MECHANICS', label: 'Failure Mechanics & EWS Lessons', icon: Zap },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-2 border-b-2 text-xs font-mono font-medium transition-all ${
                  isActive
                    ? 'border-blue-500 text-blue-400 font-semibold bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Tab Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 font-mono flex-1 text-xs custom-scrollbar">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              {/* Event Context */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  Forensic Incident Profile
                </h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  On <strong className="text-white">{event.event_date}</strong>, a catastrophic breach occurred at{' '}
                  <strong className="text-cyan-300">{event.lake_or_glacier}</strong> in the {event.basin} Basin, triggering a high-velocity outburst flood along the{' '}
                  <strong className="text-sky-300">{event.river}</strong> spanning {event.country_region}. Peak surge discharge reached{' '}
                  <strong className="text-rose-400">{event.peak_discharge_cms.toLocaleString()} m³/s</strong> with an estimated release of{' '}
                  <strong className="text-sky-400">{(event.estimated_volume_m3 / 1e6).toFixed(1)} million cubic meters</strong> of water and pulverized debris over a {event.downstream_impact_km} km runout corridor.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-400 text-[11px]">Primary Trigger Mechanism:</span>
                    <div className="text-slate-200 font-semibold mt-0.5">{triggerInfo.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{triggerInfo.desc}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Breach Coordinates:</span>
                    <div className="text-cyan-400 font-mono font-semibold mt-0.5">
                      {event.coordinates[1]}° N, {event.coordinates[0]}° E (EPSG:4326)
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">ICIMOD Himalayan Cryosphere Registry</div>
                  </div>
                </div>
              </div>

              {/* Core Impact & Findings Snippets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Infrastructure & Damage Assessment
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {event.infrastructure_impact}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                    <Zap className="w-4 h-4" />
                    Key Findings & EWS Takeaways
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    {event.key_findings}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'HYDROGRAPH' && (
            <div className="space-y-4">
              {/* Synthetic Hydrograph SVG */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Waves className="w-4 h-4 text-rose-400" />
                      Breach Wave Hydrograph & Surge Attenuation
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Discharge profile (Q in m³/s) vs Time elapsed from dam breach initiation (T0)
                    </p>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                    Peak: {event.peak_discharge_cms.toLocaleString()} m³/s
                  </span>
                </div>

                {/* SVG Visual Hydrograph */}
                <div className="relative w-full h-52 bg-slate-950 rounded-xl border border-slate-800 p-2">
                  <svg viewBox="0 0 500 160" className="w-full h-full">
                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="480" y2="20" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />
                    <line x1="40" y1="60" x2="480" y2="60" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />
                    <line x1="40" y1="100" x2="480" y2="100" stroke="#334155" strokeDasharray="3 3" strokeWidth="0.5" />
                    <line x1="40" y1="140" x2="480" y2="140" stroke="#475569" strokeWidth="1" />

                    {/* Y-axis labels */}
                    <text x="35" y="24" fill="#94A3B8" fontSize="8" textAnchor="end">{event.peak_discharge_cms} m³/s</text>
                    <text x="35" y="64" fill="#64748B" fontSize="8" textAnchor="end">{Math.round(event.peak_discharge_cms * 0.6)}</text>
                    <text x="35" y="104" fill="#64748B" fontSize="8" textAnchor="end">{Math.round(event.peak_discharge_cms * 0.25)}</text>
                    <text x="35" y="142" fill="#64748B" fontSize="8" textAnchor="end">0</text>

                    {/* Baseline River Flow Line */}
                    <path
                      d={`M 40,136 L 480,136`}
                      stroke="#0284C7"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <text x="475" y="132" fill="#38BDF8" fontSize="7.5" textAnchor="end">Normal Monsoon Baseline ({baselineFlow} m³/s)</text>

                    {/* Flood Surge Hydrograph Wave (rapid rise, exponential decay) */}
                    <path
                      d="M 40,136 C 55,136 70,134 85,90 C 95,50 110,24 130,22 C 150,22 170,45 210,75 C 260,105 340,125 480,135"
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth="3"
                    />
                    {/* Area fill under curve */}
                    <path
                      d="M 40,136 C 55,136 70,134 85,90 C 95,50 110,24 130,22 C 150,22 170,45 210,75 C 260,105 340,125 480,135 L 480,140 L 40,140 Z"
                      fill="rgba(244, 63, 94, 0.12)"
                    />

                    {/* Peak Marker */}
                    <circle cx="130" cy="22" r="4" fill="#F43F5E" stroke="#FFF" strokeWidth="1.5" />
                    <text x="130" y="14" fill="#FDA4AF" fontSize="8" fontWeight="bold" textAnchor="middle">
                      Peak Surge ({event.peak_discharge_cms} m³/s at T+25m)
                    </text>

                    {/* X-axis labels (time) */}
                    <text x="40" y="152" fill="#64748B" fontSize="8" textAnchor="middle">T+0h (Breach)</text>
                    <text x="130" y="152" fill="#94A3B8" fontSize="8" textAnchor="middle">T+0.5h</text>
                    <text x="220" y="152" fill="#64748B" fontSize="8" textAnchor="middle">T+2h</text>
                    <text x="320" y="152" fill="#64748B" fontSize="8" textAnchor="middle">T+5h</text>
                    <text x="440" y="152" fill="#64748B" fontSize="8" textAnchor="middle">T+12h</text>
                  </svg>
                </div>
              </div>

              {/* Hydraulic Parameter Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Estimated Surge Velocity</div>
                  <div className="text-base font-bold text-white font-mono mt-1">
                    12 – 16 m/s <span className="text-xs text-slate-400">(45–58 km/h)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Steep Himalayan gorge acceleration</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Debris Bulking Factor</div>
                  <div className="text-base font-bold text-amber-300 font-mono mt-1">
                    +35% to +60% Bulked
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Moraine scoured per kilometer of runout</div>
                </div>

                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Effective Flood Lead Time</div>
                  <div className="text-base font-bold text-cyan-400 font-mono mt-1">
                    15 – 45 min
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">To primary downstream hydropower intake</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'IMPACT' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Full Damage Inventory & Critical Infrastructure Impact
                </h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {event.infrastructure_impact}
                </p>
              </div>

              {/* Spatial propagation breakdown */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Downstream Corridor Inundation Stages
                </h4>

                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 shrink-0">
                      0 – 15 km
                    </span>
                    <div>
                      <strong className="text-white">Proglacial Gorge & High-Velocity Debris Wave:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Extreme bed scouring, valley bottom widening, complete destruction of footbridges, trails, and riverside settlement lodges.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 shrink-0">
                      15 – 45 km
                    </span>
                    <div>
                      <strong className="text-white">Hydropower & Highway Corridor:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Direct impact on run-of-the-river headworks, intake gates jammed by bouldery slurry, overtopping of cofferdams, and Pasang Lhamu/Arniko highway abutments severed.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800 shrink-0">
                      45 – {event.downstream_impact_km} km
                    </span>
                    <div>
                      <strong className="text-white">Lowland River Aggradation & Backwater Inundation:</strong>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Massive sediment deposition burying agricultural plains, bridges inundated, and downstream reservoirs silted up.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'MECHANICS' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Forensic Failure Mechanics & Scientific Findings
                </h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {event.key_findings}
                </p>
              </div>

              {/* Recommended EWS Interventions */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                  Himalaya EWS Mitigation Protocols (Implemented)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-cyan-400">1. Autonomous Satellite Cue-and-Slew</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Sentinel-2 surface expansion triggers automatic sub-meter optical (SkySat 0.5m) and Sentinel-1 InSAR moraine displacement analysis.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-amber-400">2. SCADA Automated Radial Gate Pre-Drawdown</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Downstream barrages receive IEC 60870-5-104 interlock triggers to flush headponds 25 minutes prior to peak debris wave arrival.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-emerald-400">3. High-Ground Vertical Safe Havens (+35m)</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Geo-fenced SMS and village solar siren towers direct local populations to pre-surveyed scramble trails above high-water mark.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-bold text-rose-400">4. Riverbed Geophone Seismic Tripwires</span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      High-frequency 10–50 Hz seismic acoustic sensors detect debris slurry transit even in zero optical visibility during monsoon cloudbursts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. Modal Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/90 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDossier}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all border border-slate-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Dossier Copied!' : 'Copy Forensic Dossier'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onFocusLocation && (
              <button
                onClick={() => {
                  onFocusLocation(event.coordinates, 12);
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-medium flex items-center gap-1.5 shadow-lg shadow-blue-900/40 transition-all"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Fly to Breach Coordinates [{event.coordinates.join(', ')}]</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-medium transition-colors border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
