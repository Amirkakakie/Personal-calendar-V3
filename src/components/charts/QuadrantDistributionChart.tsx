import React from 'react';
import { Target, ArrowRight } from 'lucide-react';
import type { Task, EisenhowerQuadrant } from '../../types/index.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface QuadrantDistributionChartProps {
  tasks: Task[];
  onSelectQuadrant?: (quadrant: EisenhowerQuadrant) => void;
}

export const QuadrantDistributionChart: React.FC<QuadrantDistributionChartProps> = ({
  tasks,
  onSelectQuadrant
}) => {
  const { t, formatNumber, locale } = useI18n();

  const quadrants: {
    id: EisenhowerQuadrant;
    shortLabel: string;
    title: string;
    color: string;
    barColor: string;
    textColor: string;
  }[] = [
    {
      id: 'q1_urgent_important',
      shortLabel: 'Q1',
      title: locale === 'fa' ? 'فوری + حیاتی' : 'Urgent & Important',
      color: 'bg-rose-500',
      barColor: 'bg-rose-500',
      textColor: 'text-rose-400'
    },
    {
      id: 'q2_not_urgent_important',
      shortLabel: 'Q2',
      title: locale === 'fa' ? 'استراتژیک و رشد' : 'Strategic & Growth',
      color: 'bg-emerald-500',
      barColor: 'bg-emerald-500',
      textColor: 'text-emerald-400'
    },
    {
      id: 'q3_urgent_not_important',
      shortLabel: 'Q3',
      title: locale === 'fa' ? 'واگذاری و تجمیع' : 'Delegate & Batch',
      color: 'bg-amber-500',
      barColor: 'bg-amber-500',
      textColor: 'text-amber-400'
    },
    {
      id: 'q4_neither',
      shortLabel: 'Q4',
      title: locale === 'fa' ? 'حذف و پاکسازی' : 'Eliminate & Prune',
      color: 'bg-neutral-500',
      barColor: 'bg-neutral-500',
      textColor: 'text-neutral-400'
    }
  ];

  const totalTasks = tasks.length || 1;

  return (
    <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4 sm:p-5 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              {locale === 'fa' ? 'توزیع ماتریس آیزنهاور' : 'Eisenhower Leverage Balance'}
            </h4>
            <p className="text-[11px] text-neutral-400">
              {locale === 'fa' ? 'توازن میان بحران‌ها و کارهای عمیق' : 'Ratio of reactive crises vs. proactive depth'}
            </p>
          </div>
        </div>

        {onSelectQuadrant && (
          <button
            onClick={() => onSelectQuadrant('q1_urgent_important')}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-medium"
          >
            <span>{locale === 'fa' ? 'مشاهده ماتریس' : 'Open Matrix'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-3 pt-1">
        {quadrants.map(q => {
          const count = tasks.filter(t => (t.eisenhower || 'q2_not_urgent_important') === q.id).length;
          const percentage = Math.round((count / totalTasks) * 100);

          return (
            <div 
              key={q.id}
              onClick={() => onSelectQuadrant?.(q.id)}
              className="group cursor-pointer p-2 rounded-xl hover:bg-white/[0.03] transition-all"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] ${q.textColor} bg-neutral-950/80 border border-neutral-800`}>
                    {q.shortLabel}
                  </span>
                  <span className="text-neutral-300 font-medium group-hover:text-white transition-colors">
                    {q.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-neutral-500 tabular-nums">
                    {formatNumber(count)} {locale === 'fa' ? 'کار' : 'tasks'}
                  </span>
                  <span className={`font-semibold tabular-nums ${q.textColor}`}>
                    {formatNumber(percentage)}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-neutral-800/80 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${q.barColor} transition-all duration-500 rounded-full group-hover:brightness-110`}
                  style={{ width: `${Math.max(percentage, count > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
