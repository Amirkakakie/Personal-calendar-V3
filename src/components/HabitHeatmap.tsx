import React, { useState } from 'react';
import { Calendar, Award, Zap, CheckCircle2 } from 'lucide-react';
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

  // Construct 16 weeks of DailyActivity
  const effectiveData: DailyActivity[] = React.useMemo(() => {
    if (activityData && activityData.length > 0) return activityData;
    const result: DailyActivity[] = [];
    const now = new Date();
    const totalDays = 16 * 7;
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
  }, [activityData, activityDays]);

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
    if (count === 0) return 'bg-neutral-800/80 hover:ring-1 hover:ring-neutral-500';
    if (count === 1) return 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:ring-1 hover:ring-emerald-400';
    if (count === 2) return 'bg-emerald-800 text-emerald-200 hover:ring-1 hover:ring-emerald-300';
    if (count <= 4) return 'bg-emerald-600 text-white hover:ring-1 hover:ring-emerald-200';
    return 'bg-emerald-400 text-neutral-950 font-bold shadow-sm shadow-emerald-400/30';
  };

  const totalActions = effectiveData.reduce((acc, curr) => acc + curr.completedCount, 0);

  return (
    <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">
            {locale === 'fa' ? 'نقشه حرارتی تداوم عادات و وظایف' : 'Habit & Task Execution Heatmap'}
          </h3>
          <span className="text-xs text-neutral-400">
            {locale === 'fa' ? '۱۶ هفته گذشته' : 'Past 16 Weeks'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>
              {locale === 'fa' ? 'تداوم: ' : 'Streak: '}
              <strong className="text-amber-400">{formatNumber(currentStreak)} {locale === 'fa' ? 'روز' : 'd'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-300">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {locale === 'fa' ? 'بهترین: ' : 'Best: '}
              <strong className="text-indigo-400">{formatNumber(bestStreak)} {locale === 'fa' ? 'روز' : 'd'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {locale === 'fa' ? 'مجموع: ' : 'Total: '}
              <strong className="text-emerald-400">{formatNumber(totalActions)} {locale === 'fa' ? 'وظیفه' : 'tasks'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Grid container with horizontal scroll for mobile */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1.5">
          {weeks.map((week, weekIdx) => (
            <div key={`week-${weekIdx}`} className="flex flex-col gap-1.5">
              {week.map(day => (
                <div
                  key={day.date}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] transition-all cursor-pointer ${getColorClass(day.completedCount)}`}
                  title={`${formatDate(day.date)}: ${formatNumber(day.completedCount)} completed`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Footer: Hover tooltip info and Legend */}
      <div className="flex items-center justify-between text-xs text-neutral-400 mt-3 pt-3 border-t border-neutral-800/80">
        <div className="min-h-[1.25rem]">
          {hoveredDay ? (
            <span className="text-neutral-200">
              <strong className="text-emerald-400">{formatNumber(hoveredDay.completedCount)} {locale === 'fa' ? 'وظیفه' : 'tasks'}</strong>
              {' '}
              {locale === 'fa' ? `در ${formatDate(hoveredDay.date)}` : `on ${formatDate(hoveredDay.date)}`}
            </span>
          ) : (
            <span className="text-neutral-500">
              {locale === 'fa' ? 'نشانگر را روی هر روز ببرید تا جزئیات مشاهده شود' : 'Hover over any day to see details'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span>{locale === 'fa' ? 'کمتر' : 'Less'}</span>
          <div className="w-3 h-3 rounded-[2px] bg-neutral-800 border border-neutral-700" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-950 border border-emerald-800" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-800" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-600" />
          <div className="w-3 h-3 rounded-[2px] bg-emerald-400" />
          <span>{locale === 'fa' ? 'بیشتر' : 'More'}</span>
        </div>
      </div>
    </div>
  );
};
