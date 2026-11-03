import React from 'react';
import { 
  CheckSquare, 
  MessageSquare, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import type { TeamTask, KanbanColumnId } from '../../types/team.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useTeam } from '../../context/TeamContext.tsx';

interface KanbanCardProps {
  task: TeamTask;
  projectKey: string;
  onOpenDetails: (task: TeamTask) => void;
  columnId: KanbanColumnId;
}

const COLUMNS_ORDER: KanbanColumnId[] = ['backlog', 'todo', 'in_progress', 'in_review', 'completed'];

export const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  projectKey,
  onOpenDetails,
  columnId
}) => {
  const { t, direction, formatDate, formatNumber } = useI18n();
  const { moveTask } = useTeam();

  const currentColIndex = COLUMNS_ORDER.indexOf(columnId);
  const canMoveLeft = direction === 'rtl' ? currentColIndex < COLUMNS_ORDER.length - 1 : currentColIndex > 0;
  const canMoveRight = direction === 'rtl' ? currentColIndex > 0 : currentColIndex < COLUMNS_ORDER.length - 1;

  const handleShiftLeft = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCol = direction === 'rtl' ? COLUMNS_ORDER[currentColIndex + 1] : COLUMNS_ORDER[currentColIndex - 1];
    if (nextCol) moveTask(task.id, nextCol);
  };

  const handleShiftRight = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCol = direction === 'rtl' ? COLUMNS_ORDER[currentColIndex - 1] : COLUMNS_ORDER[currentColIndex + 1];
    if (nextCol) moveTask(task.id, nextCol);
  };

  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const totalSubtasks = task.subtasks.length;

  // Check if overdue
  const isOverdue = task.dueDate && columnId !== 'completed' && new Date(task.dueDate) < new Date(new Date().toDateString());
  const isDueToday = task.dueDate && columnId !== 'completed' && new Date(task.dueDate).toDateString() === new Date().toDateString();

  // Priority Styles
  const priorityConfig = {
    urgent: {
      label: t('kanban.urgent'),
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30'
    },
    high: {
      label: t('kanban.high'),
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    },
    medium: {
      label: t('kanban.medium'),
      badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
    },
    low: {
      label: t('kanban.low'),
      badge: 'bg-neutral-800 text-neutral-400 border-neutral-700'
    }
  }[task.priority] || { label: task.priority, badge: 'bg-neutral-800 text-neutral-400' };

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpenDetails(task)}
      className="group relative bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer select-none"
    >
      {/* Top row: Key & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono font-medium text-neutral-400">
            {projectKey}-{task.taskNumber}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded border font-medium uppercase ${priorityConfig.badge}`}>
            {priorityConfig.label}
          </span>
        </div>

        {/* Quick Shift Navigation Controls */}
        <div className="flex items-center gap-0.5 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {canMoveLeft && (
            <button
              type="button"
              onClick={handleShiftLeft}
              title={t('kanban.moveLeft')}
              className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
          {canMoveRight && (
            <button
              type="button"
              onClick={handleShiftRight}
              title={t('kanban.moveRight')}
              className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 rounded transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-neutral-200 group-hover:text-white line-clamp-2 leading-snug mb-1.5 transition-colors">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && (
        <p className="text-xs text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-950/70 border border-neutral-800 text-neutral-400 font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Metadata */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          {/* Subtask count */}
          {totalSubtasks > 0 && (
            <div className={`flex items-center gap-1 text-[11px] ${completedSubtasks === totalSubtasks ? 'text-emerald-400' : 'text-neutral-400'}`}>
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {formatNumber(completedSubtasks)}/{formatNumber(totalSubtasks)}
              </span>
            </div>
          )}

          {/* Comments count */}
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-neutral-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{formatNumber(task.comments.length)}</span>
            </div>
          )}

          {/* Due date */}
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 text-[11px] font-medium ${
                isOverdue
                  ? 'text-rose-400'
                  : isDueToday
                  ? 'text-amber-400'
                  : 'text-neutral-400'
              }`}
            >
              {isOverdue ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <Calendar className="w-3.5 h-3.5" />
              )}
              <span>
                {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* Assignee Avatar */}
        {task.assignee ? (
          <div
            title={`${task.assignee.name} (${task.assignee.title})`}
            className={`w-6 h-6 rounded-full bg-gradient-to-tr ${task.assignee.avatarColor} flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0`}
          >
            {task.assignee.initials}
          </div>
        ) : (
          <div
            title={t('kanban.unassigned')}
            className="w-6 h-6 rounded-full border border-dashed border-neutral-700 flex items-center justify-center text-neutral-500 text-[10px] shrink-0"
          >
            ?
          </div>
        )}
      </div>
    </div>
  );
};
