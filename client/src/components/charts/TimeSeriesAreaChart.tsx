'use client';

import React from 'react';

interface DataPoint {
  date: string;
  area_sqkm: number;
}

interface TimeSeriesAreaChartProps {
  data: DataPoint[];
  lakeName: string;
  baselineArea: number;
  criticalThresholdArea?: number;
}

export const TimeSeriesAreaChart: React.FC<TimeSeriesAreaChartProps> = ({
  data,
  lakeName,
  baselineArea,
  criticalThresholdArea,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No satellite observation time-series available.
      </div>
    );
  }

  const areas = data.map((d) => d.area_sqkm);
  const minArea = Math.min(...areas, baselineArea) * 0.95;
  const maxArea = Math.max(...areas, criticalThresholdArea || baselineArea * 1.3) * 1.05;
  const range = maxArea - minArea || 1;

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 40, left: 55 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - ((val - minArea) / range) * chartHeight;

  // Build SVG Path
  const points = data.map((d, i) => `${getX(i)},${getY(d.area_sqkm)}`).join(' ');
  const areaPath = `${points} ${getX(data.length - 1)},${padding.top + chartHeight} ${getX(0)},${padding.top + chartHeight} Z`;

  const baselineY = getY(baselineArea);

  return (
    <div className="bg-slate-900/60 border border-himalaya-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-white">{lakeName} Surface Area Growth</h4>
          <p className="text-xs text-slate-400">Multi-temporal Sentinel-2 L2A MNDWI Extractions</p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-emerald-400">
            Latest: {data[data.length - 1].area_sqkm} km²
          </span>
          <span className="text-xs text-slate-500 block">
            Baseline: {baselineArea} km²
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48 overflow-visible">
        <defs>
          <linearGradient id="lakeAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const val = minArea + pct * range;
          const y = getY(val);
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#1E293B"
                strokeDasharray="3 3"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                fill="#64748B"
                fontSize="10"
                textAnchor="end"
                fontFamily="monospace"
              >
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Baseline Line */}
        <line
          x1={padding.left}
          y1={baselineY}
          x2={width - padding.right}
          y2={baselineY}
          stroke="#94A3B8"
          strokeDasharray="4 4"
          strokeWidth="1.2"
        />

        {/* Area Gradient Fill */}
        <polygon points={areaPath} fill="url(#lakeAreaGradient)" />

        {/* Line Plot */}
        <polyline
          fill="none"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />

        {/* Points & Date Labels */}
        {data.map((d, i) => {
          const cx = getX(i);
          const cy = getY(d.area_sqkm);
          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r="4"
                className="fill-sky-400 stroke-slate-900 stroke-2 hover:r-6 transition-all"
              />
              <text
                x={cx}
                y={height - 12}
                fill="#64748B"
                fontSize="9"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {d.date.slice(2, 7)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
