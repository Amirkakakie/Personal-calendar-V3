import React from 'react';
import { Target, Plus, Sparkles, CheckCircle2, Trash2, Edit3 } from 'lucide-react';
import type { GoalOKR } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { EmptyState } from './EmptyState.tsx';

interface GoalsViewProps {
  goals: GoalOKR[];
  onOpenNewGoal: () => void;
  onEditGoal: (goal: GoalOKR) => void;
  onDeleteGoal: (id: string) => void;
  onUpdateKeyResult: (goalId: string, krId: string, value: number) => void;
  onDecomposeGoal: (goalTitle: string, category: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onOpenNewGoal,
  onEditGoal,
  onDeleteGoal,
  onUpdateKeyResult,
  onDecomposeGoal
}) => {
  const { t, formatNumber, formatDate, locale } = useI18n();

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'Work/Career': return t('categories.workCareer');
      case 'Academic/Study': return t('categories.academicStudy');
      case 'Personal Growth': return t('categories.personalGrowth');
      case 'Health & Habits': return t('categories.healthHabits');
      default: return category;
    }
  };

  const getCategoryClass = (category: string) => {
    switch (category) {
      case 'Work/Career': return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      case 'Academic/Study': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'Personal Growth': return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      case 'Health & Habits': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default: return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            {t('goals.title')}
          </h2>
          <p className="text-xs text-neutral-400">
            {t('goals.subtitle')}
          </p>
        </div>

        <button
          onClick={onOpenNewGoal}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>{t('goals.newGoal')}</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title={t('goals.noGoals')}
          description="Establish your strategic milestones and Key Results (OKRs). Link action items to measure real measurable momentum."
          actionLabel={t('goals.newGoal')}
          onAction={onOpenNewGoal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 lg:gap-5">
          {goals.map(goal => (
            <div
              key={goal.id}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 p-5 flex flex-col justify-between transition-all"
            >
              <div>
                {/* Meta Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-neutral-300">
                      {getCategoryLabel(goal.category)}
                    </span>
                    <span className="text-neutral-600">·</span>
                    <span className="text-xs text-neutral-400 capitalize">
                      {goal.timeframe === 'quarterly' ? t('goals.quarterly') : t('goals.annual')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditGoal(goal)}
                      className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
                      title={t('common.edit')}
                      aria-label="Edit goal"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-white/[0.05] transition-colors"
                      title={t('common.delete')}
                      aria-label="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-[15px] font-semibold text-white tracking-tight">{goal.title}</h3>
                {goal.description && (
                  <p className="text-[12px] text-neutral-500 mt-1 line-clamp-2">{goal.description}</p>
                )}

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center text-[11px] mb-1.5">
                    <span className="text-neutral-500 font-medium">{t('goals.progress')}</span>
                    <span className="font-mono font-bold text-indigo-400">{formatNumber(goal.progressPercent || 0)}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                      style={{ width: `${goal.progressPercent || 0}%` }}
                    />
                  </div>
                </div>

                {/* Key Results */}
                {goal.keyResults && goal.keyResults.length > 0 && (
                  <div className="mt-4 space-y-2.5">
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                      {t('goals.keyResults')}
                    </span>
                    {goal.keyResults.map(kr => (
                      <div key={kr.id} className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.07] text-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 transition-colors hover:bg-white/[0.04]">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${kr.completed ? 'text-emerald-400' : 'text-neutral-600'}`} />
                          <span className={`truncate ${kr.completed ? 'line-through text-neutral-500' : 'text-neutral-300'}`}>
                            {kr.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] text-neutral-400">
                          <input 
                            type="number"
                            value={kr.currentValue}
                            onChange={(e) => onUpdateKeyResult(goal.id, kr.id, parseFloat(e.target.value) || 0)}
                            className="w-12 bg-white/[0.05] border border-white/10 rounded px-1.5 py-0.5 text-center text-white focus:outline-none focus:border-indigo-500"
                          />
                          <span>/ {formatNumber(kr.targetValue)} {kr.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button: AI Decomposition */}
              <div className="mt-5 pt-3 border-t border-white/5">
                <button
                  onClick={() => onDecomposeGoal(goal.title, goal.category)}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[12px] font-semibold flex items-center justify-center gap-2 transition-all hover:border-indigo-500/40"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t('goals.decomposeWithAi')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
