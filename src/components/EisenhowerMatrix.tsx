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
              className={`flex flex-col rounded-2xl border bg-neutral-900/80 p-4 transition-all shadow-sm ${q.borderColor}`}
            >
              {/* Quadrant Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800/80">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${q.headerBg} shrink-0`}>
                    {q.title}
                  </span>
                  <span className="text-xs text-neutral-400 truncate hidden sm:inline">
                    {q.subtitle}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-mono text-neutral-400 font-medium">
                    {formatNumber(completedCount)}/{formatNumber(qTasks.length)}
                  </span>
                  {onAddTaskToQuadrant && (
                    <button
                      type="button"
                      onClick={() => onAddTaskToQuadrant(q.id)}
                      className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                      title={t('common.add')}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quadrant Subtitle badge for mobile */}
              <div className="sm:hidden mb-2">
                <span className="text-[10px] text-neutral-400">
                  {q.subtitle}
                </span>
              </div>

              {/* Task list container */}
              <div className="space-y-2 flex-1 min-h-[140px] max-h-[460px] overflow-y-auto pe-1">
                {qTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs text-neutral-600 py-8 gap-2">
                    <span>{t('tasks.noTasksFound')}</span>
                    {onAddTaskToQuadrant && (
                      <button
                        type="button"
                        onClick={() => onAddTaskToQuadrant(q.id)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        + {t('tasks.newTask')}
                      </button>
                    )}
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
                            ? 'bg-neutral-950/40 border-neutral-850 opacity-60'
                            : 'bg-neutral-850/80 hover:bg-neutral-800 border-neutral-700/60 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTask(task.id);
                            }}
                            className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center transition-colors border shrink-0 ${
                              isDone
                                ? 'bg-emerald-500 border-emerald-500 text-neutral-950'
                                : 'border-neutral-500 hover:border-neutral-300 bg-neutral-800'
                            }`}
                          >
                            {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-xs font-semibold transition-colors ${
                                  isDone ? 'line-through text-neutral-500' : 'text-neutral-200'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>

                            {task.description && (
                              <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                                {task.description}
                              </p>
                            )}

                            {/* Tags and Meta */}
                            <div className="flex items-center gap-2 mt-2 text-[11px] flex-wrap">
                              <span className={`px-2 py-0.2 rounded border ${getCategoryBadgeClass(task.category)}`}>
                                {getCategoryLabel(task.category)}
                              </span>

                              {task.dueDate && (
                                <span className="flex items-center gap-1 text-neutral-400 font-mono">
                                  <Clock className="w-3 h-3 text-neutral-500 shrink-0" />
                                  <span>{formatDate(task.dueDate)} {task.dueTime ? formatTime(task.dueTime) : ''}</span>
                                </span>
                              )}

                              {task.syncedToGoogle && (
                                <span className="flex items-center gap-1 text-blue-400">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  <span>{locale === 'fa' ? 'تقویم گوگل' : 'GCal'}</span>
                                </span>
                              )}

                              {task.durationMinutes && (
                                <span className="text-neutral-500">
                                  {formatNumber(task.durationMinutes)} {t('common.minutes')}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action controls */}
                          <div 
                            className="flex items-center gap-1 opacity-100 sm:opacity-80 sm:hover:opacity-100 transition-opacity shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-700 transition-colors"
                              title={t('common.edit')}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onDeleteTask && (
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                className="p-1 text-neutral-400 hover:text-rose-400 rounded hover:bg-neutral-700 transition-colors"
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
