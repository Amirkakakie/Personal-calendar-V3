import React from 'react';
import { 
  Target, 
  Clock, 
  Trash2, 
  Edit3, 
  Check, 
  Calendar, 
  Plus
} from 'lucide-react';
import type { Task, EisenhowerQuadrant } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface EisenhowerMatrixProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (id: string) => void;
  onAddTaskToQuadrant?: (quadrant: EisenhowerQuadrant) => void;
  onMoveQuadrant?: (taskId: string, targetQuadrant: EisenhowerQuadrant) => void;
  onOpenGoogleWebLink?: (taskId: string) => void;
}

export const EisenhowerMatrix: React.FC<EisenhowerMatrixProps> = ({
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddTaskToQuadrant
}) => {
  const { t, formatNumber, formatDate, formatTime, locale } = useI18n();

  const quadrants: {
    id: EisenhowerQuadrant;
    title: string;
    subtitle: string;
    badge: string;
    headerBg: string;
    borderColor: string;
    accentColor: string;
  }[] = [
    {
      id: 'q1_urgent_important',
      title: t('eisenhower.q1Title'),
      subtitle: t('eisenhower.q1Subtitle'),
      badge: locale === 'fa' ? 'فوری + اثرگذاری بالا' : 'Urgent + High Impact',
      headerBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
      borderColor: 'border-rose-900/40 hover:border-rose-700/60',
      accentColor: 'text-rose-400'
    },
    {
      id: 'q2_not_urgent_important',
      title: t('eisenhower.q2Title'),
      subtitle: t('eisenhower.q2Subtitle'),
      badge: locale === 'fa' ? 'منطقه رشد و ارزش بلندمدت' : 'High Value / Growth Zone',
      headerBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      borderColor: 'border-emerald-900/40 hover:border-emerald-700/60',
      accentColor: 'text-emerald-400'
    },
    {
      id: 'q3_urgent_not_important',
      title: t('eisenhower.q3Title'),
      subtitle: t('eisenhower.q3Subtitle'),
      badge: locale === 'fa' ? 'دام زمانی / تجمیع کارهای خرد' : 'Time Traps / Batchable',
      headerBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      borderColor: 'border-amber-900/40 hover:border-amber-700/60',
      accentColor: 'text-amber-400'
    },
    {
      id: 'q4_neither',
      title: t('eisenhower.q4Title'),
      subtitle: t('eisenhower.q4Subtitle'),
      badge: locale === 'fa' ? 'ارزش پایین / نیازمند حذف' : 'Low Leverage / Prune',
      headerBg: 'bg-neutral-800 text-neutral-400 border-neutral-700',
      borderColor: 'border-neutral-800 hover:border-neutral-700',
      accentColor: 'text-neutral-400'
    }
  ];

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'Work/Career': return t('categories.workCareer');
      case 'Academic/Study': return t('categories.academicStudy');
      case 'Personal Growth': return t('categories.personalGrowth');
      case 'Health & Habits': return t('categories.healthHabits');
      default: return category;
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Work/Career': return 'bg-blue-500/10 text-blue-300 border-blue-500/20';
      case 'Academic/Study': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      case 'Personal Growth': return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      case 'Health & Habits': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default: return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            {t('eisenhower.title')}
          </h2>
          <p className="text-xs text-neutral-400">
            {t('eisenhower.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrants.map(q => {
          const qTasks = tasks.filter(t => (t.eisenhower || 'q2_not_urgent_important') === q.id);
          const completedCount = qTasks.filter(t => t.status === 'completed').length;

          return (
            <div
              key={q.id}
              className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/10"
            >
              {/* Quadrant Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${q.headerBg.split(' ')[0]} border border-white/10`}>
                    <Target className={`w-3.5 h-3.5 ${q.accentColor}`} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-neutral-200">{q.title}</h3>
                    <p className="text-[11px] text-neutral-500">{q.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono font-medium text-neutral-500 bg-white/5 px-2 py-0.5 rounded-full">
                    {formatNumber(completedCount)} / {formatNumber(qTasks.length)}
                  </span>
                  {onAddTaskToQuadrant && (
                    <button
                      type="button"
                      onClick={() => onAddTaskToQuadrant(q.id)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-all"
                      title={t('common.add')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Task list container */}
              <div className="space-y-2 flex-1 min-h-[140px] max-h-[460px] overflow-y-auto pe-1">
                {qTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[12px] text-neutral-600 py-8">
                    <span>{t('tasks.noTasksFound')}</span>
                  </div>
                ) : (
                  qTasks.map(task => {
                    const isDone = task.status === 'completed';

                    return (
                      <div
                        key={task.id}
                        onClick={() => onEditTask(task)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                          isDone
                            ? 'bg-white/[0.01] border-white/5 opacity-60'
                            : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTask(task.id);
                            }}
                            className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center transition-all border shrink-0 ${
                              isDone
                                ? 'bg-emerald-500 border-emerald-500 text-neutral-950'
                                : 'border-white/20 hover:border-indigo-400 bg-white/[0.03]'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-[13px] font-medium transition-colors ${
                                isDone ? 'line-through text-neutral-500' : 'text-neutral-200'
                              }`}
                            >
                              {task.title}
                            </span>

                            {/* Tags and Meta */}
                            <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md border ${getCategoryBadgeClass(task.category)}`}>
                                {getCategoryLabel(task.category)}
                              </span>

                              {task.dueDate && (
                                <span className="flex items-center gap-1 font-mono opacity-70">
                                  {formatDate(task.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action controls */}
                          <div 
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-white/[0.05]"
                              title={t('common.edit')}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteTask && (
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-white/[0.05]"
                                title={t('common.delete')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
