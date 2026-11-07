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
  FolderGit2,
  Zap,
  CheckSquare,
  Square,
  ListTodo,
  Layers,
  ChevronRight,
  ShieldCheck,
  Flame,
  BatteryCharging
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
  const { t, locale, formatNumber, formatDuration, direction } = useI18n();
  const currentTask = taskToEdit || initialTask;

  // Active section tab inside modal
  const [activeTab, setActiveTab] = useState<'details' | 'schedule' | 'subtasks'>('details');

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
  const [isDeleting, setIsDeleting] = useState(false);

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
      setIsDeleting(false);
      setActiveTab('details');

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
              ? `تداخل زمانی با «${conflicting.title}» (${timeRange})`
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

  const handleToggleSubtask = (id: string) => {
    setSubtasks(prev =>
      prev.map(st => (st.id === id ? { ...st, completed: !st.completed } : st))
    );
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
      setActiveTab('details');
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

  const handleDelete = async () => {
    if (!currentTask || !onDelete) return;
    if (window.confirm(t('tasks.deleteConfirm'))) {
      setIsDeleting(true);
      try {
        await onDelete(currentTask.id);
        onClose();
      } catch (err: any) {
        setValidationError(err.message || 'Failed to delete task');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const durationOptions = [15, 30, 45, 60, 90, 120];

  const eisenhowerOptions: { id: EisenhowerQuadrant; label: string; desc: string; badge: string; color: string }[] = [
    {
      id: 'q1_urgent_important',
      label: 'Q1: Urgent & Important',
      desc: 'Crises, immediate deadlines, fire drills',
      badge: 'Urgent',
      color: 'border-rose-500/40 text-rose-300 bg-rose-500/10'
    },
    {
      id: 'q2_not_urgent_important',
      label: 'Q2: High Value & Growth',
      desc: 'Architecture, learning, strategic progress',
      badge: 'High Value',
      color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
    },
    {
      id: 'q3_urgent_not_important',
      label: 'Q3: Quick / Batchable',
      desc: 'Quick requests, administrative batching',
      badge: 'Delegate / Batch',
      color: 'border-amber-500/40 text-amber-300 bg-amber-500/10'
    },
    {
      id: 'q4_neither',
      label: 'Q4: Low Leverage',
      desc: 'Distractions, busywork to minimize or eliminate',
      badge: 'Prune',
      color: 'border-neutral-700 text-neutral-400 bg-neutral-800/40'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-tight">
                {currentTask ? t('modals.editTask') : t('modals.newTask')}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {currentTask ? currentTask.title : t('modals.createTaskSubtitle')}
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

        {/* Modal Section Tabs */}
        <div className="flex items-center px-6 pt-3 border-b border-neutral-800 bg-neutral-950/30 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{locale === 'fa' ? 'مشخصات اصلی' : 'Core Details'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{locale === 'fa' ? 'زمان‌بندی و انرژی زیستی' : 'Energy & Timing'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subtasks')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'subtasks'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>{locale === 'fa' ? 'چک‌لیست و پیوندها' : 'Subtasks & Links'}</span>
            {subtasks.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono">
                {subtasks.length}
              </span>
            )}
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

          {/* Conflict Warning Banner */}
          {conflictWarning && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 animate-fadeIn">
              <Clock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{conflictWarning}</span>
            </div>
          )}

          {/* TAB 1: CORE DETAILS */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Title Input */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
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
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
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
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
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
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                    {t('modals.priority')}
                  </label>
                  <select
                    value={priority}
                    disabled={isSubmitting}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="app-select"
                  >
                    <option value="High">{locale === 'fa' ? 'بالا (فوری/ضروری)' : 'High (Critical)'}</option>
                    <option value="Medium">{locale === 'fa' ? 'متوسط' : 'Medium'}</option>
                    <option value="Low">{locale === 'fa' ? 'پایین' : 'Low'}</option>
                  </select>
                </div>
              </div>

              {/* Eisenhower Matrix Quadrant Selector */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-2">
                  {t('nav.eisenhower')} — {locale === 'fa' ? 'ماتریس تصمیم‌گیری آیزنهاور' : 'Decision Quadrant'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {eisenhowerOptions.map(opt => {
                    const isSelected = eisenhower === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setEisenhower(opt.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? `${opt.color} ring-1 ring-white/10 font-medium`
                            : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
                          <span>{opt.label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded border font-mono">
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-75">{opt.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMING & CIRCADIAN ENERGY */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('modals.dueDate')}</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    disabled={isSubmitting}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="app-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('modals.dueTime')}</span>
                  </label>
                  <input
                    type="time"
                    value={dueTime}
                    disabled={isSubmitting}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="app-input font-mono"
                  />
                </div>
              </div>

              {/* Duration with Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                    {locale === 'fa' ? 'مدت تخمینی کار (دقیقه)' : 'Estimated Duration'}
                  </label>
                  <span className="text-xs font-mono font-semibold text-indigo-400">
                    {formatDuration(durationMinutes)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {durationOptions.map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        durationMinutes === mins
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                <input
                  type="number"
                  min="5"
                  step="5"
                  value={durationMinutes}
                  disabled={isSubmitting}
                  onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value)))}
                  className="app-input font-mono"
                  placeholder="Custom minutes"
                />
              </div>

              {/* Circadian Energy Band */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{locale === 'fa' ? 'بازه انرژی زیستی بهینه' : 'Circadian Energy Slot'}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnergyLevel('High Focus')}
                    className={`p-3 rounded-xl border text-start transition-all ${
                      energyLevel === 'High Focus'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                        : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-white mb-0.5">{t('energyLevels.highFocus')}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">08:30 - 12:30</div>
                    <div className="text-[10px] text-neutral-500 mt-1">Deep architecture & hard logic</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnergyLevel('Creative')}
                    className={`p-3 rounded-xl border text-start transition-all ${
                      energyLevel === 'Creative'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                        : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-white mb-0.5">{t('energyLevels.creative')}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">13:30 - 16:30</div>
                    <div className="text-[10px] text-neutral-500 mt-1">Design, RFC drafting, review</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEnergyLevel('Low Energy/Admin')}
                    className={`p-3 rounded-xl border text-start transition-all ${
                      energyLevel === 'Low Energy/Admin'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                        : 'bg-neutral-950/50 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-white mb-0.5">{t('energyLevels.lowEnergyAdmin')}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">16:30 - 18:30</div>
                    <div className="text-[10px] text-neutral-500 mt-1">Admin, triage, low fatigue work</div>
                  </button>
                </div>
              </div>

              {/* Sync to Google Calendar */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {locale === 'fa' ? 'همگام‌سازی دوطرفه با تقویم گوگل' : 'Sync with Google Calendar'}
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      {locale === 'fa' ? 'رویداد در برنامه روزانه ثبت و اعلان صادر می‌شود' : 'Creates an agenda event in your connected Google account'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={syncedToGoogle}
                  onChange={(e) => setSyncedToGoogle(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 3: SUBTASKS & STRATEGIC LINKS */}
          {activeTab === 'subtasks' && (
            <div className="space-y-4">
              {/* Strategic Project Link */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{locale === 'fa' ? 'پروژه مرتبط' : 'Linked Initiative / Project'}</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="app-select"
                >
                  <option value="">{locale === 'fa' ? '-- بدون پروژه خاص --' : '-- None (Unassigned) --'}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.category}] {p.name} (${formatNumber(p.hourlyValuation || 100)}/hr)
                    </option>
                  ))}
                </select>
              </div>

              {/* Strategic Goal OKR Link */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{locale === 'fa' ? 'هدف راهبردی (OKR)' : 'Strategic Goal / OKR'}</span>
                </label>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="app-select"
                >
                  <option value="">{locale === 'fa' ? '-- بدون هدف راهبردی --' : '-- None (Ad-hoc) --'}</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>
                      [{g.category}] {g.title} ({formatNumber(g.progressPercent || 0)}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill Tree Node Link */}
              {skills.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>{locale === 'fa' ? 'ارتقای شاخه مهارت (XP)' : 'RPG Skill Mastery Link'}</span>
                  </label>
                  <select
                    value={linkedSkillId}
                    onChange={(e) => setLinkedSkillId(e.target.value)}
                    className="app-select"
                  >
                    <option value="">{locale === 'fa' ? '-- بدون مهارت اختصاصی --' : '-- None --'}</option>
                    {skills.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category} - Lvl {s.level})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subtasks Checklist */}
              <div className="pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
                    {locale === 'fa' ? 'چک‌لیست زیرمجموعه‌ها' : 'Subtasks Breakdown'} ({subtasks.filter(s => s.completed).length}/{subtasks.length})
                  </label>
                </div>

                <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto pe-1">
                  {subtasks.map(st => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between gap-2 p-2 bg-neutral-950/60 border border-neutral-800/80 rounded-xl"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className="flex items-center gap-2.5 text-xs text-neutral-200 text-start flex-1"
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
                        onClick={() => handleRemoveSubtask(st.id)}
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
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    placeholder={locale === 'fa' ? 'افزودن مرحله جدید...' : 'Add a step or deliverable item...'}
                    className="flex-1 app-input text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim()}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('common.add')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800 mt-6">
            {currentTask && onDelete ? (
              <button
                type="button"
                disabled={isSubmitting || isDeleting}
                onClick={handleDelete}
                className="px-3 py-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? t('common.loading') : t('common.delete')}</span>
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
                disabled={isSubmitting || !title.trim()}
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
