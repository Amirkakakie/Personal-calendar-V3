import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Clock, 
  Trash2, 
  Edit3, 
  Check, 
  Calendar, 
  Plus,
  ArrowRightLeft,
  CheckSquare,
  Sparkles,
  Layers
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
  onAddTaskToQuadrant,
  onMoveQuadrant
}) => {
  const { t, formatNumber, formatDate, locale } = useI18n();
  const [activeMoveMenuTaskId, setActiveMoveMenuTaskId] = useState<string | null>(null);
  const [mobileQuadrantFilter, setMobileQuadrantFilter] = useState<'all' | EisenhowerQuadrant>('all');

  useEffect(() => {
    if (!activeMoveMenuTaskId) return;
    const handleGlobalClick = () => setActiveMoveMenuTaskId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeMoveMenuTaskId]);

  const quadrants: {
    id: EisenhowerQuadrant;
    shortLabel: string;
    title: string;
    subtitle: string;
    badge: string;
    description: string;
    headerBg: string;
    badgeStyle: string;
    borderColor: string;
    accentColor: string;
    emptyAdvice: string;
  }[] = [
    {
      id: 'q1_urgent_important',
      shortLabel: 'Q1',
      title: t('eisenhower.q1Title'),
      subtitle: t('eisenhower.q1Subtitle'),
      badge: locale === 'fa' ? 'فوری + حیاتی (انجام سریع)' : 'Do First • Critical & Pressing',
      description: locale === 'fa' ? 'بحران‌ها، موعدهای نزدیک و کارهای اضطراری' : 'Crises, immediate deadlines, critical problems',
      headerBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      badgeStyle: 'text-rose-400 font-semibold',
      borderColor: 'border-rose-900/40 hover:border-rose-700/60',
      accentColor: 'text-rose-400',
      emptyAdvice: locale === 'fa' 
        ? 'آرامش در منطقه اضطرار! هیچ کار فوری و حیاتی باقی نمانده است. انرژی خود را صرف بخش ۲ کنید.'
        : 'Zero fires burning! No urgent crises right now. Invest this high-leverage focus into Quadrant 2.'
    },
    {
      id: 'q2_not_urgent_important',
      shortLabel: 'Q2',
      title: t('eisenhower.q2Title'),
      subtitle: t('eisenhower.q2Subtitle'),
      badge: locale === 'fa' ? 'رشد بلندمدت (برنامه‌ریزی دقیق)' : 'Schedule • Strategic Growth',
      description: locale === 'fa' ? 'توسعه مهارت، برنامه‌ریزی استراتژیک، سلامت و نوآوری' : 'Deep work, skill acquisition, long-term leverage & health',
      headerBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      badgeStyle: 'text-emerald-400 font-semibold',
      borderColor: 'border-emerald-900/40 hover:border-emerald-700/60',
      accentColor: 'text-emerald-400',
      emptyAdvice: locale === 'fa'
        ? 'بخش دوم کلید موفقیت پایدار است. یک هدف استراتژیک یا یادگیری عمیق به این بخش اضافه کنید.'
        : 'The Quadrant of Mastery is empty! Add high-impact goals, research, or skill practice here.'
    },
    {
      id: 'q3_urgent_not_important',
      shortLabel: 'Q3',
      title: t('eisenhower.q3Title'),
      subtitle: t('eisenhower.q3Subtitle'),
      badge: locale === 'fa' ? 'واگذاری یا تجمیع (فوری غیرحیاتی)' : 'Delegate / Batch • Time Traps',
      description: locale === 'fa' ? 'وقفه‌ها، جلسات کم‌اثر و درخواست‌های فوری دیگران' : 'Interruptions, busywork, urgent requests from others',
      headerBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      badgeStyle: 'text-amber-400 font-semibold',
      borderColor: 'border-amber-900/40 hover:border-amber-700/60',
      accentColor: 'text-amber-400',
      emptyAdvice: locale === 'fa'
        ? 'عالی است! هیچ تله زمانی و درخواست فوری بی‌اثر وجود ندارد.'
        : 'No interruptions or busywork currently cataloged. Guard your calendar ruthlessly.'
    },
    {
      id: 'q4_neither',
      shortLabel: 'Q4',
      title: t('eisenhower.q4Title'),
      subtitle: t('eisenhower.q4Subtitle'),
      badge: locale === 'fa' ? 'حذف و پاکسازی (فاقد ارزش)' : 'Eliminate • Low Leverage',
      description: locale === 'fa' ? 'اتلاف وقت، فعالیت‌های حاشیه‌ای و کارهای غیرضروری' : 'Distractions, busywork loops, escapism, low-value noise',
      headerBg: 'bg-neutral-800 text-neutral-300 border-neutral-700/60',
      badgeStyle: 'text-neutral-400 font-semibold',
      borderColor: 'border-neutral-800 hover:border-neutral-700',
      accentColor: 'text-neutral-400',
      emptyAdvice: locale === 'fa'
        ? 'فضای ذهنی تمیز! هیچ فعالیت اتلاف وقتی در این بخش ثبت نشده است.'
        : 'Clear backlog! No low-leverage distractions clogging your cognitive capacity.'
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

  const visibleQuadrants = mobileQuadrantFilter === 'all' 
    ? quadrants 
    : quadrants.filter(q => q.id === mobileQuadrantFilter);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Header & Strategy Summary */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-5 backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Target className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t('eisenhower.title')}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            {t('eisenhower.subtitle')}
          </p>
        </div>

        {/* Aggregate Quadrant Counters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {quadrants.map(q => {
            const count = tasks.filter(t => (t.eisenhower || 'q2_not_urgent_important') === q.id && t.status !== 'completed').length;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setMobileQuadrantFilter(prev => prev === q.id ? 'all' : q.id)}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs shrink-0 transition-all ${
                  mobileQuadrantFilter === q.id 
                    ? 'bg-neutral-800 border-indigo-500/50 ring-1 ring-indigo-500/30' 
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span className={`font-mono font-bold ${q.accentColor}`}>{q.shortLabel}</span>
                <span className="font-mono text-neutral-200 tabular-nums">{formatNumber(count)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Segmented Filter Bar (< 768px) */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-x-auto md:hidden custom-scrollbar">
        <button
          type="button"
          onClick={() => setMobileQuadrantFilter('all')}
          className={`flex-1 min-w-[70px] min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mobileQuadrantFilter === 'all'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {locale === 'fa' ? 'تمام ۴ ربع' : 'All 4'}
        </button>
        {quadrants.map(q => (
          <button
            key={q.id}
            type="button"
            onClick={() => setMobileQuadrantFilter(q.id)}
            className={`min-w-[64px] min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mobileQuadrantFilter === q.id
                ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span className={q.accentColor}>{q.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Responsive Matrix Grid */}
      <div className={`grid gap-5 ${
        mobileQuadrantFilter === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
      }`}>
        {visibleQuadrants.map(q => {
          const qTasks = tasks.filter(t => (t.eisenhower || 'q2_not_urgent_important') === q.id);
          const completedCount = qTasks.filter(t => t.status === 'completed').length;

          return (
            <div
              key={q.id}
              className={`flex flex-col rounded-2xl border bg-neutral-900/60 p-4 sm:p-5 transition-all duration-200 ${q.borderColor}`}
            >
              {/* Quadrant Header */}
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/5 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${q.headerBg} border`}>
                    {q.shortLabel}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">{q.title}</h3>
                      <span className={`text-[11px] truncate ${q.badgeStyle}`}>
                        • {q.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">{q.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono font-medium text-neutral-400 bg-neutral-950/70 border border-neutral-800 px-2.5 py-1 rounded-lg tabular-nums">
                    {formatNumber(completedCount)}/{formatNumber(qTasks.length)}
                  </span>
                  {onAddTaskToQuadrant && (
                    <button
                      type="button"
                      onClick={() => onAddTaskToQuadrant(q.id)}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
                      title={t('common.add')}
                      aria-label={`Add task to ${q.title}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Task list container */}
              <div className="space-y-2.5 flex-1 min-h-[160px] max-h-[460px] overflow-y-auto pe-1 custom-scrollbar">
                {qTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-neutral-800/80 rounded-xl my-2">
                    <Sparkles className="w-6 h-6 text-neutral-600 mb-2" />
                    <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                      {q.emptyAdvice}
                    </p>
                    {onAddTaskToQuadrant && (
                      <button
                        type="button"
                        onClick={() => onAddTaskToQuadrant(q.id)}
                        className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium hover:underline flex items-center gap-1 min-h-[36px] items-center"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('tasks.newTask')}</span>
                      </button>
                    )}
                  </div>
                ) : (
                  qTasks.map(task => {
                    const isDone = task.status === 'completed';
                    const subtasks = task.subtasks || [];
                    const completedSubtasks = subtasks.filter(s => s.completed).length;
                    const isMoveMenuOpen = activeMoveMenuTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className={`group p-3 sm:p-3.5 rounded-xl border transition-all relative ${
                          isDone
                            ? 'bg-neutral-950/40 border-neutral-800/50 opacity-60'
                            : 'bg-neutral-950/80 hover:bg-neutral-950 border-neutral-800/80 hover:border-neutral-700 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Complete Checkbox (min 44px hitbox) */}
                          <button
                            type="button"
                            onClick={() => onToggleTask(task.id)}
                            className="w-8 h-8 -ms-1 -mt-1 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors shrink-0"
                            aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center transition-all border ${
                              isDone
                                ? 'bg-emerald-500 border-emerald-500 text-neutral-950'
                                : 'border-neutral-700 hover:border-indigo-400 bg-neutral-900'
                            }`}>
                              {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>

                          {/* Task Content */}
                          <div 
                            className="flex-1 min-w-0 cursor-pointer pt-0.5"
                            onClick={() => onEditTask(task)}
                          >
                            <span
                              className={`text-xs font-semibold block transition-colors leading-snug ${
                                isDone ? 'line-through text-neutral-500' : 'text-neutral-100 hover:text-indigo-300'
                              }`}
                            >
                              {task.title}
                            </span>

                            {/* Unboxed Metadata (Zero-Pill Rule) */}
                            <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-400 flex-wrap">
                              <span className="text-neutral-300 font-medium">
                                {getCategoryLabel(task.category)}
                              </span>

                              {task.dueDate && (
                                <>
                                  <span className="text-neutral-600">·</span>
                                  <span className="flex items-center gap-1 font-mono text-neutral-400 tabular-nums">
                                    <Calendar className="w-3 h-3 opacity-60" />
                                    <span>{formatDate(task.dueDate)}</span>
                                  </span>
                                </>
                              )}

                              {task.durationMinutes && (
                                <>
                                  <span className="text-neutral-600">·</span>
                                  <span className="flex items-center gap-1 font-mono text-neutral-400 tabular-nums">
                                    <Clock className="w-3 h-3 opacity-60" />
                                    <span>{formatNumber(task.durationMinutes)}m</span>
                                  </span>
                                </>
                              )}

                              {subtasks.length > 0 && (
                                <>
                                  <span className="text-neutral-600">·</span>
                                  <span className="flex items-center gap-1 font-mono text-indigo-400 tabular-nums">
                                    <CheckSquare className="w-3 h-3" />
                                    <span>{formatNumber(completedSubtasks)}/{formatNumber(subtasks.length)}</span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action Controls & Quick Move (44px min hitboxes) */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {/* Quick Quadrant Reassigner */}
                            {onMoveQuadrant && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMoveMenuTaskId(isMoveMenuOpen ? null : task.id);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                                  title={locale === 'fa' ? 'تغییر ربع آیزنهاور' : 'Move to another quadrant'}
                                  aria-label="Change quadrant"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>

                                {isMoveMenuOpen && (
                                  <div 
                                    className="absolute end-0 top-full mt-1 w-40 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl py-1 z-30 animate-fadeIn"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-400">
                                      {locale === 'fa' ? 'انتقال به ربع' : 'Move to'}
                                    </div>
                                    {quadrants.map(targetQ => (
                                      <button
                                        key={targetQ.id}
                                        type="button"
                                        disabled={targetQ.id === q.id}
                                        onClick={() => {
                                          onMoveQuadrant(task.id, targetQ.id);
                                          setActiveMoveMenuTaskId(null);
                                        }}
                                        className={`w-full text-start px-3 py-2 text-xs flex items-center justify-between transition-colors min-h-[36px] ${
                                          targetQ.id === q.id
                                            ? 'text-neutral-600 cursor-not-allowed bg-neutral-800/40'
                                            : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                                        }`}
                                      >
                                        <span className={`font-mono font-bold ${targetQ.accentColor}`}>{targetQ.shortLabel}</span>
                                        <span className="text-[11px] truncate ms-2">{targetQ.title}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTask(task);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                              title={t('common.edit')}
                              aria-label="Edit task"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {onDeleteTask && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteTask(task.id);
                                }}
                                className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors"
                                title={t('common.delete')}
                                aria-label="Delete task"
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
