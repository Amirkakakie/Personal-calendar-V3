import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle, Loader2 } from 'lucide-react';
import { useTeam } from '../../context/TeamContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f43f5e'  // Rose
];

export const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose }) => {
  const { createProject, teamMembers } = useTeam();
  const { t, direction } = useI18n();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!key || key.length <= 4) {
      // Auto-suggest key prefix
      const words = val.trim().split(/\s+/);
      if (words.length >= 2) {
        setKey((words[0][0] + words[1][0] + (words[2] ? words[2][0] : '')).toUpperCase().slice(0, 4));
      } else if (words[0].length >= 3) {
        setKey(words[0].slice(0, 3).toUpperCase());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(direction === 'rtl' ? 'نام پروژه الزامی است.' : 'Project name is required.');
      return;
    }
    if (!key.trim()) {
      setError(direction === 'rtl' ? 'پیشوند شناسه پروژه الزامی است.' : 'Project key prefix is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const proj = await createProject({
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
        color,
        icon: 'FolderGit2',
        targetDate: targetDate || undefined
      });

      if (proj) {
        setName('');
        setKey('');
        setDescription('');
        onClose();
      } else {
        setError(direction === 'rtl' ? 'خطا در ایجاد پروژه. لطفاً مجدداً تلاش کنید.' : 'Failed to create project. Please try again.');
      }
    } catch (err: any) {
      console.error('[ProjectModal] Create project failed:', err);
      setError(err.message || (direction === 'rtl' ? 'خطا در ایجاد پروژه.' : 'Failed to create project.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              {t('team.projectModalTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-neutral-400">
            {t('team.projectModalSubtitle')}
          </p>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              {t('team.projectName')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Authentication & Security Engine"
              className="app-input"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                {t('team.projectKey')} *
              </label>
              <input
                type="text"
                maxLength={5}
                value={key}
                onChange={e => setKey(e.target.value.toUpperCase())}
                placeholder="e.g. AUTH"
                className="app-input font-mono uppercase"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                {t('kanban.dueDate')}
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                className="app-input"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              {t('team.projectDescription')}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Scope, architectural objectives, milestones..."
              className="app-textarea"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              {t('team.projectColor')}
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-lg transition-transform ${color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-neutral-900' : 'opacity-80 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-neutral-800">
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
              disabled={isSubmitting || !name.trim() || !key.trim()}
              className="btn-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('common.loading')}</span>
                </>
              ) : (
                <span>{t('team.createProject')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
