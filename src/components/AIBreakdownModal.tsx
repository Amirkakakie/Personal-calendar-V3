import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  Plus, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { TaskCategory, TaskPriority, EisenhowerQuadrant } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface AIBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksImported?: () => void;
  onTasksCreated?: (created: any) => void;
}

interface GeneratedTask {
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  eisenhower: EisenhowerQuadrant;
  durationMinutes: number;
  subtasks: string[];
  selected?: boolean;
}

export const AIBreakdownModal: React.FC<AIBreakdownModalProps> = ({
  isOpen,
  onClose,
  onTasksImported,
  onTasksCreated
}) => {
  const { t, locale, formatNumber, formatDuration } = useI18n();
  const [goalInput, setGoalInput] = useState('');
  const [context, setContext] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Academic/Study');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const exampleGoals = locale === 'fa' ? [
    { text: 'پیاده‌سازی معماری توزیع‌شده و الگوریتم اجماع رافت', cat: 'Academic/Study' },
    { text: 'طراحی و راه‌اندازی محصول Micro-SaaS روی گوگل کلاد', cat: 'Work/Career' },
    { text: 'مطالعه و خلاصه ۶ کتاب کار عمیق و تمرکز در این فصل', cat: 'Personal Growth' },
    { text: 'برنامه تمرینی دویدن ۱۰ کیلومتر زیر ۵۰ دقیقه و بهینه‌سازی خواب', cat: 'Health & Habits' }
  ] : [
    { text: 'Master Distributed Systems & Raft Consensus', cat: 'Academic/Study' },
    { text: 'Launch Micro-SaaS MVP on Google Cloud Run', cat: 'Work/Career' },
    { text: 'Read 6 Deep Work & Focus Books this Quarter', cat: 'Personal Growth' },
    { text: 'Run 10km Sub-50-Minute Training Program', cat: 'Health & Habits' }
  ];

  const handleDecompose = async () => {
    if (!goalInput.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await api.decomposeGoal(goalInput.trim(), context, category);

      const rawList = Array.isArray(result?.tasks) && result.tasks.length > 0
        ? result.tasks
        : Array.isArray(result?.subtasks)
        ? result.subtasks.map((st: any) => ({
            title: st.title,
            category: result.category || category,
            priority: st.priority || 'Medium',
            eisenhower: st.eisenhower || 'q2_not_urgent_important',
            durationMinutes: st.estimatedMinutes || 45,
            subtasks: st.description ? [st.description] : []
          }))
        : [];

      if (rawList.length > 0) {
        const withSelection = rawList.map((taskItem: any) => ({
          title: taskItem.title,
          category: taskItem.category || category,
          priority: taskItem.priority || 'Medium',
          eisenhower: taskItem.eisenhower || 'q2_not_urgent_important',
          durationMinutes: Number(taskItem.durationMinutes) || 45,
          subtasks: Array.isArray(taskItem.subtasks) ? taskItem.subtasks : [],
          selected: true
        }));
        setGeneratedTasks(withSelection);
      } else {
        throw new Error(locale === 'fa' ? 'نتوانستیم این هدف را به کارهای کوچک‌تر تقسیم کنیم.' : 'No actionable items could be synthesized for this objective.');
      }
    } catch (err: any) {
      console.error('AI breakdown error:', err);
      setErrorMsg(err.message || 'Failed to decompose goal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectTask = (index: number) => {
    setGeneratedTasks(prev =>
      prev.map((t, idx) => (idx === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleImportSelected = async () => {
    const selectedTasks = generatedTasks.filter(t => t.selected);
    if (selectedTasks.length === 0) return;

    setIsImporting(true);
    try {
      for (const t of selectedTasks) {
        const todayStr = new Date().toISOString().split('T')[0];
        await api.createTask({
          title: t.title,
          category: t.category,
          priority: t.priority,
          eisenhower: t.eisenhower,
          durationMinutes: t.durationMinutes,
          dueDate: todayStr,
          dueTime: '11:00',
          syncedToGoogle: true,
          subtasks: t.subtasks.map((stTitle, sIdx) => ({
            id: `st-imp-${Date.now()}-${sIdx}`,
            title: typeof stTitle === 'string' ? stTitle : (stTitle as any).title || 'Step',
            completed: false
          }))
        });
      }

      if (onTasksImported) onTasksImported();
      if (onTasksCreated) onTasksCreated(selectedTasks);
      onClose();
    } catch (err) {
      console.error('Error importing tasks:', err);
      setErrorMsg(locale === 'fa' ? 'ثبت کارهای انتخاب‌شده با خطا روبه‌رو شد.' : 'Failed to import tasks to database.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {t('modals.decomposeTitle')}
              </h2>
              <p className="text-xs text-neutral-400">
                {t('modals.decomposeSubtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Form */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              {locale === 'fa' ? 'هدف اصلی یا موضوع پروژه' : 'High-Level Objective'} *
            </label>
            <input
              type="text"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder={t('modals.goalInputPlaceholder')}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Quick Examples */}
          <div>
            <span className="text-[11px] text-neutral-400 mb-1.5 block">
              {locale === 'fa' ? 'نمونه اهداف پیشنهادی:' : 'Quick templates:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {exampleGoals.map((eg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setGoalInput(eg.text);
                    setCategory(eg.cat as TaskCategory);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-750 text-neutral-300 text-[11px] border border-neutral-700/60 transition-colors text-start"
                >
                  {eg.text}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                {t('modals.category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
              >
                <option value="Work/Career">{t('categories.workCareer')}</option>
                <option value="Academic/Study">{t('categories.academicStudy')}</option>
                <option value="Personal Growth">{t('categories.personalGrowth')}</option>
                <option value="Health & Habits">{t('categories.healthHabits')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                {locale === 'fa' ? 'توضیحات و پیش‌نیازها' : 'Context / Constraints'}
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder={t('modals.contextPlaceholder')}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleDecompose}
              disabled={isLoading || !goalInput.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.01]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('modals.decomposing')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('modals.decomposeAction')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Results Preview */}
        {generatedTasks.length > 0 && (
          <div className="mt-6 pt-5 border-t border-neutral-800">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{locale === 'fa' ? `کارهای پیشنهادی (${formatNumber(generatedTasks.length)})` : `Decomposed Action Items (${generatedTasks.length})`}</span>
                </h3>
                <p className="text-xs text-neutral-400">
                  {locale === 'fa' ? 'کارهایی را که می‌خواهید به فهرستتان اضافه شوند انتخاب کنید.' : 'Select tasks to add to your schedule and Google Calendar.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleImportSelected}
                disabled={isImporting || generatedTasks.every(t => !t.selected)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/30 transition-all"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('modals.importPlan')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
              {generatedTasks.map((taskItem, index) => (
                <div
                  key={index}
                  onClick={() => toggleSelectTask(index)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    taskItem.selected
                      ? 'bg-neutral-800/90 border-violet-500/40 ring-1 ring-violet-500/20'
                      : 'bg-neutral-900/50 border-neutral-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border transition-colors ${
                        taskItem.selected
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-neutral-600 bg-neutral-800'
                      }`}
                    >
                      {taskItem.selected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-neutral-100">
                          {taskItem.title}
                        </span>
                        <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          <span>{formatDuration(taskItem.durationMinutes)}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded bg-neutral-700/60 text-neutral-300">
                          {taskItem.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-neutral-700/60 text-neutral-400">
                          {taskItem.eisenhower.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {taskItem.subtasks && taskItem.subtasks.length > 0 && (
                        <ul className="mt-2 ps-4 list-disc text-[11px] text-neutral-400 space-y-0.5">
                          {taskItem.subtasks.map((st, sidx) => (
                            <li key={sidx}>{typeof st === 'string' ? st : (st as any).title}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
