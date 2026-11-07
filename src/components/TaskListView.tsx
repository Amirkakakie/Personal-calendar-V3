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
  List,
  ArrowUpDown,
  X,
  CheckSquare,
  Square,
  ArrowRight,
  Sparkles,
  Zap
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

type SortField = 'date' | 'priority' | 'title' | 'duration';

export const TaskListView: React.FC<TaskListViewProps> = ({
  tasks,
  onToggleTask,
  onToggleSubtask,
  onEditTask,
  onDeleteTask,
  onOpenNewTask
}) => {
  const { t, formatNumber, formatDate, formatTime, formatDuration, locale, direction } = useI18n();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeStatus, setActiveStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortField>('date');
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

  const priorityWeights: Record<string, number> = {
    High: 3,
    Medium: 2,
    Low: 1
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

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      return (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0);
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'duration') {
      return (b.durationMinutes || 0) - (a.durationMinutes || 0);
    }
    // Default 'date': earliest due date first
    const dateA = a.dueDate ? `${a.dueDate} ${a.dueTime || '00:00'}` : '9999-99-99';
    const dateB = b.dueDate ? `${b.dueDate} ${b.dueTime || '00:00'}` : '9999-99-99';
    return dateA.localeCompare(dateB);
  });

  const hasFiltersActive = activeCategory !== 'all' || activeStatus !== 'all' || searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    setActiveCategory('all');
    setActiveStatus('all');
    setSearchQuery('');
  };

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
      case 'High': return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
      case 'Medium': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'Low': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
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
      case 'Work/Career': return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'Academic/Study': return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'Personal Growth': return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'Health & Habits': return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      default: return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'todo': return t('tasks.todo');
      case 'in_progress': return t('tasks.inProgress');
      case 'completed': return t('tasks.completed');
      default: return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter Bar, Sorting, and View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl backdrop-blur-md">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('tasks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="app-input ps-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Selectors, Sorting & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="app-select w-auto text-xs"
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
            className="app-select w-auto text-xs"
          >
            <option value="all">{t('tasks.allStatus')}</option>
            <option value="todo">{t('tasks.todo')}</option>
            <option value="in_progress">{t('tasks.inProgress')}</option>
            <option value="completed">{t('tasks.completed')}</option>
          </select>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 rounded-xl px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="bg-transparent text-neutral-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="date" className="bg-neutral-900 text-white">{locale === 'fa' ? 'مهلت زمانی' : 'Due Date'}</option>
              <option value="priority" className="bg-neutral-900 text-white">{locale === 'fa' ? 'اولویت' : 'Priority'}</option>
              <option value="duration" className="bg-neutral-900 text-white">{locale === 'fa' ? 'مدت تخمینی' : 'Duration'}</option>
              <option value="title" className="bg-neutral-900 text-white">{locale === 'fa' ? 'عنوان (الفبا)' : 'Title'}</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasFiltersActive && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white text-xs transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('common.clear')}</span>
            </button>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title="Kanban Board"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* New Task Button */}
          <button
            type="button"
            onClick={onOpenNewTask}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>{t('tasks.newTask')}</span>
          </button>
        </div>
      </div>

      {/* Task Count Summary Strip */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1 font-mono">
        <span>
          {locale === 'fa' ? `نمایش ${formatNumber(sortedTasks.length)} از ${formatNumber(tasks.length)} کار` : `Showing ${formatNumber(sortedTasks.length)} of ${formatNumber(tasks.length)} tasks`}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-emerald-400">
            {formatNumber(tasks.filter(t => t.status === 'completed').length)} {locale === 'fa' ? 'تکمیل‌شده' : 'done'}
          </span>
          <span>•</span>
          <span className="text-amber-400">
            {formatNumber(tasks.filter(t => t.status === 'in_progress').length)} {locale === 'fa' ? 'در جریان' : 'in progress'}
          </span>
        </div>
      </div>

      {/* View Mode: List vs Kanban */}
      {viewMode === 'list' ? (
        <div className="space-y-2">
          {sortedTasks.length === 0 ? (
            <EmptyState
              icon={Check}
              title={tasks.length === 0 ? "Welcome! Create your first task" : t('tasks.noTasksFound')}
              description={tasks.length === 0 ? "Get started by creating your first action item. Organize your work by priority, Eisenhower quadrants, and circadian energy blocks." : "No tasks match your current category, status, or search query. Try clearing your filters."}
              actionLabel={t('tasks.newTask')}
              onAction={onOpenNewTask}
              secondaryActionLabel={hasFiltersActive ? t('common.clear') : undefined}
              onSecondaryAction={hasFiltersActive ? handleClearFilters : undefined}
            />
          ) : (
            sortedTasks.map(task => {
              const isDone = task.status === 'completed';
              const isInProgress = task.status === 'in_progress';
              const isExpanded = expandedTaskIds.has(task.id);
              const subtasks = task.subtasks || [];
              const completedSubtasks = subtasks.filter(s => s.completed).length;

              return (
                <div
                  key={task.id}
                  onClick={() => onEditTask(task)}
                  className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                    isDone 
                      ? 'border-neutral-800/60 opacity-60 bg-neutral-950/40 hover:opacity-80' 
                      : isInProgress
                      ? 'border-indigo-500/30 bg-indigo-950/10 hover:border-indigo-500/50'
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-900/60 hover:bg-neutral-850/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => handleTaskCheck(task.id, isDone, e)}
                      className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all border shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'border-neutral-700 hover:border-indigo-400 bg-neutral-950/60'
                      }`}
                      aria-label="Toggle task status"
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Task Title & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`text-sm font-semibold transition-colors ${
                            isDone ? 'line-through text-neutral-500' : 'text-neutral-100 group-hover:text-white'
                          }`}
                        >
                          {task.title}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getPriorityBadge(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getCategoryBadge(task.category)}`}>
                            {getCategoryLabel(task.category)}
                          </span>
                          {isInProgress && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {t('tasks.inProgress')}
                            </span>
                          )}
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 mt-2.5 text-xs text-neutral-500">
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 font-mono text-neutral-400">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{formatDate(task.dueDate)}</span>
                            {task.dueTime && <span className="text-neutral-500 font-mono">({task.dueTime})</span>}
                          </div>
                        )}

                        {task.durationMinutes && (
                          <div className="flex items-center gap-1.5 font-mono text-neutral-400">
                            <Clock className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{formatDuration(task.durationMinutes)}</span>
                          </div>
                        )}

                        {task.energyLevel && (
                          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>{task.energyLevel}</span>
                          </div>
                        )}
                        
                        {subtasks.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(task.id, e)}
                            className="flex items-center gap-1 text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
                          >
                            <span>
                              {formatNumber(completedSubtasks)}/{formatNumber(subtasks.length)} subtasks
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expanded Subtasks Checklist */}
                      {isExpanded && subtasks.length > 0 && (
                        <div 
                          className="mt-3 pt-3 border-t border-neutral-800 space-y-2 animate-fadeIn"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                            {locale === 'fa' ? 'مراحل و اقدامات خرد:' : 'Checklist Steps:'}
                          </div>
                          <div className="space-y-1.5">
                            {subtasks.map(st => (
                              <div
                                key={st.id}
                                onClick={() => onToggleSubtask(task.id, st.id)}
                                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-800/50 transition-colors cursor-pointer text-xs"
                              >
                                {st.completed ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-neutral-600 shrink-0" />
                                )}
                                <span className={st.completed ? 'line-through text-neutral-500' : 'text-neutral-300'}>
                                  {st.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div 
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                      onClick={(e) => e.stopPropagation()}
                    >
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
                          if (window.confirm(t('tasks.deleteConfirm'))) {
                            onDeleteTask(task.id);
                          }
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
        /* Full Personal Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map(statusCol => {
            const colTasks = sortedTasks.filter(t => t.status === statusCol);
            const statusTitle = getStatusLabel(statusCol);

            return (
              <div 
                key={statusCol} 
                className="flex flex-col bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3.5 min-h-[480px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800/80 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      statusCol === 'completed' ? 'bg-emerald-500' : statusCol === 'in_progress' ? 'bg-amber-500' : 'bg-indigo-500'
                    }`} />
                    <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                      {statusTitle}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                    {formatNumber(colTasks.length)}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="flex-1 space-y-2.5 overflow-y-auto">
                  {colTasks.length > 0 ? (
                    colTasks.map(task => {
                      const isDone = task.status === 'completed';
                      const subtasks = task.subtasks || [];
                      const completedSubtasks = subtasks.filter(s => s.completed).length;

                      return (
                        <div 
                          key={task.id} 
                          onClick={() => onEditTask(task)} 
                          className="p-3.5 bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 rounded-xl cursor-pointer hover:bg-neutral-850/60 transition-all space-y-2.5 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-xs font-semibold leading-snug ${isDone ? 'line-through text-neutral-500' : 'text-neutral-100 group-hover:text-white'}`}>
                              {task.title}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleTaskCheck(task.id, isDone, e)}
                              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                                isDone ? 'bg-emerald-500 border-emerald-500 text-neutral-950' : 'border-neutral-700 hover:border-indigo-400'
                              }`}
                            >
                              {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${getPriorityBadge(task.priority)}`}>
                              {getPriorityLabel(task.priority)}
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${getCategoryBadge(task.category)}`}>
                              {getCategoryLabel(task.category)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/60">
                            {task.dueDate ? (
                              <span className="font-mono">{formatDate(task.dueDate)}</span>
                            ) : (
                              <span />
                            )}
                            {subtasks.length > 0 && (
                              <span className="text-indigo-400 font-mono text-[10px]">
                                {completedSubtasks}/{subtasks.length}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-32 border border-dashed border-neutral-800 rounded-xl flex items-center justify-center p-4 text-center">
                      <span className="text-xs text-neutral-500">
                        {locale === 'fa' ? 'هیچ کاری در این بخش نیست' : 'No tasks in this lane'}
                      </span>
                    </div>
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
