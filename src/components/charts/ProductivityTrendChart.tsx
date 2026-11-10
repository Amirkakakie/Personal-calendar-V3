import React, { useState } from 'react';
import { TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface ProductivityTrendChartProps {
  velocity?: number[];
  focusMinutesToday?: number;
  completionRate?: number;
}

export const ProductivityTrendChart: React.FC<ProductivityTrendChartProps> = ({
  velocity = [3, 5, 2, 6, 4, 7, 5],
  focusMinutesToday = 45,
  completionRate = 85
}) => {
  const { t, formatNumber, locale } = useI18n();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Day labels for past 7 days ending today
  const dayNames = locale === 'fa' 
    ? ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const values = velocity.length === 7 ? velocity : [3, 5, 2, 6, 4, 7, 5];
  const maxVal = Math.max(...values, 8);
  const minVal = 0;

  // Chart dimensions
  const width = 500;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Compute (x, y) coordinates
  const points = values.map((val, idx) => {
    const x = paddingX + (idx / (values.length - 1)) * chartWidth;
    const y = height - paddingY - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, val, day: dayNames[idx % dayNames.length] };
  });

  // Generate smooth SVG bezier path
  const linePath = points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (point.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (point.x - prev.x) / 2;
    const cp2y = point.y;
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
  }, '');

  // Closed path for area gradient fill
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  const totalCompletedInWeek = values.reduce((sum, v) => sum + v, 0);
  const avgDailyVelocity = Math.round((totalCompletedInWeek / values.length) * 10) / 10;

  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4 sm:p-5 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              {locale === 'fa' ? 'روند تکمیل کارها در ۷ روز گذشته' : 'Execution Velocity Trend (7 Days)'}
            </h4>
            <p className="text-[11px] text-neutral-400">
              {locale === 'fa' 
                ? `میانگین روزانه: ${formatNumber(avgDailyVelocity)} کار • تکمیل کل: ${formatNumber(totalCompletedInWeek)} کار`
                : `Daily Avg: ${formatNumber(avgDailyVelocity)} tasks • Total: ${formatNumber(totalCompletedInWeek)} completed`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950/70 border border-neutral-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-neutral-400">{locale === 'fa' ? 'نرخ موفقیت:' : 'Rate:'}</span>
            <span className="font-mono font-bold text-white tabular-nums">{formatNumber(completionRate)}%</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950/70 border border-neutral-800">
            <Clock className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-neutral-400">{locale === 'fa' ? 'امروز:' : 'Today:'}</span>
            <span className="font-mono font-bold text-white tabular-nums">{formatNumber(focusMinutesToday)}m</span>
          </div>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-hidden select-none">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-44 sm:h-52 overflow-visible"
        >
          <defs>
            <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#6366f1" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * chartHeight;
            const labelVal = Math.round(minVal + ratio * (maxVal - minVal));
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 10}
                  y={y + 3}
                  textAnchor="end"
                  fill="rgba(161, 161, 170, 0.6)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {labelVal}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#velocityGradient)" />

          {/* Trend line */}
          <path
            d={linePath}
            fill="none"
            stroke="#818cf8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Interactive Points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            return (
              <g 
                key={`point-${idx}`}
                className="cursor-pointer transition-transform"
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingY}
                    x2={pt.x}
                    y2={height - paddingY}
                    stroke="rgba(99, 102, 241, 0.5)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Outer ring */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#09090b"
                  stroke={isHovered ? '#a5b4fc' : '#6366f1'}
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150"
                />

                {/* Day label along bottom axis */}
                <text
                  x={pt.x}
                  y={height - paddingY + 16}
                  textAnchor="middle"
                  fill={isHovered ? '#ffffff' : 'rgba(161, 161, 170, 0.7)'}
                  fontSize="11"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {pt.day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip on Hover */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div 
            className="absolute -top-1 pointer-events-none transform -translate-x-1/2 bg-neutral-950/95 border border-indigo-500/40 px-3 py-1.5 rounded-xl shadow-xl text-xs z-20 backdrop-blur"
            style={{ 
              left: `${(points[hoveredIndex].x / width) * 100}%`
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-medium">{points[hoveredIndex].day}:</span>
              <span className="font-mono font-bold text-indigo-300 tabular-nums">
                {formatNumber(points[hoveredIndex].val)} {locale === 'fa' ? 'کار انجام شد' : 'tasks done'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
