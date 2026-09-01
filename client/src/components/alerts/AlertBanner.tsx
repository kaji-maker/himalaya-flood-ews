'use client';

import React, { useState, useEffect } from 'react';
import { FloodAlert } from '@/types';
import { RiskBadge } from './RiskBadge';
import { AlertTriangle, ShieldAlert, CheckCircle, ChevronRight, BellRing } from 'lucide-react';

interface AlertBannerProps {
  alerts: FloodAlert[];
  onAcknowledge: (alertId: string) => void;
  onSelectLakeById?: (lakeId: string) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onAcknowledge,
  onSelectLakeById,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeAlerts = alerts.filter(
    (a) => !a.resolved_at && (a.severity === 'EMERGENCY' || a.severity === 'WARNING')
  );

  if (activeAlerts.length === 0) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">All Glacial Lake Catchments Normal</h4>
            <p className="text-xs text-slate-400">
              Continuous Sentinel-2 MNDWI & NASA GPM IMERG 30-minute automated telemetry scanning active across Nepal.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-900/40 px-2.5 py-1 rounded-full border border-emerald-500/40">
          0 Active Warnings
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeAlerts.map((alert) => {
        const isEmergency = alert.severity === 'EMERGENCY';

        return (
          <div
            key={alert.id}
            className={`rounded-2xl p-5 border shadow-xl relative overflow-hidden transition-all ${
              isEmergency
                ? 'bg-rose-950/50 border-rose-500/60 ring-1 ring-rose-500/30'
                : 'bg-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/20'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${
                    isEmergency
                      ? 'bg-rose-600/30 border-rose-500/50 text-rose-300'
                      : 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                  }`}
                >
                  <BellRing className="w-6 h-6 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RiskBadge level={alert.severity} size="sm" showPulse />
                    <span className="text-xs font-mono font-semibold text-white">
                      {alert.lake_name}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      • {alert.basin_name} River Basin
                    </span>
                    <span
                      className="text-[11px] font-mono text-slate-500"
                      suppressHydrationWarning
                    >
                      {mounted && alert.created_at
                        ? `[${new Date(alert.created_at).toLocaleTimeString()}]`
                        : `[${(alert.created_at || '').slice(11, 16) || 'LIVE'}]`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed max-w-4xl">
                    {alert.trigger_reason}
                  </p>

                  {alert.affected_villages && alert.affected_villages.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase font-mono text-slate-400">Downstream At-Risk:</span>
                      {alert.affected_villages.map((v, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-slate-900/80 text-rose-200 px-2 py-0.5 rounded border border-rose-900/50 font-mono"
                        >
                          📍 {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                {onSelectLakeById && (
                  <button
                    onClick={() => onSelectLakeById(alert.lake_id)}
                    className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center gap-1 font-mono"
                  >
                    Inspect Lake <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onAcknowledge(alert.id)}
                  className={`px-3.5 py-1.5 text-white text-xs font-semibold rounded-lg shadow transition-colors flex items-center gap-1.5 ${
                    isEmergency
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
