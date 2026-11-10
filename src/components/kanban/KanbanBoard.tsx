import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  HelpCircle,
  Users,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import type { TeamTask, KanbanColumnId, TeamTaskPriority } from '../../types/team.ts';
import { useTeam } from '../../context/TeamContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { KanbanCard } from './KanbanCard.tsx';
import { TeamTaskModal } from './TeamTaskModal.tsx';

interface ColumnConfig {
  id: KanbanColumnId;
  titleKey: string;
  colorDot: string;
  badgeBg: string;
}

const COLUMNS: ColumnConfig[] = [
  { id: 'backlog', titleKey: 'kanban.backlog', colorDot: 'bg-neutral-500', badgeBg: 'bg-neutral-800 text-neutral-400' },
  { id: 'todo', titleKey: 'kanban.todo', colorDot: 'bg-indigo-500', badgeBg: 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40' },
  { id: 'in_progress', titleKey: 'kanban.inProgress', colorDot: 'bg-amber-500', badgeBg: 'bg-amber-950/60 text-amber-400 border border-amber-800/40' },
  { id: 'in_review', titleKey: 'kanban.inReview', colorDot: 'bg-sky-500', badgeBg: 'bg-sky-950/60 text-sky-400 border border-sky-800/40' },
  { id: 'completed', titleKey: 'kanban.completed', colorDot: 'bg-emerald-500', badgeBg: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' }
];

export const KanbanBoard: React.FC = () => {
  const { currentProject, projectTasks, teamMembers, moveTask, createTask, filter, setFilter, clearFilter } = useTeam();
  const { t, direction, formatNumber } = useI18n();

  // Active Task Modal State
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultCol, setModalDefaultCol] = useState<KanbanColumnId>('todo');

  // Drag over target tracking
  const [dragOverCol, setDragOverCol] = useState<KanbanColumnId | null>(null);

  // Column Inline Quick-Add State
  const [quickAddCol, setQuickAddCol] = useState<KanbanColumnId | null>(null);
  const [quickTitle, setQuickTitle] = useState('');

  if (!currentProject) return null;

  const handleOpenNewTask = (columnId: KanbanColumnId = 'todo') => {
    setSelectedTask(null);
    setModalDefaultCol(columnId);
    setIsModalOpen(true);
  };

  const handleOpenEditTask = (task: TeamTask) => {
    setSelectedTask(task);
    setModalDefaultCol(task.columnId);
    setIsModalOpen(true);
  };

  const handleQuickAddSubmit = (columnId: KanbanColumnId) => {
    if (!quickTitle.trim()) {
      setQuickAddCol(null);
      return;
    }

    createTask({
      projectId: currentProject.id,
      title: quickTitle.trim(),
      columnId,
      priority: 'medium',
      subtasks: [],
      tags: [],
      order: 0
    });

    setQuickTitle('');
    setQuickAddCol(null);
  };

  const hasActiveFilters = !!(filter.search || filter.assigneeId || (filter.priority && filter.priority !== 'all') || filter.tag);

  return (
    <div className="flex flex-col h-full space-y-4 min-w-0">
      {/* Filter and Control Bar */}
      <div className="chronos-toolbar p-3 md:p-4 backdrop-blur flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-neutral-500 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filter.search}
            onChange={e => setFilter(prev => ({ ...prev, search: e.target.value }))}
            placeholder={t('team.searchTasks')}
            className="w-full ps-10 pe-4 py-2 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-200 placeholder-neutral-500 text-xs md:text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {/* Assignee Filter */}
          <div className="relative shrink-0">
            <select
              value={filter.assigneeId || ''}
              onChange={e => setFilter(prev => ({ ...prev, assigneeId: e.target.value || undefined }))}
              className="px-3 py-2 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">{t('team.allAssignees')}</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="relative shrink-0">
            <select
              value={filter.priority || 'all'}
              onChange={e => setFilter(prev => ({ ...prev, priority: e.target.value as TeamTaskPriority | 'all' }))}
              className="px-3 py-2 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">{t('team.allPriorities')}</option>
              <option value="urgent">{t('kanban.urgent')}</option>
              <option value="high">{t('kanban.high')}</option>
              <option value="medium">{t('kanban.medium')}</option>
              <option value="low">{t('kanban.low')}</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilter}
              className="px-2.5 py-2 text-xs text-neutral-400 hover:text-neutral-200 bg-neutral-800/80 hover:bg-neutral-800 rounded-xl flex items-center gap-1 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('common.clear')}</span>
            </button>
          )}

          {/* Create Task Button */}
          <button
            type="button"
            onClick={() => handleOpenNewTask('todo')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all shrink-0 ms-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('kanban.addTask')}</span>
          </button>
        </div>
      </div>

      {/* Onboarding Empty Banner if project has 0 tasks */}
      {projectTasks.length === 0 && !hasActiveFilters && (
        <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">
                Welcome to {currentProject.name}!
              </h4>
              <p className="text-xs text-neutral-400">
                This board is fresh and ready. Add cards directly to columns below or click "+ Add Card" to begin your sprint.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleOpenNewTask('todo')}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold self-start sm:self-auto shrink-0 transition-colors"
          >
            + Create First Card
          </button>
        </div>
      )}

      {/* Kanban Board Columns Container */}
      <div className="flex overflow-x-auto gap-4 pb-4 items-start min-w-full custom-scrollbar chronos-scroll snap-x snap-proximity">
        {COLUMNS.map(col => {
          const colTasks = projectTasks.filter(t => t.columnId === col.id);
          const isDraggingOver = dragOverCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverCol !== col.id) setDragOverCol(col.id);
              }}
              onDragLeave={e => {
                // only reset if leaving the column boundary
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverCol(null);
              }}
              onDrop={e => {
                e.preventDefault();
                setDragOverCol(null);
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) {
                  moveTask(taskId, col.id);
                }
              }}
              className={`flex flex-col bg-neutral-900/60 border rounded-2xl p-3 min-h-[420px] sm:min-h-[500px] min-w-[280px] flex-1 shrink-0 xl:min-w-0 transition-all duration-150 snap-start ${
                isDraggingOver
                  ? 'border-indigo-500/80 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                  : 'border-neutral-800/80'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between gap-2 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.colorDot}`} />
                  <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    {t(col.titleKey)}
                  </h3>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${col.badgeBg}`}>
                    {formatNumber(colTasks.length)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setQuickAddCol(col.id);
                    setQuickTitle('');
                  }}
                  title={t('kanban.addCard')}
                  className="p-1 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Quick Add Input */}
              {quickAddCol === col.id && (
                <div className="mb-3 p-2 bg-neutral-950 border border-indigo-500/50 rounded-xl shadow-md">
                  <input
                    type="text"
                    autoFocus
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddSubmit(col.id);
                      } else if (e.key === 'Escape') {
                        setQuickAddCol(null);
                      }
                    }}
                    placeholder={t('kanban.titlePlaceholder')}
                    className="w-full bg-transparent text-neutral-200 placeholder-neutral-500 text-xs focus:outline-none mb-2"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickAddCol(null)}
                      className="px-2 py-1 text-[11px] text-neutral-400 hover:text-neutral-200"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAddSubmit(col.id)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto">
                {colTasks.length > 0 ? (
                  colTasks.map(task => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      projectKey={currentProject.key}
                      columnId={col.id}
                      onOpenDetails={handleOpenEditTask}
                    />
                  ))
                ) : (
                  <div className="h-32 border border-dashed border-neutral-800/60 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                    <p className="text-xs text-neutral-500">
                      {isDraggingOver ? t('kanban.dropCardHere') : t('tasks.noTasks')}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenNewTask(col.id)}
                      className="mt-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {t('kanban.addCard')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation / Edit Modal */}
      <TeamTaskModal
        task={selectedTask}
        defaultColumnId={modalDefaultCol}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};
