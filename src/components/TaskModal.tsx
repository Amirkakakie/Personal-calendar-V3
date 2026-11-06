import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Target, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles,
  Briefcase,
  Zap
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { 
  Task, 
  TaskCategory, 
  TaskPriority, 
  EisenhowerQuadrant, 
  BiologicalEnergy,
  GoalOKR,
  Project,
  SkillNode
} from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
  initialTask?: Task | null;
  taskToEdit?: Task | null;
  defaultQuadrant?: EisenhowerQuadrant;
  goals?: GoalOKR[];
  projects?: Project[];
  skills?: SkillNode[];
  initialDate?: string;
  initialTime?: string;
  onDelete?: (id: string) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  taskToEdit,
  defaultQuadrant,
  goals = [],
  projects = [],
  skills = [],
  initialDate,
  initialTime,
  onDelete
}) => {
  const { t, locale, formatNumber } = useI18n();
  const currentTask = taskToEdit || initialTask;

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Work/Career');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [eisenhower, setEisenhower] = useState<EisenhowerQuadrant>('q2_not_urgent_important');
  const [energyLevel, setEnergyLevel] = useState<BiologicalEnergy>('High Focus');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [linkedSkillId, setLinkedSkillId] = useState('');
  const [syncedToGoogle, setSyncedToGoogle] = useState(true);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // UI / Status State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset form state whenever modal opens or active task changes
  useEffect(() => {
    if (isOpen) {
      if (currentTask) {
        setTitle(currentTask.title || '');
        setDescription(currentTask.description || '');
        setCategory(currentTask.category || 'Work/Career');
        setPriority(currentTask.priority || 'Medium');
        setEisenhower(currentTask.eisenhower || defaultQuadrant || 'q2_not_urgent_important');
        setEnergyLevel(currentTask.energyLevel || 'High Focus');
        setDueDate(currentTask.dueDate || new Date().toISOString().split('T')[0]);
        setDueTime(currentTask.dueTime || '10:00');
        setDurationMinutes(currentTask.durationMinutes || 45);
        setGoalId(currentTask.goalId || '');
        setProjectId(currentTask.projectId || '');
        setLinkedSkillId(currentTask.linkedSkillId || '');
        setSyncedToGoogle(currentTask.syncedToGoogle ?? true);
        setSubtasks(currentTask.subtasks ? [...currentTask.subtasks] : []);
      } else {
        const todayStr = new Date().toISOString().split('T')[0];
        setTitle('');
        setDescription('');
        setCategory('Work/Career');
        setPriority('Medium');
        setEisenhower(defaultQuadrant || 'q2_not_urgent_important');
        setEnergyLevel('High Focus');
        setDueDate(initialDate || todayStr);
        setDueTime(initialTime || '10:00');
        setDurationMinutes(45);
        setGoalId('');
        setProjectId('');
        setLinkedSkillId('');
        setSyncedToGoogle(true);
        setSubtasks([]);
      }
      setValidationError(null);
      setConflictWarning(null);
      setIsSubmitting(false);

      // Auto-focus title input on open
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, currentTask, defaultQuadrant, initialDate, initialTime]);

  // Handle ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Calendar overlap check with debounced request
  useEffect(() => {
    if (!isOpen || !dueDate || !dueTime) return;

    const timer = setTimeout(async () => {
      try {
        const result = await api.checkConflicts({
          dueDate,
          dueTime,
          durationMinutes
        });
        if (result.hasConflict && result.conflictingEvents?.length) {
          const conflicting = result.conflictingEvents[0];
          const timeRange = conflicting.startTime && conflicting.endTime 
            ? `${conflicting.startTime.substring(11, 16)} - ${conflicting.endTime.substring(11, 16)}`
            : '';
          setConflictWarning(
            locale === 'fa' 
              ? `تداخل احتمالی با «${conflicting.title}» (${timeRange})`
              : `Potential calendar overlap with "${conflicting.title}" (${timeRange})`
          );
        } else {
          setConflictWarning(null);
        }
      } catch {
        // Suppress network check errors
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isOpen, dueDate, dueTime, durationMinutes, locale]);

  if (!isOpen) return null;

  // Add Subtask Handler
  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks(prev => [
      ...prev,
      {
        id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: trimmed,
        completed: false
      }
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(st => st.id !== id));
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setValidationError(locale === 'fa' ? 'لطفاً عنوان کار را وارد کنید.' : 'Please enter a task title.');
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: cleanTitle,
        description: description.trim(),
        category,
        priority,
        eisenhower,
        energyLevel,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        dueTime: dueTime || '10:00',
        durationMinutes: Math.max(5, Number(durationMinutes) || 45),
        goalId: goalId || undefined,
        projectId: projectId || undefined,
        linkedSkillId: linkedSkillId || undefined,
        syncedToGoogle,
        subtasks
      });
      onClose();
    } catch (err: any) {
      console.error('[TaskModal] Save failed:', err);
      setValidationError(err.message || (locale === 'fa' ? 'خطا در ذخیره کار. لطفاً مجدداً تلاش کنید.' : 'Failed to save task. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        // Close modal when clicking strictly on the outer backdrop
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-neutral-900/95 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {currentTask ? t('modals.editTask') : t('modals.newTask')}
              </h3>
              <p className="text-[11px] text-neutral-500">
                {currentTask ? t('common.edit') : t('modals.createTaskSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              {t('modals.title')} <span className="text-rose-400">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              placeholder={t('modals.titlePlaceholder')}
              value={title}
              disabled={isSubmitting}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              className="app-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
              {t('modals.description')}
            </label>
            <textarea
              rows={2}
              placeholder={locale === 'fa' ? 'یادداشت‌ها، منابع و پیش‌نیازها...' : 'Key outcomes, links, or notes...'}
              value={description}
              disabled={isSubmitting}
              onChange={(e) => setDescription(e.target.value)}
              className="app-textarea"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                {t('modals.category')}
              </label>
              <select
                value={category}
                disabled={isSubmitting}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="app-select"
              >
                <option value="Work/Career">{t('categories.workCareer')}</option>
                <option value="Academic/Study">{t('categories.academicStudy')}</option>
                <option value="Personal Growth">{t('categories.personalGrowth')}</option>
                <option value="Health & Habits">{t('categories.healthHabits')}</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                {t('modals.priority')}
              </label>
              <select
                value={priority}
                disabled={isSubmitting}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="app-select"
              >
                <option value="High">{locale === 'fa' ? 'بالا (ضروری)' : 'High (Critical)'}</option>
                <option value="Medium">{locale === 'fa' ? 'متوسط' : 'Medium'}</option>
                <option value="Low">{locale === 'fa' ? 'پایین' : 'Low'}</option>
              </select>
            </div>
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('modals.dueDate')}</span>
              </label>
              <input
                type="date"
                value={dueDate}
                disabled={isSubmitting}
                onChange={(e) => setDueDate(e.target.value)}
                className="app-input"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('modals.dueTime')}</span>
              </label>
              <input
                type="time"
                value={dueTime}
                disabled={isSubmitting}
                onChange={(e) => setDueTime(e.target.value)}
                className="app-input"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-6">
            {currentTask && onDelete ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  if (window.confirm(t('tasks.deleteConfirm'))) {
                    await onDelete(currentTask.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('common.delete')}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="btn-secondary"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <span>{t('common.loading')}</span>
                ) : (
                  <span>{currentTask ? t('common.save') : t('common.create')}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
