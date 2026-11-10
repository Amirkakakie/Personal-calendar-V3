import React, { useState, useEffect, useCallback } from 'react';
import { 
  FolderKanban, Search, Filter, Eye, Archive, Trash2, RotateCcw, 
  AlertTriangle, X, CheckCircle, ExternalLink, Calendar, Users, CheckSquare
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { 
  adminApi, 
  AdminProjectItem, 
  AdminProjectDetails 
} from '../../services/adminApi';

export const AdminProjectsView: React.FC = () => {
  const { t } = useI18n();
  const [projects, setProjects] = useState<AdminProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'team'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected project modal details
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetails, setProjectDetails] = useState<AdminProjectDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Delete modal state
  const [projectToDelete, setProjectToDelete] = useState<AdminProjectItem | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getProjects({
        search: search.trim() || undefined,
        type: typeFilter,
        status: statusFilter,
        page,
        limit: 15
      });
      setProjects(res.projects);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleOpenDetails = async (projectId: string) => {
    setSelectedProjectId(projectId);
    setDetailsLoading(true);
    try {
      const data = await adminApi.getProjectDetails(projectId);
      setProjectDetails(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load project details');
      setSelectedProjectId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleToggleArchive = async (project: AdminProjectItem) => {
    const shouldArchive = !project.isArchived;
    const msg = shouldArchive ? t('admin.confirmArchiveProject') : t('admin.confirmRestoreProject');
    if (!window.confirm(msg)) return;

    try {
      setActionLoading(true);
      await adminApi.archiveProject(project.id, shouldArchive);
      await fetchProjects();
      if (selectedProjectId === project.id) {
        handleOpenDetails(project.id);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update project status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    if (confirmName !== projectToDelete.name) {
      alert(t('admin.nameMismatch'));
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      setConfirmName('');
      if (selectedProjectId === projectToDelete.id) {
        setSelectedProjectId(null);
        setProjectDetails(null);
      }
      await fetchProjects();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            {t('admin.projectsManagement')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('admin.showingProjects', { count: totalCount })}
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.searchProjectsPlaceholder')}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as any); setPage(1); }}
              className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">{t('admin.allTypes')}</option>
              <option value="personal">{t('admin.personalProjects')}</option>
              <option value="team">{t('admin.teamProjects')}</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{t('admin.allStatuses')}</option>
            <option value="active">{t('admin.active')}</option>
            <option value="archived">{t('admin.archived')}</option>
          </select>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            {t('admin.loadingProjects')}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400">{error}</div>
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {t('admin.noProjectsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-medium border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">{t('admin.projectName')}</th>
                  <th className="px-4 py-3">{t('admin.projectType')}</th>
                  <th className="px-4 py-3">{t('admin.owner')}</th>
                  <th className="px-4 py-3 text-center">{t('admin.tasks')}</th>
                  <th className="px-4 py-3">{t('admin.status')}</th>
                  <th className="px-4 py-3">{t('admin.created')}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: p.color || '#6366f1' }}
                        />
                        <div>
                          <p className="font-medium text-white truncate max-w-xs">{p.name}</p>
                          <p className="text-xs text-slate-500 font-mono">{p.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        p.type === 'team'
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-800/50'
                          : 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                      }`}>
                        {p.type === 'team' ? t('admin.team') : t('admin.personal')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-slate-200">{p.ownerName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{p.ownerEmail || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-mono text-slate-300 bg-slate-800/60 px-2 py-1 rounded">
                        {p.taskCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.isArchived
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                          : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                      }`}>
                        {p.isArchived ? t('admin.archived') : t('admin.active')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right rtl:text-left">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetails(p.id)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          title={t('admin.viewProjectDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                          title={p.isArchived ? t('admin.restoreProject') : t('admin.archiveProject')}
                        >
                          {p.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setProjectToDelete(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          title={t('admin.deleteProject')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              {t('admin.pageOf', { page, totalPages })}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-200"
              >
                {t('admin.previous')}
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-200"
              >
                {t('admin.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Read-only Project Detail Modal */}
      {selectedProjectId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <FolderKanban className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">{t('admin.projectInspection')}</h3>
              </div>
              <button
                onClick={() => { setSelectedProjectId(null); setProjectDetails(null); }}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading || !projectDetails ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                {t('admin.loadingDetails')}
              </div>
            ) : (
              <div className="space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-xs text-slate-500 block">{t('admin.projectName')}</span>
                    <span className="font-semibold text-white">{projectDetails.project.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('admin.projectType')}</span>
                    <span className="capitalize text-slate-300">{projectDetails.project.type}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('admin.owner')}</span>
                    <span className="text-slate-300">{projectDetails.project.ownerName} ({projectDetails.project.ownerEmail})</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('admin.status')}</span>
                    <span className={projectDetails.project.isArchived ? 'text-amber-400' : 'text-emerald-400'}>
                      {projectDetails.project.isArchived ? t('admin.archived') : t('admin.active')}
                    </span>
                  </div>
                  {projectDetails.project.description && (
                    <div className="col-span-2">
                      <span className="text-xs text-slate-500 block">{t('admin.description')}</span>
                      <p className="text-slate-300 text-xs mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">
                        {projectDetails.project.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tasks List */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    {t('admin.projectTasks', { count: projectDetails.tasks.length })}
                  </h4>
                  {projectDetails.tasks.length === 0 ? (
                    <div className="text-xs text-slate-500 p-4 text-center bg-slate-950/40 rounded-lg">
                      {t('admin.noTasksInProject')}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {projectDetails.tasks.map((task: any) => (
                        <div key={task.id} className="p-2.5 bg-slate-950/70 border border-slate-800/60 rounded-lg flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              task.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`} />
                            <span className="text-slate-200 font-medium">{task.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-mono text-[10px]">{task.priority}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              task.status === 'completed' ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Members if applicable */}
                {projectDetails.members && projectDetails.members.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400" />
                      {t('admin.teamMembers')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {projectDetails.members.map((m: any) => (
                        <div key={m.userId} className="p-2 bg-slate-950/70 border border-slate-800/60 rounded flex items-center justify-between text-xs">
                          <span className="text-slate-200 truncate">{m.userName || m.userId}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{m.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">{t('admin.deleteProjectTitle')}</h3>
            </div>
            <p className="text-sm text-slate-300">
              {t('admin.deleteProjectWarning', { name: projectToDelete.name })}
            </p>
            <p className="text-xs text-rose-400 bg-rose-950/40 p-3 rounded-lg border border-rose-900/50">
              {t('admin.deleteProjectDoubleWarning')}
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('admin.typeToConfirm', { match: projectToDelete.name })}
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={projectToDelete.name}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => { setProjectToDelete(null); setConfirmName(''); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                {t('admin.cancel')}
              </button>
              <button
                type="button"
                disabled={confirmName !== projectToDelete.name || actionLoading}
                onClick={handleDeleteProject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition"
              >
                {actionLoading ? t('admin.deleting') : t('admin.confirmDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
