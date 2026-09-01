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
    blue: 'border-blue-500/20 text-blue-400 bg-blue-500/10',
    red: 'border-rose-500/30 text-rose-400 bg-rose-500/10',
    yellow: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    emerald: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10',
  };

  return (
    <div className="bg-himalaya-card border border-himalaya-border rounded-xl p-5 shadow-sm hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg border ${colorMap[highlightColor]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <span className="text-2xl font-bold font-mono text-white tracking-tight">{value}</span>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {trend && (
        <div className="mt-2 text-xs flex items-center gap-1 font-mono">
          <span className={trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}>
            {trend.value}
          </span>
          <span className="text-slate-500">vs baseline</span>
        </div>
      )}
    </div>
  );
};
