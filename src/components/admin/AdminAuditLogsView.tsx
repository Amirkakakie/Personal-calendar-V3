import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Search, Filter, ShieldAlert, CheckCircle, 
  Clock, Globe, User, ChevronDown, ChevronUp, Code
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi, AdminAuditLog } from '../../services/adminApi';

export const AdminAuditLogsView: React.FC = () => {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Expandable row state
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getAuditLogs({
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        page,
        limit: 20
      });

      // Filter locally if search query is provided
      let items = res.logs;
      if (search.trim()) {
        const q = search.toLowerCase();
        items = items.filter(
          (l: AdminAuditLog) => l.action.toLowerCase().includes(q) ||
               (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
               (l.targetId && l.targetId.toLowerCase().includes(q)) ||
               (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
        );
      }

      setLogs(items);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetTypeFilter, page, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeClass = (action: string) => {
    if (action.includes('delete')) return 'bg-rose-950/70 text-rose-400 border border-rose-800/60';
    if (action.includes('unauthorized') || action.includes('failed')) return 'bg-rose-950/70 text-rose-300 border border-rose-800/60 font-bold';
    if (action.includes('status') || action.includes('suspend') || action.includes('archive')) return 'bg-amber-950/70 text-amber-400 border border-amber-800/60';
    if (action.includes('role') || action.includes('bootstrap')) return 'bg-purple-950/70 text-purple-400 border border-purple-800/60';
    if (action.includes('reset')) return 'bg-blue-950/70 text-blue-400 border border-blue-800/60';
    return 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60';
  };

  return (
    <div className="space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-400" />
            {t('admin.auditLogsTitle')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('admin.auditLogsSubtitle', { count: totalCount })}
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
            placeholder={t('admin.searchAuditLogsPlaceholder')}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={targetTypeFilter}
            onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1); }}
            className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">{t('admin.allTargets')}</option>
            <option value="user">{t('admin.user')}</option>
            <option value="project">{t('admin.project')}</option>
            <option value="team">{t('admin.team')}</option>
            <option value="system">{t('admin.system')}</option>
            <option value="auth">{t('admin.auth')}</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">{t('admin.allActions')}</option>
            <option value="user.status_change">{t('admin.actionUserStatus')}</option>
            <option value="user.role_change">{t('admin.actionUserRole')}</option>
            <option value="user.password_reset">{t('admin.actionPasswordReset')}</option>
            <option value="user.delete">{t('admin.actionUserDelete')}</option>
            <option value="project.archive">{t('admin.actionProjectArchive')}</option>
            <option value="project.delete">{t('admin.actionProjectDelete')}</option>
            <option value="team.delete">{t('admin.actionTeamDelete')}</option>
            <option value="system.maintenance">{t('admin.actionMaintenance')}</option>
            <option value="unauthorized_admin_access">{t('admin.actionUnauthorizedAccess')}</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            {t('admin.loadingLogs')}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {t('admin.noLogsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-medium border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">{t('admin.timestamp')}</th>
                  <th className="px-4 py-3">{t('admin.action')}</th>
                  <th className="px-4 py-3">{t('admin.actor')}</th>
                  <th className="px-4 py-3">{t('admin.target')}</th>
                  <th className="px-4 py-3">{t('admin.ipAddress')}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{t('admin.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="text-slate-200 font-medium">{log.actorEmail || 'System'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="uppercase text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {log.targetType}
                            </span>
                            {log.targetId && (
                              <span className="font-mono text-slate-400 text-[11px] truncate max-w-[120px]">
                                {log.targetId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">
                          {log.ipAddress || '—'}
                        </td>
                        <td className="px-4 py-3 text-right rtl:text-left">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800 transition"
                          >
                            <Code className="w-3.5 h-3.5" />
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-slate-800">
                          <td colSpan={6} className="p-4">
                            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono overflow-x-auto text-emerald-400">
                              <pre>{JSON.stringify({ ...log, details: log.details || {} }, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
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
    </div>
  );
};
