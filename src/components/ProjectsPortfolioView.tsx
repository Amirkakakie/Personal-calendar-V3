import React, { useState, useMemo } from 'react';
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
  X,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  TrendingUp,
  Edit3,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import type { Project, TaskCategory, TaskStatus } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { useTasks } from '../context/TaskContext.tsx';
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
  const { saveProject, deleteProject, showToast } = useTasks();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | TaskStatus>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal State (Create or Edit)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<TaskCategory>('Work/Career');
  const [status, setStatus] = useState<TaskStatus>('in_progress');
  const [targetHours, setTargetHours] = useState<number>(30);
  const [hourlyValuation, setHourlyValuation] = useState<number>(100);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingProjectId(null);
    setName('');
    setDescription('');
    setCategory('Work/Career');
    setStatus('in_progress');
    setTargetHours(30);
    setHourlyValuation(100);
    setDriveFolderUrl('');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProjectId(project.id);
    setName(project.name);
    setDescription(project.description || '');
    setCategory(project.category);
    setStatus(project.status || 'in_progress');
    setTargetHours(project.targetHours || 30);
    setHourlyValuation(project.hourlyValuation || 100);
    setDriveFolderUrl(project.driveFolderUrl || '');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage(locale === 'fa' ? 'لطفاً نام پروژه را وارد کنید.' : 'Please enter a project name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await saveProject({
        name: trimmedName,
        description: description.trim(),
        category,
        status,
        targetHours,
        hourlyValuation,
        driveFolderUrl: driveFolderUrl.trim() || 'https://drive.google.com/drive/u/0/my-drive',
      }, editingProjectId || undefined);

      setIsModalOpen(false);
      onRefreshData();
    } catch (err: any) {
      console.error('Failed to save project:', err);
      const msg = err.message || (locale === 'fa' ? 'خطا در ذخیره پروژه. لطفاً مجدداً تلاش کنید.' : 'Failed to save project. Please try again.');
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmPrompt = locale === 'fa' 
      ? 'آیا از حذف این پروژه اطمینان دارید؟ وظایف مرتبط حفظ خواهند شد.' 
      : 'Delete this project? Associated tasks will remain in the backlog.';
    if (confirm(confirmPrompt)) {
      try {
        await deleteProject(id);
        onRefreshData();
      } catch (err: any) {
        showToast(err.message || 'Failed to delete project', 'error');
      }
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

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchDesc = (p.description || '').toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      return true;
    });
  }, [projects, searchQuery, selectedStatus, selectedCategory]);

  // Aggregate Metrics
  const totalTargetHours = projects.reduce((acc, p) => acc + (p.targetHours || 0), 0);
  const totalLoggedHours = projects.reduce((acc, p) => acc + (p.loggedHours || 0), 0);
  const totalYieldValue = projects.reduce((acc, p) => acc + ((p.loggedHours || 0) * (p.hourlyValuation || 100)), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <FolderGit2 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">{t('projects.title')}</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {t('projects.subtitle')}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary self-start sm:self-auto flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>{t('projects.newProject')}</span>
        </button>
      </div>

      {/* Aggregate Metrics Summary Bar */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-[11px] font-mono uppercase text-neutral-500 block mb-1">Active Projects</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">{formatNumber(projects.length)}</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-[11px] font-mono uppercase text-neutral-500 block mb-1">Target Hours</span>
            <span className="text-xl font-bold font-mono text-white tracking-tight">{formatNumber(totalTargetHours)}h</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-[11px] font-mono uppercase text-neutral-500 block mb-1">Logged Hours</span>
            <span className="text-xl font-bold font-mono text-indigo-400 tracking-tight">{formatNumber(totalLoggedHours)}h</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800">
            <span className="text-[11px] font-mono uppercase text-neutral-500 block mb-1">Cumulative Yield</span>
            <span className="text-xl font-bold font-mono text-emerald-400 tracking-tight">${formatNumber(Math.round(totalYieldValue))}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {projects.length > 0 && (
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-neutral-500 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={locale === 'fa' ? 'جستجوی پروژه با نام یا مشخصات...' : 'Search projects by name or spec...'}
              className="w-full ps-10 pe-4 py-2 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-200 placeholder-neutral-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">{locale === 'fa' ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
              <option value="in_progress">{locale === 'fa' ? 'در جریان' : 'In Progress'}</option>
              <option value="completed">{locale === 'fa' ? 'تکمیل‌شده' : 'Completed'}</option>
              <option value="todo">{locale === 'fa' ? 'برنامه‌ریزی‌شده' : 'To Do'}</option>
              <option value="archived">{locale === 'fa' ? 'بایگانی‌شده' : 'Archived'}</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-300 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">{t('categories.allCategories')}</option>
              <option value="Work/Career">{t('categories.workCareer')}</option>
              <option value="Academic/Study">{t('categories.academicStudy')}</option>
              <option value="Personal Growth">{t('categories.personalGrowth')}</option>
              <option value="Health & Habits">{t('categories.healthHabits')}</option>
            </select>

            {(searchQuery || selectedStatus !== 'all' || selectedCategory !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                  setSelectedCategory('all');
                }}
                className="px-2.5 py-2 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded-xl transition-colors shrink-0"
              >
                {t('common.clear')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Projects Grid or Empty State */}
      {projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title={locale === 'fa' ? 'هنوز پروژه‌ای ثبت نشده است' : 'No Projects Established Yet'}
          description={locale === 'fa' ? 'پروژه‌های کاری، دانشگاهی یا توسعه فردی خود را تعریف کنید تا ساعات کاری و مستندات شما به صورت متمرکز مدیریت شوند.' : 'Define your high-impact initiatives, hourly valuations, and strategic documents to track cognitive ROI.'}
          actionLabel={t('projects.newProject')}
          onAction={openCreateModal}
        />
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-neutral-800 rounded-2xl text-xs text-neutral-500">
          {locale === 'fa' ? 'پروژه‌ای با معیارهای فیلتر شده یافت نشد.' : 'No projects matched the selected filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map(project => {
            const progressPct = Math.min(100, Math.round(((project.loggedHours || 0) / Math.max(1, project.targetHours || 1)) * 100));
            const totalValuation = Math.round((project.loggedHours || 0) * (project.hourlyValuation || 100));
            const docUrl = `https://docs.google.com/document/create?title=${encodeURIComponent(`[Chronos] ${project.name} - Spec & Notes`)}`;

            return (
              <div
                key={project.id}
                className="group rounded-2xl border border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700/80 p-5 flex flex-col justify-between transition-all hover:bg-neutral-900/90 shadow-sm"
              >
                <div>
                  {/* Meta Top */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {getCategoryLabel(project.category)}
                      </span>
                      {project.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {locale === 'fa' ? 'تکمیل‌شده' : 'Done'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(project)}
                        className="p-1.5 text-neutral-500 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                        title={t('common.edit')}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-800 transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {project.description || (locale === 'fa' ? 'بدون شرح تفصیلی' : 'No description provided')}
                  </p>

                  {/* Progress Bar */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                      <span>{progressPct}% fulfilled</span>
                      <span className="text-neutral-200 font-bold">{formatNumber(project.loggedHours || 0)} / {formatNumber(project.targetHours || 0)}h</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Economic Valuation Metric */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase font-mono block">
                        Valuation
                      </span>
                      <span className="text-neutral-200 font-mono font-semibold mt-0.5 block">
                        ${formatNumber(project.hourlyValuation || 100)}/hr
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

                {/* Workspace Action Links */}
                <div className="mt-5 pt-3.5 border-t border-neutral-800 flex items-center justify-between gap-2 text-xs">
                  <a
                    href={project.driveFolderUrl || 'https://drive.google.com/drive/u/0/my-drive'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Drive Folder</span>
                  </a>

                  <a
                    href={docUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Project Spec</span>
                    <ExternalLink className="w-3 h-3 ms-0.5 opacity-70" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-indigo-400" />
                <span>{editingProjectId ? (locale === 'fa' ? 'ویرایش پروژه' : 'Edit Project') : t('projects.newProject')}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  {t('modals.title')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'fa' ? 'مثال: سامانه ابری پردازش کلان‌داده' : 'e.g. Distributed Core & Kafka Streaming'}
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="app-input"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  {t('modals.description')}
                </label>
                <textarea
                  rows={2}
                  placeholder={locale === 'fa' ? 'شرح اهداف فنی و خروجی‌های مورد انتظار...' : 'Milestone deliverable objectives and spec...'}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="app-textarea"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {t('modals.category')}
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="app-select"
                    disabled={isSubmitting}
                  >
                    <option value="Work/Career">{t('categories.workCareer')}</option>
                    <option value="Academic/Study">{t('categories.academicStudy')}</option>
                    <option value="Personal Growth">{t('categories.personalGrowth')}</option>
                    <option value="Health & Habits">{t('categories.healthHabits')}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {locale === 'fa' ? 'وضعیت پروژه' : 'Project Status'}
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="app-select"
                    disabled={isSubmitting}
                  >
                    <option value="in_progress">{locale === 'fa' ? 'در حال انجام' : 'In Progress'}</option>
                    <option value="completed">{locale === 'fa' ? 'تکمیل‌شده' : 'Completed'}</option>
                    <option value="todo">{locale === 'fa' ? 'برنامه‌ریزی‌شده' : 'To Do'}</option>
                    <option value="archived">{locale === 'fa' ? 'بایگانی‌شده' : 'Archived'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {t('projects.targetHours')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetHours}
                    onChange={e => setTargetHours(Math.max(1, Number(e.target.value)))}
                    className="app-input font-mono"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[15, 30, 50, 100].map(h => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setTargetHours(h)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          targetHours === h
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    {t('projects.hourlyValuation')} ($/hr)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={hourlyValuation}
                    onChange={e => setHourlyValuation(Math.max(10, Number(e.target.value)))}
                    className="app-input font-mono"
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[50, 85, 120, 175].map(rate => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setHourlyValuation(rate)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          hourlyValuation === rate
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                        }`}
                      >
                        ${rate}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  {locale === 'fa' ? 'آدرس پوشه گوگل درایو یا اسناد' : 'Google Drive Folder or Docs URL'}
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/u/0/folders/..."
                  value={driveFolderUrl}
                  onChange={e => setDriveFolderUrl(e.target.value)}
                  className="app-input font-mono text-xs"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('common.loading')}</span>
                    </>
                  ) : (
                    <span>{editingProjectId ? t('common.save') : t('common.create')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

