'use client';

import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  highlightColor?: 'blue' | 'red' | 'yellow' | 'emerald';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  highlightColor = 'blue',
}) => {
  const colorMap = {
    blue: {
      border: 'border-blue-500/30 group-hover:border-blue-400/60',
      badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      glow: 'shadow-blue-500/5 group-hover:shadow-blue-500/15',
      accent: 'from-blue-500/10 via-transparent to-transparent',
    },
    red: {
      border: 'border-rose-500/40 group-hover:border-rose-400/70',
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      glow: 'shadow-rose-500/10 group-hover:shadow-rose-500/25',
      accent: 'from-rose-500/10 via-transparent to-transparent',
    },
    yellow: {
      border: 'border-amber-500/40 group-hover:border-amber-400/70',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      glow: 'shadow-amber-500/10 group-hover:shadow-amber-500/20',
      accent: 'from-amber-500/10 via-transparent to-transparent',
    },
    emerald: {
      border: 'border-emerald-500/30 group-hover:border-emerald-400/60',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      glow: 'shadow-emerald-500/5 group-hover:shadow-emerald-500/15',
      accent: 'from-emerald-500/10 via-transparent to-transparent',
    },
  };

  const currentTheme = colorMap[highlightColor];

  return (
    <div
      className={`relative bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 backdrop-blur-md border ${currentTheme.border} rounded-2xl p-5 shadow-xl ${currentTheme.glow} transition-all duration-300 group overflow-hidden`}
    >
      <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br ${currentTheme.accent} blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl border ${currentTheme.badge} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 relative z-10">
        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight flex items-baseline gap-2">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {trend && (
        <div className="mt-3 text-xs flex items-center gap-1.5 font-mono relative z-10">
          <span
            className={`px-2 py-0.5 rounded-full border text-[11px] font-bold flex items-center gap-1 ${
              trend.isPositive
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-[11px] text-slate-500">vs historical baseline</span>
        </div>
      )}
    </div>
  );
};
