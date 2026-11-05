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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-500 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('tasks.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl ps-9 pe-3.5 py-2 text-[13px] text-white placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
          />
        </div>

        {/* Filter Selectors & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[13px] text-neutral-300 focus:outline-none focus:border-indigo-500/50 hover:bg-white/[0.05] transition-all"
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
            className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-[13px] text-neutral-300 focus:outline-none focus:border-indigo-500/50 hover:bg-white/[0.05] transition-all"
          >
            <option value="all">{t('tasks.allStatus')}</option>
            <option value="todo">{t('tasks.todo')}</option>
            <option value="in_progress">{t('tasks.inProgress')}</option>
            <option value="completed">{t('tasks.completed')}</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-white/[0.03] border border-white/5 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10' : 'text-neutral-500 hover:text-neutral-300'}`}
              title="Kanban Board"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* New Task Button */}
          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[13px] font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('tasks.newTask')}</span>
          </button>
        </div>
      </div>

      {/* View Mode: List vs Kanban */}
      {viewMode === 'list' ? (
        <div className="space-y-2">
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
                  className={`group p-4 rounded-xl border transition-all cursor-pointer ${
                    isDone 
                      ? 'border-white/5 opacity-60 bg-white/[0.01]' 
                      : 'border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => handleTaskCheck(task.id, isDone, e)}
                      className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all border shrink-0 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-neutral-950 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          : 'border-white/20 hover:border-indigo-400 bg-white/[0.03]'
                      }`}
                      aria-label="Toggle task status"
                    >
                      {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* Task Title & Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`text-[14px] font-medium transition-colors ${
                            isDone ? 'line-through text-neutral-500' : 'text-neutral-200'
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
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-[13px] text-neutral-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-[12px] text-neutral-500">
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 font-mono">
                            <Calendar className="w-3.5 h-3.5 opacity-60" />
                            <span>{formatDate(task.dueDate)}</span>
                          </div>
                        )}

                        {task.durationMinutes && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-60" />
                            <span>{formatDuration(task.durationMinutes)}</span>
                          </div>
                        )}
                        
                        {subtasks.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(task.id, e)}
                            className="flex items-center gap-1.5 text-indigo-400 font-medium hover:text-indigo-300"
                          >
                            <span>
                              {formatNumber(completedSubtasks)}/{formatNumber(subtasks.length)} subtasks
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(task);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-white/[0.05]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-white/[0.05]"
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
        /* Kanban Board Implementation TBD for refinement */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['todo', 'in_progress', 'completed'] as TaskStatus[]).map(statusCol => {
            const colTasks = filteredTasks.filter(t => t.status === statusCol);
            return (
              <div key={statusCol} className="flex flex-col gap-3">
                <div className="px-1 text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex justify-between items-center">
                  {statusCol.replace('_', ' ')}
                  <span className="bg-white/5 px-2 py-0.5 rounded-full text-neutral-400">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(task => (
                    <div key={task.id} onClick={() => onEditTask(task)} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-all">
                      <span className="text-[13px] font-medium text-neutral-200">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
