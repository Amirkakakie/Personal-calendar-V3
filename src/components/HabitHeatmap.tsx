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
    if (count === 0) return 'bg-white/[0.03] hover:bg-white/[0.08]';
    if (count === 1) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    if (count === 2) return 'bg-emerald-500/40 text-emerald-200';
    if (count <= 4) return 'bg-emerald-500 text-neutral-950';
    return 'bg-emerald-400 text-neutral-950 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
  };

  const totalActions = effectiveData.reduce((acc, curr) => acc + curr.completedCount, 0);

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <h3 className="text-[13px] font-bold text-white">
            {locale === 'fa' ? 'نقشه حرارتی تداوم عادات و وظایف' : 'Habit & Task Execution Heatmap'}
          </h3>
        </div>

        <div className="flex items-center gap-4 text-[12px]">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>
              Streak: <strong className="text-amber-400 font-mono">{formatNumber(currentStreak)}d</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              Best: <strong className="text-indigo-400 font-mono">{formatNumber(bestStreak)}d</strong>
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
      <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-4 pt-3 border-t border-white/5">
        <div className="min-h-[1.25rem]">
          {hoveredDay ? (
            <span className="text-neutral-300">
              <strong className="text-emerald-400 font-mono">{formatNumber(hoveredDay.completedCount)} tasks</strong> completed on {formatDate(hoveredDay.date)}
            </span>
          ) : (
            <span className="text-neutral-500">
              Hover over a square to view details
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-[2px] bg-white/[0.03]" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/20 border border-emerald-500/30" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/40" />
          <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500" />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
