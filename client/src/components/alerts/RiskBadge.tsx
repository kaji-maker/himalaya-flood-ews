'use client';

import React from 'react';
import { AlertLevel, PDGLHazardLevel } from '@/types';

interface RiskBadgeProps {
  level: AlertLevel | PDGLHazardLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', showPulse = true }) => {
  const normalized = level.toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'CRITICAL':
      case 'VERY_HIGH':
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-500',
          label: normalized === 'VERY_HIGH' ? 'VERY HIGH RISK' : 'CRITICAL',
        };
      case 'WARNING':
      case 'HIGH':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-500',
          label: normalized === 'HIGH' ? 'HIGH RISK' : 'WARNING',
        };
      case 'WATCH':
      case 'MEDIUM':
        return {
          bg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
          dot: 'bg-yellow-500',
          label: normalized === 'MEDIUM' ? 'MEDIUM RISK' : 'WATCH',
        };
      case 'ADVISORY':
      case 'POTENTIAL':
        return {
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
          dot: 'bg-blue-500',
          label: normalized === 'POTENTIAL' ? 'POTENTIAL' : 'ADVISORY',
        };
      case 'NORMAL':
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dot: 'bg-emerald-500',
          label: normalized === 'LOW' ? 'LOW RISK' : 'NORMAL',
        };
    }
  };

  const style = getStyle();

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono uppercase tracking-wider font-semibold ${style.bg} ${sizeClasses[size]}`}
    >
      {showPulse && (
        <span className="relative flex h-2 w-2">
          {['CRITICAL', 'VERY_HIGH', 'WARNING', 'HIGH'].includes(normalized) && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${style.dot}`}></span>
        </span>
      )}
      {style.label}
    </span>
  );
};
