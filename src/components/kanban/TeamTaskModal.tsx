import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  MessageSquare, 
  Send, 
  AlertTriangle,
  Layers,
  ChevronDown
} from 'lucide-react';
import type { TeamTask, KanbanColumnId, TeamTaskPriority } from '../../types/team.ts';
import { useTeam } from '../../context/TeamContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface TeamTaskModalProps {
  task: TeamTask | null; // null means create new
  defaultColumnId?: KanbanColumnId;
  isOpen: boolean;
  onClose: () => void;
}

const COLUMNS: { id: KanbanColumnId; labelKey: string }[] = [
  { id: 'backlog', labelKey: 'kanban.backlog' },
  { id: 'todo', labelKey: 'kanban.todo' },
  { id: 'in_progress', labelKey: 'kanban.inProgress' },
  { id: 'in_review', labelKey: 'kanban.inReview' },
  { id: 'completed', labelKey: 'kanban.completed' }
];

export const TeamTaskModal: React.FC<TeamTaskModalProps> = ({
  task,
  defaultColumnId = 'todo',
  isOpen,
  onClose
}) => {
  const { currentProject, teamMembers, createTask, updateTask, deleteTask, addComment } = useTeam();
  const { currentUser } = useAuth();
  const { t, direction, formatDate, formatNumber } = useI18n();

  const isEditing = !!task;

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState<KanbanColumnId>(defaultColumnId);
  const [priority, setPriority] = useState<TeamTaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [estimatedHours, setEstimatedHours] = useState<number | undefined>(undefined);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setColumnId(task.columnId || 'todo');
      setPriority(task.priority || 'medium');
      setAssigneeId(task.assigneeId || '');
      setDueDate(task.dueDate || '');
      setEstimatedHours(task.estimatedHours);
      setSubtasks(task.subtasks || []);
      setTags(task.tags || []);
    } else {
      setTitle('');
      setDescription('');
      setColumnId(defaultColumnId);
      setPriority('medium');
      setAssigneeId(currentUser?.id || '');
      setDueDate(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);
      setEstimatedHours(8);
      setSubtasks([]);
      setTags([]);
    }
    setConfirmDelete(false);
    setCommentInput('');
  }, [task, defaultColumnId, currentUser, isOpen]);

  if (!isOpen || !currentProject) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEditing && task) {
      updateTask({
        id: task.id,
        title: title.trim(),
        description: description.trim(),
        columnId,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        subtasks,
        tags
      });
    } else {
      createTask({
        projectId: currentProject.id,
        title: title.trim(),
        description: description.trim(),
        columnId,
        priority,
        assigneeId: assigneeId || undefined,
        dueDate: dueDate || undefined,
        estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
        subtasks,
        tags,
        order: 0
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask(task.id);
    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtaskInput.trim()) return;
    setSubtasks(prev => [
      ...prev,
      { id: `st-${Date.now()}`, title: newSubtaskInput.trim(), completed: false }
    ]);
    setNewSubtaskInput('');
  };

  const handleToggleSubtask = (stId: string) => {
    setSubtasks(prev =>
      prev.map(st => (st.id === stId ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleDeleteSubtask = (stId: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== stId));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = newTagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags(prev => [...prev, val]);
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSendComment = () => {
    if (!task || !commentInput.trim()) return;
    addComment(task.id, commentInput);
    setCommentInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-neutral-800 text-indigo-400 border border-neutral-700">
              {isEditing ? `${currentProject.key}-${task?.taskNumber}` : `${currentProject.key}-NEW`}
            </span>
            <span className="text-sm font-medium text-neutral-300">
              {isEditing ? t('kanban.editTask') : t('kanban.addTask')}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              {t('common.title')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('kanban.titlePlaceholder')}
              className="w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-base font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Grid: Column, Priority, Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Column / Status */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                {t('common.status')}
              </label>
              <select
                value={columnId}
                onChange={e => setColumnId(e.target.value as KanbanColumnId)}
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                {COLUMNS.map(col => (
                  <option key={col.id} value={col.id}>
                    {t(col.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                {t('common.priority')}
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TeamTaskPriority)}
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="low">{t('kanban.low')}</option>
                <option value="medium">{t('kanban.medium')}</option>
                <option value="high">{t('kanban.high')}</option>
                <option value="urgent">{t('kanban.urgent')}</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                {t('kanban.assignee')}
              </label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="">{t('kanban.unassigned')}</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.title})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Due Date & Estimated Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                {t('kanban.dueDate')}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                {t('kanban.estimatedHours')}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours ?? ''}
                onChange={e => setEstimatedHours(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 8"
                className="w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              {t('common.description')}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('kanban.descriptionPlaceholder')}
              className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Checklist / Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                {t('kanban.subtasks')} ({subtasks.filter(s => s.completed).length}/{subtasks.length})
              </label>
            </div>

            <div className="space-y-2 mb-3">
              {subtasks.map(st => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-2 p-2 bg-neutral-950/60 border border-neutral-800/80 rounded-xl"
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubtask(st.id)}
                    className="flex items-center gap-2.5 text-sm text-neutral-200 text-start flex-1"
                  >
                    {st.completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-neutral-500 shrink-0" />
                    )}
                    <span className={st.completed ? 'line-through text-neutral-500' : ''}>
                      {st.title}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSubtaskInput}
                onChange={e => setNewSubtaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder={t('kanban.addSubtask')}
                className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-sm focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              {t('kanban.tags')}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-200 border border-neutral-700"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder={t('kanban.addTag')}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Activity / Comments Thread (Only for existing task) */}
          {isEditing && task && (
            <div className="pt-4 border-t border-neutral-800">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  {t('kanban.comments')} ({task.comments?.length || 0})
                </span>
              </div>

              {/* Comments List */}
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {task.comments && task.comments.length > 0 ? (
                  task.comments.map(c => (
                    <div key={c.id} className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-xl text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${c.authorColor} flex items-center justify-center text-white text-[9px] font-bold`}>
                            {c.authorInitials}
                          </div>
                          <span className="font-semibold text-neutral-200">{c.authorName}</span>
                        </div>
                        <span className="text-[10px] text-neutral-500">
                          {formatDate(c.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-neutral-300 leading-relaxed ps-7">{c.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic">
                    {t('kanban.noComments')}
                  </p>
                )}
              </div>

              {/* Add Comment Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder={t('kanban.writeComment')}
                  className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSendComment}
                  disabled={!commentInput.trim()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t('kanban.postComment')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950/40 flex items-center justify-between">
          <div>
            {isEditing && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-400">{t('kanban.deleteTaskConfirm')}</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
                  >
                    {t('common.confirm')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 bg-neutral-800 text-neutral-300 rounded-lg text-xs"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-neutral-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('kanban.deleteTask')}</span>
                </button>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
