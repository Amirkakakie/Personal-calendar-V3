import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, Search, Eye, Trash2, AlertTriangle, X, Users, 
  FolderKanban, Calendar, Shield, Mail
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { adminApi, AdminTeamItem, AdminTeamDetails } from '../../services/adminApi';

export const AdminTeamsView: React.FC = () => {
  const { t } = useI18n();
  const [teams, setTeams] = useState<AdminTeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected team details modal
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamDetails, setTeamDetails] = useState<AdminTeamDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Delete modal
  const [teamToDelete, setTeamToDelete] = useState<AdminTeamItem | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getTeams({
        search: search.trim() || undefined,
        page,
        limit: 15
      });
      setTeams(res.teams);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleOpenDetails = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setDetailsLoading(true);
    try {
      const data = await adminApi.getTeamDetails(teamId);
      setTeamDetails(data);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to load team details');
      setSelectedTeamId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!teamToDelete) return;
    if (confirmName !== teamToDelete.name) {
      alert(t('admin.nameMismatch'));
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.deleteTeam(teamToDelete.id);
      setTeamToDelete(null);
      setConfirmName('');
      if (selectedTeamId === teamToDelete.id) {
        setSelectedTeamId(null);
        setTeamDetails(null);
      }
      await fetchTeams();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete team');
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
            <Building2 className="w-6 h-6 text-purple-400" />
            {t('admin.teamsManagement')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {t('admin.showingTeams', { count: totalCount })}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 rtl:left-auto rtl:right-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.searchTeamsPlaceholder')}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-lg pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Teams Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            {t('admin.loadingTeams')}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-400">{error}</div>
        ) : teams.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            {t('admin.noTeamsFound')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right text-sm">
              <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-medium border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">{t('admin.teamName')}</th>
                  <th className="px-4 py-3">{t('admin.owner')}</th>
                  <th className="px-4 py-3 text-center">{t('admin.members')}</th>
                  <th className="px-4 py-3 text-center">{t('admin.projects')}</th>
                  <th className="px-4 py-3">{t('admin.created')}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-white">{team.name}</p>
                        <p className="text-xs text-slate-500 font-mono">@{team.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-slate-200">{team.ownerName || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">{team.ownerEmail || '—'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded font-mono">
                        <Users className="w-3 h-3 text-purple-400" />
                        {team.memberCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded font-mono">
                        <FolderKanban className="w-3 h-3 text-indigo-400" />
                        {team.projectCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right rtl:text-left">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetails(team.id)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                          title={t('admin.viewTeamDetails')}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTeamToDelete(team)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          title={t('admin.deleteTeam')}
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

      {/* Team Details Modal */}
      {selectedTeamId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-bold text-white">{t('admin.teamInspection')}</h3>
              </div>
              <button
                onClick={() => { setSelectedTeamId(null); setTeamDetails(null); }}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailsLoading || !teamDetails ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                {t('admin.loadingDetails')}
              </div>
            ) : (
              <div className="space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-xs text-slate-500 block">{t('admin.teamName')}</span>
                    <span className="font-semibold text-white">{teamDetails.team.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('admin.teamSlug')}</span>
                    <span className="font-mono text-purple-400">@{teamDetails.team.slug}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('admin.owner')}</span>
                    <span className="text-slate-300">{teamDetails.team.ownerName} ({teamDetails.team.ownerEmail})</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">{t('admin.created')}</span>
                    <span className="text-slate-300">{new Date(teamDetails.team.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Team Members */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    {t('admin.teamMembers')} ({teamDetails.members.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {teamDetails.members.map((member: any) => (
                      <div key={member.id} className="p-2.5 bg-slate-950/70 border border-slate-800/60 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <p className="font-medium text-white">{member.userName || 'Member'}</p>
                          <p className="text-[11px] text-slate-500">{member.userEmail || member.userId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold ${
                            member.role === 'owner' 
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : member.role === 'admin'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {member.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Projects */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-indigo-400" />
                    {t('admin.teamProjects')} ({teamDetails.projects.length})
                  </h4>
                  {teamDetails.projects.length === 0 ? (
                    <div className="text-xs text-slate-500 p-4 text-center bg-slate-950/40 rounded-lg">
                      {t('admin.noProjectsFound')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {teamDetails.projects.map((proj: any) => (
                        <div key={proj.id} className="p-3 bg-slate-950/70 border border-slate-800/60 rounded-lg text-xs">
                          <p className="font-medium text-white truncate">{proj.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {new Date(proj.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">{t('admin.deleteTeamTitle')}</h3>
            </div>
            <p className="text-sm text-slate-300">
              {t('admin.deleteTeamWarning', { name: teamToDelete.name })}
            </p>
            <p className="text-xs text-rose-400 bg-rose-950/40 p-3 rounded-lg border border-rose-900/50">
              {t('admin.deleteTeamDoubleWarning')}
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {t('admin.typeToConfirm', { match: teamToDelete.name })}
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={teamToDelete.name}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => { setTeamToDelete(null); setConfirmName(''); }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                {t('admin.cancel')}
              </button>
              <button
                type="button"
                disabled={confirmName !== teamToDelete.name || actionLoading}
                onClick={handleDeleteTeam}
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
