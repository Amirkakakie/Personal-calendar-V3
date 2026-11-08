import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Flame, 
  Clock, 
  CalendarDays, 
  TrendingUp, 
  PieChart,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { ProductivityStats } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { ProductivityTrendChart } from './charts/ProductivityTrendChart.tsx';
import { CategoryDonutChart } from './charts/CategoryDonutChart.tsx';

interface StatsCardsProps {
  stats: ProductivityStats | null;
  onSelectCategoryFilter?: (cat: string) => void;
  selectedCategory?: string;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ 
  stats,
  onSelectCategoryFilter,
  selectedCategory 
}) => {
  const { t, formatNumber, formatDuration, locale } = useI18n();
  const [activeVisualizer, setActiveVisualizer] = useState<'none' | 'trend' | 'donut'>('trend');

  if (!stats) return null;

  const categories = [
    { 
      id: 'Work/Career', 
      label: t('categories.workCareer'), 
      color: 'bg-blue-500', 
      barColor: 'bg-blue-500', 
      textColor: 'text-blue-400', 
      count: stats.categoryBreakdown?.['Work/Career'] || stats.categoryDistribution?.['Work/Career'] || 0 
    },
    { 
      id: 'Academic/Study', 
      label: t('categories.academicStudy'), 
      color: 'bg-emerald-500', 
      barColor: 'bg-emerald-500', 
      textColor: 'text-emerald-400', 
      count: stats.categoryBreakdown?.['Academic/Study'] || stats.categoryDistribution?.['Academic/Study'] || 0 
    },
    { 
      id: 'Personal Growth', 
      label: t('categories.personalGrowth'), 
      color: 'bg-purple-500', 
      barColor: 'bg-purple-500', 
      textColor: 'text-purple-400', 
      count: stats.categoryBreakdown?.['Personal Growth'] || stats.categoryDistribution?.['Personal Growth'] || 0 
    },
    { 
      id: 'Health & Habits', 
      label: t('categories.healthHabits'), 
      color: 'bg-amber-500', 
      barColor: 'bg-amber-500', 
      textColor: 'text-amber-400', 
      count: stats.categoryBreakdown?.['Health & Habits'] || stats.categoryDistribution?.['Health & Habits'] || 0 
    },
  ];

  const totalCategorized = categories.reduce((sum, c) => sum + c.count, 0) || 1;
  const completionRate = stats.completionRate || 0;

  // Circular progress ring calculation
  const ringSize = 42;
  const ringStroke = 4;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (completionRate / 100) * ringCircumference;

  return (
    <div className="space-y-4">
      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Completion Velocity */}
        <div className="premium-border rounded-2xl p-4 relative overflow-hidden group hover:border-white/10 transition-all bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              {t('stats.completionRate')}
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono tabular-nums">
                  {formatNumber(completionRate)}%
                </span>
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {locale === 'fa' 
                  ? `${formatNumber(stats.completedCount)} از ${formatNumber(stats.totalTasks)} انجام شده`
                  : `${formatNumber(stats.completedCount)} of ${formatNumber(stats.totalTasks)} done`}
              </p>
            </div>

            {/* Circular Progress Ring */}
            <div className="relative shrink-0 hidden sm:block">
              <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="transparent"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth={ringStroke}
                />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="transparent"
                  stroke="#6366f1"
                  strokeWidth={ringStroke}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
            </div>
          </div>

          <div className="w-full bg-white/5 h-1 rounded-full mt-3 overflow-hidden sm:hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* 2. Streak Counter */}
        <div className="premium-border rounded-2xl p-4 relative overflow-hidden group hover:border-white/10 transition-all bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              {t('stats.streak')}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-3.5 h-3.5 fill-amber-400/20" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-tight font-mono tabular-nums">
              {formatNumber(stats.currentStreakDays)}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {locale === 'fa' ? 'روز پیوسته' : 'days'}
            </span>
          </div>

          <p className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
            <span>{locale === 'fa' ? 'رکورد ثبت شده:' : 'Best record:'}</span>
            <strong className="text-neutral-300 font-mono font-medium tabular-nums">
              {formatNumber(stats.bestStreakDays)} {locale === 'fa' ? 'روز' : 'days'}
            </strong>
          </p>
        </div>

        {/* 3. Focus Hours */}
        <div className="premium-border rounded-2xl p-4 relative overflow-hidden group hover:border-white/10 transition-all bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              {t('stats.focusTime')}
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono tabular-nums">
              {formatDuration(stats.focusMinutesToday)}
            </span>
          </div>

          <p className="text-[10px] text-neutral-500 mt-1">
            {locale === 'fa' ? 'تمرکز عمیق امروز' : 'Deep work logged today'}
          </p>
        </div>

        {/* 4. Synced Tasks */}
        <div className="premium-border rounded-2xl p-4 relative overflow-hidden group hover:border-white/10 transition-all bg-white/[0.02]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              {locale === 'fa' ? 'همگام تقویم' : 'Synced'}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-400 tracking-tight font-mono tabular-nums">
              {formatNumber(stats.syncedToGoogleCount || 0)}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              {locale === 'fa' ? 'رویداد' : 'events'}
            </span>
          </div>

          <p className="text-[10px] text-neutral-500 mt-1">
            {locale === 'fa' ? 'متصل به تقویم گوگل' : 'Active Google Calendar links'}
          </p>
        </div>
      </div>

      {/* Visualizer Toggle Strip */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              {t('stats.categories')}
            </span>
            <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 ms-2">
              <button
                type="button"
                onClick={() => setActiveVisualizer(prev => prev === 'trend' ? 'none' : 'trend')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  activeVisualizer === 'trend'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <TrendingUp className="w-3 h-3 text-indigo-400" />
                <span>{locale === 'fa' ? 'روند سرعت' : 'Velocity'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveVisualizer(prev => prev === 'donut' ? 'none' : 'donut')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                  activeVisualizer === 'donut'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <PieChart className="w-3 h-3 text-purple-400" />
                <span>{locale === 'fa' ? 'نمودار تعادل' : 'Donut'}</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCategoryFilter?.(selectedCategory === c.id ? '' : c.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all min-h-[32px] ${
                  selectedCategory === c.id 
                    ? 'bg-neutral-700 text-white font-medium ring-1 ring-neutral-500 shadow-sm' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${c.color}`} />
                <span>{c.label}</span>
                <span className="text-neutral-500 font-mono">({formatNumber(c.count)})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Multi-segmented bar */}
        <div className="w-full h-2 bg-neutral-950 rounded-full flex overflow-hidden border border-neutral-800/60">
          {categories.map(c => {
            const widthPct = Math.round((c.count / totalCategorized) * 100);
            if (widthPct === 0) return null;
            return (
              <div 
                key={c.id}
                className={`${c.barColor} transition-all duration-300 hover:opacity-90`}
                style={{ width: `${widthPct}%` }}
                title={`${c.label}: ${formatNumber(c.count)} (${formatNumber(widthPct)}%)`}
              />
            );
          })}
        </div>
      </div>

      {/* Expanded Visualizer Accordion */}
      {activeVisualizer === 'trend' && (
        <div className="animate-fadeIn">
          <ProductivityTrendChart 
            velocity={stats.weeklyVelocity}
            focusMinutesToday={stats.focusMinutesToday}
            completionRate={stats.completionRate}
          />
        </div>
      )}

      {activeVisualizer === 'donut' && (
        <div className="animate-fadeIn">
          <CategoryDonutChart 
            categoryDistribution={stats.categoryDistribution || stats.categoryBreakdown}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategoryFilter}
          />
        </div>
      )}
    </div>
  );
};
