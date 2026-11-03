import React from 'react';
import { CheckCircle2, Flame, Clock, CalendarDays } from 'lucide-react';
import type { ProductivityStats } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

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

  if (!stats) return null;

  const categories = [
    { 
      id: 'Work/Career', 
      label: t('categories.workCareer'), 
      color: 'bg-blue-500', 
      barColor: 'bg-blue-500', 
      textColor: 'text-blue-400', 
      count: stats.categoryBreakdown['Work/Career'] || 0 
    },
    { 
      id: 'Academic/Study', 
      label: t('categories.academicStudy'), 
      color: 'bg-emerald-500', 
      barColor: 'bg-emerald-500', 
      textColor: 'text-emerald-400', 
      count: stats.categoryBreakdown['Academic/Study'] || 0 
    },
    { 
      id: 'Personal Growth', 
      label: t('categories.personalGrowth'), 
      color: 'bg-purple-500', 
      barColor: 'bg-purple-500', 
      textColor: 'text-purple-400', 
      count: stats.categoryBreakdown['Personal Growth'] || 0 
    },
    { 
      id: 'Health & Habits', 
      label: t('categories.healthHabits'), 
      color: 'bg-amber-500', 
      barColor: 'bg-amber-500', 
      textColor: 'text-amber-400', 
      count: stats.categoryBreakdown['Health & Habits'] || 0 
    },
  ];

  const totalCategorized = categories.reduce((sum, c) => sum + c.count, 0) || 1;

  return (
    <div className="space-y-4">
      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Completion Velocity */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">{t('stats.completionRate')}</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {formatNumber(stats.completionRate)}%
            </span>
            <span className="text-xs text-neutral-400 tabular-nums">
              ({formatNumber(stats.completedCount)}/{formatNumber(stats.totalTasks)})
            </span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Current & Best Streak */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">{t('stats.streak')}</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-tight tabular-nums">
              {formatNumber(stats.currentStreakDays)} <span className="text-sm font-normal text-neutral-400">{t('common.hours') === 'hrs' ? 'days' : 'روز'}</span>
            </span>
            <span className="text-xs text-neutral-500 tabular-nums">
              ({t('stats.bestStreak', { days: stats.bestStreakDays })})
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            {locale === 'fa' ? 'زنجیره فعال تداوم روزانه' : 'Active momentum streak'}
          </p>
        </div>

        {/* Focus Hours / Pomodoro */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">{t('stats.focusTime')}</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight tabular-nums">
              {formatDuration(stats.focusMinutesToday)}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            {t('stats.todayFocus', { minutes: stats.focusMinutesToday })}
          </p>
        </div>

        {/* Google Synced Count */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-400">{t('calendar.title').split(' ')[0]}</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-blue-400 tracking-tight tabular-nums">
              {formatNumber(stats.syncedToGoogleCount || 0)}
            </span>
            <span className="text-xs text-neutral-400 tabular-nums">
              {locale === 'fa' ? 'رویداد در تقویم' : 'scheduled events'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            {locale === 'fa' ? 'همگام‌سازی ۲ طرفه با تقویم گوگل' : 'Bi-directional sync active'}
          </p>
        </div>
      </div>

      {/* Category Distribution Bar */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            {t('stats.categories')}
          </span>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => onSelectCategoryFilter?.(selectedCategory === c.id ? '' : c.id)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors ${
                  selectedCategory === c.id 
                    ? 'bg-neutral-700 text-white font-medium ring-1 ring-neutral-500' 
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${c.color}`} />
                <span>{c.label}</span>
                <span className="text-neutral-500">({formatNumber(c.count)})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Multi-segmented bar */}
        <div className="w-full h-2.5 bg-neutral-800 rounded-full flex overflow-hidden">
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
    </div>
  );
};
