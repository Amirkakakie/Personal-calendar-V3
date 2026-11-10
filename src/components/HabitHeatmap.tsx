import React, { useState } from 'react';
import { Calendar, Award, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyActivity } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface HabitHeatmapProps {
  activityData?: DailyActivity[];
  activityDays?: Record<string, number>;
  currentStreak?: number;
  bestStreak?: number;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({
  activityData,
  activityDays,
  currentStreak = 7,
  bestStreak = 14
}) => {
  const { t, formatDate, formatNumber, locale } = useI18n();
  const [hoveredDay, setHoveredDay] = useState<DailyActivity | null>(null);
  const [weeksToDisplay, setWeeksToDisplay] = useState<8 | 16>(16);

  // Construct 16 weeks of DailyActivity
  const effectiveData: DailyActivity[] = React.useMemo(() => {
    if (activityData && activityData.length > 0) return activityData;
    const result: DailyActivity[] = [];
    const now = new Date();
    const totalDays = weeksToDisplay * 7;
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const count = activityDays?.[dateStr] || 0;
      result.push({
        date: dateStr,
        completedCount: count,
        totalTasks: count > 0 ? count + 1 : 0
      });
    }
    return result;
  }, [activityData, activityDays, weeksToDisplay]);

  // Group days into weeks (7 days per column)
  const weeks: DailyActivity[][] = [];
  let currentWeek: DailyActivity[] = [];

  effectiveData.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === effectiveData.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-neutral-850 hover:bg-neutral-800 border border-neutral-800/80';
    if (count === 1) return 'bg-emerald-950/60 border border-emerald-500/30 hover:border-emerald-400';
    if (count === 2) return 'bg-emerald-600/50 border border-emerald-500/50 hover:bg-emerald-500/60';
    if (count <= 4) return 'bg-emerald-500 border border-emerald-400 hover:brightness-110 shadow-sm';
    return 'bg-emerald-400 border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.45)] hover:brightness-110';
  };

  const dayLabels = locale === 'fa' 
    ? ['ش', '', 'د', '', 'چ', '', 'ج'] 
    : ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

  const totalActions = effectiveData.reduce((acc, curr) => acc + curr.completedCount, 0);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-5 backdrop-blur-md shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
          <h3 className="text-sm font-bold text-white tracking-tight truncate">
            {locale === 'fa' ? 'نقشه حرارتی تداوم عادات و وظایف' : 'Habit & Task Heatmap'}
          </h3>
          <span className="text-[11px] font-mono text-neutral-400 px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 tabular-nums shrink-0">
            {formatNumber(totalActions)} {locale === 'fa' ? 'فعالیت' : 'actions'}
          </span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono">
          {/* Week window toggle */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            <button
              type="button"
              onClick={() => setWeeksToDisplay(8)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                weeksToDisplay === 8 ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              8W
            </button>
            <button
              type="button"
              onClick={() => setWeeksToDisplay(16)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                weeksToDisplay === 16 ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              16W
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
              <span>
                Streak: <strong className="text-amber-400 tabular-nums">{formatNumber(currentStreak)}d</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400 hidden sm:flex">
              <Award className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                Best: <strong className="text-indigo-400 tabular-nums">{formatNumber(bestStreak)}d</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid container with day label column and touch-pan horizontal scroll */}
      <div className="overflow-x-auto pb-2 custom-scrollbar touch-pan-x">
        <div className="inline-flex gap-2 items-start min-w-full justify-start sm:justify-center">
          {/* Day of week labels */}
          <div className="flex flex-col gap-1.5 pt-0.5 text-[9px] font-mono text-neutral-500 select-none">
            {dayLabels.map((label, idx) => (
              <span key={idx} className="h-3.5 sm:h-4 flex items-center justify-center w-5">
                {label}
              </span>
            ))}
          </div>

          {/* Week columns */}
          <div className="inline-flex gap-1.5">
            {weeks.map((week, weekIdx) => (
              <div key={`week-${weekIdx}`} className="flex flex-col gap-1.5">
                {week.map(day => (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => setHoveredDay(prev => prev?.date === day.date ? null : day)}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] transition-all cursor-pointer ${getColorClass(day.completedCount)}`}
                    title={`${formatDate(day.date)}: ${formatNumber(day.completedCount)} completed`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Hover tooltip info and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-800 gap-2">
        <div className="min-h-[1.25rem] text-xs">
          {hoveredDay ? (
            <span>
              <strong className="text-emerald-400 font-mono tabular-nums">{formatNumber(hoveredDay.completedCount)} {locale === 'fa' ? 'کار انجام شد' : 'tasks'}</strong> {locale === 'fa' ? 'در تاریخ' : 'on'} {formatDate(hoveredDay.date)}
            </span>
          ) : (
            <span className="text-neutral-500 text-[11px]">
              {locale === 'fa' ? 'برای مشاهده جزئیات روی خانه‌ها ضربه بزنید' : 'Tap or hover over any square to view daily momentum'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-mono">
          <span>{locale === 'fa' ? 'کمتر' : 'Less'}</span>
          <div className="w-2.5 h-2.5 rounded-[3px] bg-neutral-850 border border-neutral-800" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-950/60 border border-emerald-500/30" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-600/50" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-500" />
          <div className="w-2.5 h-2.5 rounded-[3px] bg-emerald-400" />
          <span>{locale === 'fa' ? 'بیشتر' : 'More'}</span>
        </div>
      </div>
    </div>
  );
};
