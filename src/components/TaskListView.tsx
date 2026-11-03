import React, { useState } from 'react';
import { 
  Check, 
  Clock, 
  Calendar, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Flame,
  LayoutGrid,
  List
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Task, TaskStatus } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { EmptyState } from './EmptyState.tsx';

interface TaskListViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onOpenNewTask: () => void;
}

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  onToggleTask,
  onToggleSubtask,
  onEditTask,
  onDeleteTask,
  onOpenNewTask
}) => {
  const { t, formatNumber, formatDate, formatTime, formatDuration, locale } = useI18n();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  const toggleExpand = (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const handleTaskCheck = (taskId: string, isCurrentlyDone: boolean, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isCurrentlyDone) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
    onToggleTask(taskId);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = activeCategory === 'all' || task.category === activeCategory;
    const matchesStatus = activeStatus === 'all' || task.status === activeStatus;
    const cleanSearch = searchQuery.trim().toLowerCase();
    const matchesSearch = !cleanSearch || 
      task.title.toLowerCase().includes(cleanSearch) ||
      (task.description && task.description.toLowerCase().includes(cleanSearch)) ||
      (task.tags && task.tags.some(tag => tag.toLowerCase().includes(cleanSearch)));
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'High': return locale === 'fa' ? 'فوری/بالا' : 'High';
      case 'Medium': return locale === 'fa' ? 'متوسط' : 'Medium';
      case 'Low': return locale === 'fa' ? 'پایین' : 'Low';
      default: return priority;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case 'Low': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
      default: return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'Work/Career': return t('categories.workCareer');
      case 'Academic/Study': return t('categories.academicStudy');
      case 'Personal Growth': return t('categories.personalGrowth');
      case 'Health & Habits': return t('categories.healthHabits');
      default: return category;
    }
  };

  const getCategoryBadge = (category: string) => {
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
      {/* Search, Filter Bar, and View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('tasks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl ps-9 pe-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Selectors & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{t('tasks.allCategories')}</option>
            <option value="Work/Career">{t('categories.workCareer')}</option>
            <option value="Academic/Study">{t('categories.academicStudy')}</option>
            <option value="Personal Growth">{t('categories.personalGrowth')}</option>
            <option value="Health & Habits">{t('categories.healthHabits')}</option>
          </select>

          {/* Status Filter */}
          <select
            value={activeStatus}
            onChange={(e) => setActiveStatus(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{t('tasks.allStatus')}</option>
            <option value="todo">{t('tasks.todo')}</option>
            <option value="in_progress">{t('tasks.inProgress')}</option>
            <option value="completed">{t('tasks.completed')}</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-indigo-600 text-white shadow' : 'text-neutral-400 hover:text-white'}`}
              title="Kanban Board"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Task Button */}
          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('tasks.newTask')}</span>
          </button>
        </div>
      </div>

      {/* View Mode: List vs Kanban */}
      {viewMode === 'list' ? (
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={Check}
              title={tasks.length === 0 ? "Welcome! Create your first task" : t('tasks.noTasksFound')}
              description={tasks.length === 0 ? "Get started by creating your first action item. Organize your work by priority, Eisenhower quadrants, and circadian energy blocks." : "No tasks match your current category, status, or search query. Try clearing your filters."}
              actionLabel={t('tasks.newTask')}
              onAction={onOpenNewTask}
            />
          ) : (
            filteredTasks.map(task => {
              const isDone = task.status === 'completed';
              const isExpanded = expandedTaskIds.has(task.id);
              const subtasks = task.subtasks || [];
              const completedSubtasks = subtasks.filter(s => s.completed).length;

              return (
                <div
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                    isDone 
                      ? 'border-neutral-850 opacity-65 bg-neutral-950/40' 
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/90 hover:bg-neutral-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => handleTaskCheck(task.id, isDone, e)}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors border shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-neutral-950 shadow-sm shadow-emerald-500/30'
                          : 'border-neutral-600 hover:border-indigo-400 bg-neutral-800'
                      }`}
                      aria-label="Toggle task status"
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Task Title & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold transition-colors ${
                            isDone ? 'line-through text-neutral-500' : 'text-neutral-100'
                          }`}
                        >
                          {task.title}
                        </span>

                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getPriorityBadge(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>

                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${getCategoryBadge(task.category)}`}>
                          {getCategoryLabel(task.category)}
                        </span>

                        {task.xpReward && (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                            <Flame className="w-3 h-3 fill-amber-400" />
                            <span>+{formatNumber(task.xpReward)} XP</span>
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Metadata badges */}
                      <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[11px] text-neutral-400">
                        {task.dueDate && (
                          <div className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span>{formatDate(task.dueDate)} {task.dueTime ? formatTime(task.dueTime) : ''}</span>
                          </div>
                        )}

                        {task.durationMinutes && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                            <span>{formatDuration(task.durationMinutes)}</span>
                          </div>
                        )}

                        {task.syncedToGoogle && (
                          <span className="text-blue-400 font-medium">
                            ✓ {t('tasks.syncedBadge')}
                          </span>
                        )}

                        {subtasks.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(task.id, e)}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                          >
                            <span>
                              {formatNumber(completedSubtasks)}/{formatNumber(subtasks.length)} {t('tasks.subtasks')}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        )}
                      </div>

                      {/* Subtasks Expanded Checklist */}
                      {isExpanded && subtasks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                          {subtasks.map(st => (
                            <div key={st.id} className="flex items-center gap-2 text-xs text-neutral-300">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleSubtask(task.id, st.id);
                                }}
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                                  st.completed 
                                    ? 'bg-emerald-500 border-emerald-500 text-neutral-950' 
                                    : 'border-neutral-600 bg-neutral-900'
                                }`}
                              >
                                {st.completed && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </button>
                              <span className={st.completed ? 'line-through text-neutral-500' : ''}>
                                {st.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {task.syncedToGoogle && task.dueDate && (
                        <a
                          href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(task.title)}&details=${encodeURIComponent(task.description || '')}&dates=${task.dueDate.replace(/-/g, '')}T${(task.dueTime || '10:00').replace(':', '')}00Z/${task.dueDate.replace(/-/g, '')}T${(task.dueTime || '10:00').replace(':', '')}00Z`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-neutral-500 hover:text-blue-400 rounded-lg hover:bg-neutral-800 transition-colors"
                          title="Google Calendar"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(task);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Kanban Columns */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map(statusCol => {
            const colTasks = filteredTasks.filter(t => t.status === statusCol);
            const colLabel = statusCol === 'todo' ? t('tasks.todo') : statusCol === 'in_progress' ? t('tasks.inProgress') : t('tasks.completed');
            const colBadge = statusCol === 'todo' 
              ? 'bg-neutral-800 text-neutral-300' 
              : statusCol === 'in_progress' 
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';

            return (
              <div key={statusCol} className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${colBadge}`}>
                    {colLabel}
                  </span>
                  <span className="text-xs text-neutral-400 font-mono font-medium">
                    {formatNumber(colTasks.length)}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 min-h-[160px] max-h-[500px] overflow-y-auto pe-1">
                  {colTasks.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-neutral-600 py-6">
                      {locale === 'fa' ? 'خالی' : 'Empty'}
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => onEditTask(task)}
                        className="p-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-semibold ${task.status === 'completed' ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>
                            {task.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleTaskCheck(task.id, task.status === 'completed', e)}
                            className={`w-4 h-4 rounded shrink-0 flex items-center justify-center border transition-colors ${task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-neutral-950' : 'border-neutral-600 bg-neutral-900 hover:border-indigo-400'}`}
                          >
                            {task.status === 'completed' && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2 text-[10px] flex-wrap">
                          <span className={`px-1.5 py-0.2 rounded border ${getCategoryBadge(task.category)}`}>
                            {getCategoryLabel(task.category)}
                          </span>
                          {task.dueDate && (
                            <span className="text-neutral-400">
                              📅 {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-neutral-700/50" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="p-1 text-neutral-400 hover:text-white"
                            title={t('common.edit')}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1 text-neutral-400 hover:text-rose-400"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
