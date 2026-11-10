import React, { useState, useEffect, useRef } from 'react';
import { X, Target, Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { GoalOKR, TaskCategory } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Partial<GoalOKR>) => Promise<void>;
  initialGoal?: GoalOKR | null;
  goalToEdit?: GoalOKR | null;
  onDelete?: (id: string) => Promise<void>;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialGoal,
  goalToEdit,
  onDelete
}) => {
  const { t, locale, formatNumber } = useI18n();
  const currentGoal = goalToEdit || initialGoal;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Academic/Study');
  const [timeframe, setTimeframe] = useState<'yearly' | 'quarterly' | 'monthly'>('quarterly');
  const [targetDate, setTargetDate] = useState('');
  const [keyResults, setKeyResults] = useState<{ id: string; title: string; targetValue: number; currentValue: number; unit: string }[]>([]);
  const [newKrTitle, setNewKrTitle] = useState('');
  const [newKrTarget, setNewKrTarget] = useState(10);
  const [newKrUnit, setNewKrUnit] = useState('units');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentGoal) {
        setTitle(currentGoal.title || '');
        setDescription(currentGoal.description || '');
        setCategory(currentGoal.category || 'Academic/Study');
        setTimeframe(currentGoal.timeframe || 'quarterly');
        setTargetDate(currentGoal.targetDate || '');
        setKeyResults(currentGoal.keyResults ? [...(currentGoal.keyResults as any)] : []);
      } else {
        setTitle('');
        setDescription('');
        setCategory('Academic/Study');
        setTimeframe('quarterly');
        setTargetDate(new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]);
        setKeyResults([]);
      }
      setValidationError(null);
      setIsSubmitting(false);

      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, currentGoal]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAddKR = () => {
    const trimmed = newKrTitle.trim();
    if (!trimmed) return;
    setKeyResults(prev => [
      ...prev,
      {
        id: `kr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: trimmed,
        targetValue: Math.max(1, Number(newKrTarget) || 10),
        currentValue: 0,
        unit: newKrUnit.trim() || 'units'
      }
    ]);
    setNewKrTitle('');
    setNewKrTarget(10);
    setNewKrUnit('units');
  };

  const handleRemoveKR = (id: string) => {
    setKeyResults(prev => prev.filter(kr => kr.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setValidationError(locale === 'fa' ? 'لطفاً عنوان هدف را وارد کنید.' : 'Please enter a goal title.');
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: cleanTitle,
        description: description.trim(),
        category,
        timeframe,
        targetDate: targetDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        keyResults: keyResults.map(kr => ({ ...kr, completed: kr.currentValue >= kr.targetValue }))
      });
      onClose();
    } catch (err: any) {
      console.error('[GoalModal] Save failed:', err);
      setValidationError(err.message || (locale === 'fa' ? 'خطا در ذخیره هدف.' : 'Failed to save goal.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-neutral-900 border-t sm:border border-neutral-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92dvh] overflow-y-auto shadow-2xl p-4 sm:p-6 relative flex flex-col chronos-modal-panel chronos-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 end-4 p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {currentGoal ? (locale === 'fa' ? 'ویرایش هدف راهبردی و OKR' : 'Edit Strategic Goal / OKR') : t('goals.newGoal')}
            </h2>
            <p className="text-xs text-neutral-400">
              {t('goals.subtitle')}
            </p>
          </div>
        </div>

        {validationError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              {t('modals.title')} <span className="text-rose-400">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              placeholder={locale === 'fa' ? 'مثال: تسلط کامل بر معماری سیستم‌های توزیع‌شده...' : 'e.g., Master Distributed Computing Infrastructure...'}
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
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              {t('modals.description')}
            </label>
            <textarea
              rows={2}
              placeholder={locale === 'fa' ? 'تعریف خروجی مطلوب و معیارهای موفقیت...' : 'Strategic significance, prerequisites, or notes...'}
              value={description}
              disabled={isSubmitting}
              onChange={(e) => setDescription(e.target.value)}
              className="app-textarea"
            />
          </div>

          {/* Category & Timeframe */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('modals.category')}
              </label>
              <select
                value={category}
                disabled={isSubmitting}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="app-select"
              >
                <option value="Academic/Study">{t('categories.academicStudy')}</option>
                <option value="Work/Career">{t('categories.workCareer')}</option>
                <option value="Personal Growth">{t('categories.personalGrowth')}</option>
                <option value="Health & Habits">{t('categories.healthHabits')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                {locale === 'fa' ? 'افق زمانی' : 'Timeframe'}
              </label>
              <select
                value={timeframe}
                disabled={isSubmitting}
                onChange={(e) => setTimeframe(e.target.value as any)}
                className="app-select"
              >
                <option value="quarterly">{locale === 'fa' ? 'سه ماهه (فصلی)' : 'Quarterly'}</option>
                <option value="monthly">{locale === 'fa' ? 'ماهانه' : 'Monthly'}</option>
                <option value="yearly">{locale === 'fa' ? 'سالانه' : 'Yearly'}</option>
              </select>
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              {locale === 'fa' ? 'تاریخ مهلت دستیابی' : 'Target Completion Date'}
            </label>
            <input
              type="date"
              value={targetDate}
              disabled={isSubmitting}
              onChange={(e) => setTargetDate(e.target.value)}
              className="app-input"
            />
          </div>

          {/* Key Results Builder */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              {locale === 'fa' ? 'نتایج کلیدی (Key Results)' : 'Key Results (OKRs)'} ({formatNumber(keyResults.length)})
            </label>

            {/* Input fields to add a Key Result */}
            <div className="space-y-2 mb-3 bg-neutral-800/40 p-3 rounded-xl border border-neutral-800">
              <input
                type="text"
                placeholder={locale === 'fa' ? 'عنوان نتیجه قابل سنجش...' : 'e.g. Implement Raft Lab 2A from scratch'}
                value={newKrTitle}
                onChange={(e) => setNewKrTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddKR();
                  }
                }}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Target"
                  value={newKrTarget}
                  onChange={(e) => setNewKrTarget(Number(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKR();
                    }
                  }}
                  className="w-24 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  placeholder="Unit (e.g. articles, %)"
                  value={newKrUnit}
                  onChange={(e) => setNewKrUnit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKR();
                    }
                  }}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddKR}
                  disabled={!newKrTitle.trim()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('common.add')}</span>
                </button>
              </div>
            </div>

            {/* Existing KRs */}
            {keyResults.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                {keyResults.map(kr => (
                  <div
                    key={kr.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-neutral-800/80 border border-neutral-700 text-xs"
                  >
                    <div className="flex-1 min-w-0 pe-2">
                      <p className="text-white truncate font-medium">{kr.title}</p>
                      <p className="text-[10px] text-neutral-400">
                        Target: {formatNumber(kr.targetValue)} {kr.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveKR(kr.id)}
                      className="p-1 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-800 mt-4">
            {currentGoal && onDelete ? (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  if (!isConfirmingDelete) {
                    setIsConfirmingDelete(true);
                    return;
                  }
                  await onDelete(currentGoal.id);
                  onClose();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 ${
                  isConfirmingDelete
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {isConfirmingDelete
                    ? (locale === 'fa' ? 'تأیید حذف هدف؟' : 'Confirm Delete?')
                    : t('common.delete')}
                </span>
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
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('common.loading')}</span>
                  </>
                ) : (
                  <span>{currentGoal ? t('common.save') : t('common.create')}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
