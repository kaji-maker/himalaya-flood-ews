'use client';

import React from 'react';
import { PrecipitationPoint } from '@/types';
import { CloudRain } from 'lucide-react';

interface PrecipitationChartProps {
  data: PrecipitationPoint[];
  lakeName: string;
}

export const PrecipitationChart: React.FC<PrecipitationChartProps> = ({ data, lakeName }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 bg-slate-900/40 rounded-xl border border-slate-800 text-slate-500 text-xs font-mono">
        No upstream precipitation telemetry recorded.
      </div>
    );
  }

  const values = data.map((d) => d.precip_mm);
  const maxPrecip = Math.max(...values, 20.0) * 1.2;
  const width = 500;
  const height = 140;
  const padding = { top: 15, right: 20, bottom: 30, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const getY = (val: number) => padding.top + chartHeight - (val / maxPrecip) * chartHeight;

  const total48h = data[data.length - 1]?.accumulated_48h_mm || values.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-slate-900/60 border border-himalaya-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-blue-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Upstream 48h Precipitation
          </h4>
        </div>
        <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/40 border border-sky-500/30 px-2 py-0.5 rounded">
          Total: {total48h.toFixed(1)} mm
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
        {/* Threshold Reference Line at 50mm (Warning Trigger) */}
        {maxPrecip >= 50 && (
          <g>
            <line
              x1={padding.left}
              y1={getY(50)}
              x2={width - padding.right}
              y2={getY(50)}
              stroke="#F43F5E"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={width - padding.right}
              y={getY(50) - 3}
              fill="#F43F5E"
              fontSize="8"
              textAnchor="end"
              fontFamily="monospace"
            >
              50mm Warning Threshold
            </text>
          </g>
        )}

        {/* Precipitation Bar Columns */}
        {data.map((d, i) => {
          const barWidth = Math.max(6, chartWidth / data.length - 4);
          const x = getX(i) - barWidth / 2;
          const y = getY(d.precip_mm);
          const barHeight = padding.top + chartHeight - y;
          const isHeavy = d.precip_mm >= 15;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx="2"
                className={isHeavy ? 'fill-rose-500 hover:fill-rose-400' : 'fill-sky-500 hover:fill-sky-400'}
                opacity={0.85}
              />
              <text
                x={getX(i)}
                y={height - 8}
                fill="#64748B"
                fontSize="8"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {d.timestamp.slice(11, 16)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
