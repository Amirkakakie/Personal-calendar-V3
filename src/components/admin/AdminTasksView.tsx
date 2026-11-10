import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckSquare, Search, Filter, Eye, AlertCircle, Clock, 
  Calendar, CheckCircle, Flame, Flag, Tag, X, FileText 
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi, AdminTaskItem } from '../../services/adminApi';

export const AdminTasksView: React.FC = () => {
  const { t } = useI18n();
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'team'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected task inspection modal
  const [selectedTask, setSelectedTask] = useState<AdminTaskItem | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getTasks({
        search: search.trim() || undefined,
        status: statusFilter,
        priority: priorityFilter,
        type: typeFilter,
        page,
        limit: 15
      });
      setTasks(res.tasks);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter, typeFilter, page]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-950/70 text-rose-400 border border-rose-800/60';
      case 'high':
        return 'bg-amber-950/70 text-amber-400 border border-amber-800/60';
      case 'medium':
        return 'bg-blue-950/70 text-blue-400 border border-blue-800/60';
      default:
        return 'bg-slate-800/70 text-slate-400 border border-slate-700/60';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60';
      case 'in_progress':
        return 'bg-indigo-950/70 text-indigo-400 border border-indigo-800/60';
      default:
        return 'bg-slate-800/70 text-slate-300 border border-slate-700/60';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-400" />
            {t('admin.tasksInspection')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('admin.showingTasks', { count: totalCount })}
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
            placeholder={t('admin.searchTasksPlaceholder')}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as any); setPage(1); }}
            className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{t('admin.allTypes')}</option>
            <option value="personal">{t('admin.personalTasks')}</option>
            <option value="team">{t('admin.teamTasks')}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
            className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{t('admin.allStatuses')}</option>
            <option value="todo">{t('admin.todo')}</option>
            <option value="in_progress">{t('admin.inProgress')}</option>
            <option value="completed">{t('admin.completed')}</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value as any); setPage(1); }}
            className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">{t('admin.allPriorities')}</option>
            <option value="low">{t('admin.priorityLow')}</option>
            <option value="medium">{t('admin.priorityMedium')}</option>
            <option value="high">{t('admin.priorityHigh')}</option>
            <option value="urgent">{t('admin.priorityUrgent')}</option>
          </select>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            {t('admin.loadingTasks')}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400">{error}</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {t('admin.noTasksFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-medium border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">{t('admin.taskTitle')}</th>
                  <th className="px-4 py-3">{t('admin.scope')}</th>
                  <th className="px-4 py-3">{t('admin.owner')}</th>
                  <th className="px-4 py-3">{t('admin.priority')}</th>
                  <th className="px-4 py-3">{t('admin.status')}</th>
                  <th className="px-4 py-3">{t('admin.dueDate')}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white truncate max-w-sm">{task.title}</p>
                        {task.category && (
                          <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                            {task.category}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        task.type === 'team'
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-800/50'
                          : 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                      }`}>
                        {task.type === 'team' ? t('admin.team') : t('admin.personal')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-slate-200">{task.ownerName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{task.ownerEmail || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase font-mono ${getPriorityBadgeClass(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeClass(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right rtl:text-left">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                        title={t('admin.viewTaskDetails')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">{t('admin.taskDetails')}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">{t('admin.taskTitle')}</span>
                <p className="text-base font-semibold text-white">{selectedTask.title}</p>
              </div>

              {selectedTask.description && (
                <div>
                  <span className="text-slate-500 block mb-1">{t('admin.description')}</span>
                  <p className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 whitespace-pre-wrap">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block">{t('admin.scope')}</span>
                  <span className="font-medium text-slate-200 capitalize">{selectedTask.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('admin.status')}</span>
                  <span className={`font-medium capitalize ${
                    selectedTask.status === 'completed' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {selectedTask.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('admin.priority')}</span>
                  <span className="font-mono uppercase font-bold text-slate-200">{selectedTask.priority}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('admin.category')}</span>
                  <span className="text-slate-200">{selectedTask.category || 'General'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('admin.owner')}</span>
                  <span className="text-slate-200">{selectedTask.ownerName || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">{t('admin.created')}</span>
                  <span className="text-slate-200">{new Date(selectedTask.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                {t('admin.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
