import React, { useState } from 'react';
import { 
  FolderGit2, 
  ExternalLink, 
  Plus, 
  FileText, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  Trash2, 
  FolderOpen,
  X
} from 'lucide-react';
import type { Project, TaskCategory } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { EmptyState } from './EmptyState.tsx';

interface ProjectsPortfolioViewProps {
  projects: Project[];
  onRefreshData: () => void;
}

export const ProjectsPortfolioView: React.FC<ProjectsPortfolioViewProps> = ({
  projects,
  onRefreshData
}) => {
  const { t, locale, formatNumber } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<TaskCategory>('Work/Career');
  const [targetHours, setTargetHours] = useState<number>(30);
  const [hourlyValuation, setHourlyValuation] = useState<number>(100);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createProject({
        name: name.trim(),
        description: description.trim(),
        category,
        targetHours,
        hourlyValuation,
        driveFolderUrl: driveFolderUrl.trim() || 'https://drive.google.com/drive/u/0/my-drive',
        status: 'in_progress'
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      onRefreshData();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(locale === 'fa' ? 'آیا از حذف این پروژه اطمینان دارید؟ وظایف مرتبط حفظ خواهند شد.' : 'Delete this project? Associated tasks will remain in the backlog.')) {
      await api.deleteProject(id);
      onRefreshData();
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'Work/Career': return t('categories.workCareer');
      case 'Academic/Study': return t('categories.academicStudy');
      case 'Personal Growth': return t('categories.personalGrowth');
      case 'Health & Habits': return t('categories.healthHabits');
      default: return cat;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">{t('projects.title')}</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {t('projects.subtitle')}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('projects.newProject')}</span>
        </button>
      </div>

      {/* Projects Grid or Empty State */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title={locale === 'fa' ? 'هنوز پروژه‌ای ثبت نشده است' : 'No Projects Established Yet'}
          description={locale === 'fa' ? 'پروژه‌های کاری، دانشگاهی یا توسعه فردی خود را تعریف کنید تا ساعات کاری و مستندات شما به صورت متمرکز مدیریت شوند.' : 'Define your high-impact initiatives, hourly valuations, and strategic documents to track cognitive ROI.'}
          actionLabel={t('projects.newProject')}
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const progressPct = Math.min(100, Math.round((project.loggedHours / Math.max(1, project.targetHours)) * 100));
          const totalValuation = Math.round(project.loggedHours * project.hourlyValuation);
          const docUrl = `https://docs.google.com/document/create?title=${encodeURIComponent(`[Chronos] ${project.name} - Spec & Notes`)}`;

          return (
            <div
              key={project.id}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 p-5 flex flex-col justify-between transition-all hover:bg-white/[0.03]"
            >
              <div>
                {/* Meta Top */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white/5 text-indigo-300 border border-white/5">
                    {getCategoryLabel(project.category)}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-white/[0.05]"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-[15px] font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {project.name}
                </h3>
                <p className="text-[12px] text-neutral-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {project.description}
                </p>

                {/* Progress Bar */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                    <span>{progressPct}% fulfilled</span>
                    <span className="text-neutral-300 font-bold">{formatNumber(project.loggedHours)} / {formatNumber(project.targetHours)}h</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Economic Metric */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase font-mono block">
                      Valuation
                    </span>
                    <span className="text-white font-mono font-semibold mt-0.5 block">
                      ${formatNumber(project.hourlyValuation)}/hr
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 text-[10px] uppercase font-mono block">
                      Yield
                    </span>
                    <span className="text-emerald-400 font-mono font-semibold mt-0.5 block">
                      ${formatNumber(totalValuation)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workspace Action Buttons */}
              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-2 text-[12px]">
                <a
                  href={project.driveFolderUrl || 'https://drive.google.com/drive/u/0/my-drive'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Drive</span>
                </a>

                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Spec</span>
                  <ExternalLink className="w-3 h-3 ms-0.5 opacity-70" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-400" />
                <span>{t('projects.newProject')}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {t('modals.title')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'fa' ? 'مثال: معماری میکروسرویس‌های سازمان' : 'e.g. Distributed Core & Kafka Streaming'}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {t('modals.description')}
                </label>
                <textarea
                  rows={2}
                  placeholder={locale === 'fa' ? 'شرح اهداف فنی و خروجی‌های مورد انتظار...' : 'Milestone deliverable objectives and spec...'}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    {t('modals.category')}
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Work/Career">{t('categories.workCareer')}</option>
                    <option value="Academic/Study">{t('categories.academicStudy')}</option>
                    <option value="Personal Growth">{t('categories.personalGrowth')}</option>
                    <option value="Health & Habits">{t('categories.healthHabits')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1">
                    {t('projects.targetHours')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetHours}
                    onChange={e => setTargetHours(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  {t('projects.hourlyValuation')} ($/hr)
                </label>
                <input
                  type="number"
                  min="10"
                  value={hourlyValuation}
                  onChange={e => setHourlyValuation(Math.max(10, Number(e.target.value)))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white rounded-xl text-xs font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  {isSubmitting ? t('common.loading') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
