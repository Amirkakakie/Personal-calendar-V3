import React, { useState } from 'react';
import { PieChart, Filter } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface CategoryDonutChartProps {
  categoryDistribution?: Record<string, number>;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categoryDistribution = {},
  selectedCategory = '',
  onSelectCategory
}) => {
  const { t, formatNumber, locale } = useI18n();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const categories = [
    { 
      id: 'Work/Career', 
      label: t('categories.workCareer'), 
      strokeColor: '#3b82f6', 
      bgColor: 'bg-blue-500', 
      textColor: 'text-blue-400',
      count: categoryDistribution['Work/Career'] || 0 
    },
    { 
      id: 'Academic/Study', 
      label: t('categories.academicStudy'), 
      strokeColor: '#10b981', 
      bgColor: 'bg-emerald-500', 
      textColor: 'text-emerald-400',
      count: categoryDistribution['Academic/Study'] || 0 
    },
    { 
      id: 'Personal Growth', 
      label: t('categories.personalGrowth'), 
      strokeColor: '#a855f7', 
      bgColor: 'bg-purple-500', 
      textColor: 'text-purple-400',
      count: categoryDistribution['Personal Growth'] || 0 
    },
    { 
      id: 'Health & Habits', 
      label: t('categories.healthHabits'), 
      strokeColor: '#f59e0b', 
      bgColor: 'bg-amber-500', 
      textColor: 'text-amber-400',
      count: categoryDistribution['Health & Habits'] || 0 
    },
  ];

  const totalTasks = categories.reduce((sum, c) => sum + c.count, 0);
  const effectiveTotal = totalTasks > 0 ? totalTasks : 1;

  // SVG Donut geometry
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate arc slices
  let accumulatedOffset = 0;
  const slices = categories.map(cat => {
    const fraction = cat.count / effectiveTotal;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedOffset;
    accumulatedOffset += fraction * circumference;
    const percentage = totalTasks > 0 ? Math.round(fraction * 100) : 0;
    return {
      ...cat,
      fraction,
      percentage,
      strokeDasharray,
      strokeDashoffset
    };
  });

  const activeCategory = hoveredCategory || selectedCategory;
  const activeItem = categories.find(c => c.id === activeCategory);

  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4 sm:p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              {locale === 'fa' ? 'توزیع وظایف در حوزه‌های چهارگانه' : 'Domain Life Balance'}
            </h4>
            <p className="text-[11px] text-neutral-400">
              {locale === 'fa' ? 'تعادل زمان و تمرکز در پروژه‌ها' : 'Distribution across personal pillars'}
            </p>
          </div>
        </div>

        {selectedCategory && onSelectCategory && (
          <button
            onClick={() => onSelectCategory('')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-800 text-[11px] text-neutral-300 hover:text-white transition-colors border border-neutral-700"
          >
            <Filter className="w-3 h-3 text-indigo-400" />
            <span>{locale === 'fa' ? 'پاکسازی فیلتر' : 'Clear filter'}</span>
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-6 pt-2">
        {/* SVG Donut */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {slices.map(slice => {
              const isSelected = selectedCategory === slice.id;
              const isHovered = hoveredCategory === slice.id;
              const isMuted = activeCategory && activeCategory !== slice.id;

              return (
                <circle
                  key={slice.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={slice.strokeColor}
                  strokeWidth={isHovered || isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  strokeLinecap="butt"
                  className={`cursor-pointer transition-all duration-200 ${
                    isMuted ? 'opacity-35' : 'opacity-100'
                  }`}
                  onMouseEnter={() => setHoveredCategory(slice.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => onSelectCategory?.(selectedCategory === slice.id ? '' : slice.id)}
                />
              );
            })}
          </svg>

          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            {activeItem ? (
              <>
                <span className={`text-xl font-extrabold font-mono tabular-nums ${activeItem.textColor}`}>
                  {formatNumber(slices.find(s => s.id === activeItem.id)?.percentage || 0)}%
                </span>
                <span className="text-[10px] text-neutral-400 font-medium truncate max-w-[80px]">
                  {activeItem.label}
                </span>
              </>
            ) : (
              <>
                <span className="text-xl font-extrabold text-white font-mono tabular-nums">
                  {formatNumber(totalTasks)}
                </span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                  {locale === 'fa' ? 'وظیفه کل' : 'Total Tasks'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-2">
          {slices.map(slice => {
            const isSelected = selectedCategory === slice.id;
            return (
              <button
                key={slice.id}
                type="button"
                onClick={() => onSelectCategory?.(selectedCategory === slice.id ? '' : slice.id)}
                onMouseEnter={() => setHoveredCategory(slice.id)}
                onMouseLeave={() => setHoveredCategory(null)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                  isSelected 
                    ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                    : 'hover:bg-white/[0.03] text-neutral-400 hover:text-neutral-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: slice.strokeColor }}
                  />
                  <span className="truncate font-medium">{slice.label}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                  <span className="text-neutral-500 tabular-nums">
                    {formatNumber(slice.count)}
                  </span>
                  <span className={`font-semibold tabular-nums ${slice.textColor}`}>
                    {formatNumber(slice.percentage)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
