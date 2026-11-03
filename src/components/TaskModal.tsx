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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        // Close modal when clicking strictly on the outer backdrop
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                {currentTask ? t('modals.editTask') : t('modals.newTask')}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {currentTask ? t('common.edit') : t('modals.createTaskSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Calendar Conflict Warning */}
          {conflictWarning && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{conflictWarning}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              {t('modals.title')} <span className="text-rose-400">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              placeholder={t('modals.titlePlaceholder')}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError(null);
              }}
              className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              {t('modals.description')}
            </label>
            <textarea
              rows={2}
              placeholder={locale === 'fa' ? 'یادداشت‌ها، منابع و پیش‌نیازها...' : 'Key outcomes, links, or notes...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Category & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('modals.category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Work/Career">{t('categories.workCareer')}</option>
                <option value="Academic/Study">{t('categories.academicStudy')}</option>
                <option value="Personal Growth">{t('categories.personalGrowth')}</option>
                <option value="Health & Habits">{t('categories.healthHabits')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('modals.priority')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="High">{locale === 'fa' ? 'بالا (ضروری)' : 'High (Critical)'}</option>
                <option value="Medium">{locale === 'fa' ? 'متوسط' : 'Medium'}</option>
                <option value="Low">{locale === 'fa' ? 'پایین' : 'Low'}</option>
              </select>
            </div>
          </div>

          {/* Eisenhower Quadrant & Energy Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('modals.quadrant')}
              </label>
              <select
                value={eisenhower}
                onChange={(e) => setEisenhower(e.target.value as EisenhowerQuadrant)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="q1_urgent_important">{t('eisenhower.q1Title')}</option>
                <option value="q2_not_urgent_important">{t('eisenhower.q2Title')}</option>
                <option value="q3_urgent_not_important">{t('eisenhower.q3Title')}</option>
                <option value="q4_neither">{t('eisenhower.q4Title')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                {locale === 'fa' ? 'سطح انرژی زیستی' : 'Biological Energy'}
              </label>
              <select
                value={energyLevel}
                onChange={(e) => setEnergyLevel(e.target.value as BiologicalEnergy)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="High Focus">{locale === 'fa' ? 'تمرکز عمیق (صبح)' : 'High Focus (Peak)'}</option>
                <option value="Creative">{locale === 'fa' ? 'خلاقانه (بعدازظهر)' : 'Creative (Mid-Day)'}</option>
                <option value="Low Energy/Admin">{locale === 'fa' ? 'روتین / اداری (عصر)' : 'Low Energy / Admin'}</option>
              </select>
            </div>
          </div>

          {/* Date, Time, Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('modals.dueDate')}</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('modals.dueTime')}</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('modals.duration')}</span>
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={15}>{formatNumber(15)} {t('common.minutes')}</option>
                <option value={25}>{formatNumber(25)} {t('common.minutes')} (Pomodoro)</option>
                <option value={30}>{formatNumber(30)} {t('common.minutes')}</option>
                <option value={45}>{formatNumber(45)} {t('common.minutes')}</option>
                <option value={60}>{formatNumber(60)} {t('common.minutes')}</option>
                <option value={90}>{formatNumber(90)} {t('common.minutes')}</option>
                <option value={120}>{formatNumber(120)} {t('common.minutes')}</option>
              </select>
            </div>
          </div>

          {/* Goal & Project Link Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('modals.linkToGoal')}</span>
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">{t('modals.noGoalLinked')}</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <span>{locale === 'fa' ? 'پروژه مرتبط' : 'Linked Project'}</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">{locale === 'fa' ? 'بدون پروژه' : 'No Project Linked'}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Skill Link */}
          {skills.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>{locale === 'fa' ? 'مهارت RPG جهت ارتقای تجربه (XP)' : 'Linked Skill for RPG XP Growth'}</span>
              </label>
              <select
                value={linkedSkillId}
                onChange={(e) => setLinkedSkillId(e.target.value)}
                className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">{locale === 'fa' ? 'بدون پیوند مهارتی' : 'No Skill Linked'}</option>
                {skills.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Lv.{s.level})</option>
                ))}
              </select>
            </div>
          )}

          {/* Subtasks Checklist Section */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              {t('tasks.subtasks')} ({formatNumber(subtasks.length)})
            </label>

            {/* Input to add subtask - Prevent Form Submission on Enter */}
            <div className="flex items-center gap-2 mb-2.5">
              <input
                type="text"
                placeholder={locale === 'fa' ? 'افزودن زیرکار و گام اجرایی...' : 'Add subtask step...'}
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                className="flex-1 bg-neutral-800/90 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('common.add')}</span>
              </button>
            </div>

            {/* Subtask list */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-800/60 border border-neutral-700/60 text-xs"
                  >
                    <span className="text-neutral-200 truncate flex-1 pe-2">{st.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="p-1 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-700/50 transition-colors"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Google Calendar Sync Checkbox */}
          <div className="flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="syncedToGoogle"
              checked={syncedToGoogle}
              onChange={(e) => setSyncedToGoogle(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-neutral-800 border-neutral-700 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="syncedToGoogle" className="text-xs text-neutral-300 font-medium cursor-pointer select-none">
              {t('modals.syncWithGoogle')}
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800 mt-4">
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
                className="px-3.5 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40"
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
                className="px-4 py-2 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-40"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
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
