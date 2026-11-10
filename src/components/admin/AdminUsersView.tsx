import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  KeyRound, 
  Trash2, 
  Eye, 
  Shield, 
  Check, 
  X, 
  Copy,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Building2,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { adminApi, AdminUserItem } from '../../services/adminApi.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export const AdminUsersView: React.FC = () => {
  const { t, formatDate, formatNumber } = useI18n();
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Modals & Action States
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState('Member');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getUsers({
        q: search.trim() || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        page,
        limit
      });
      setUsers(res.data);
      setTotal(res.pagination.total);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, roleFilter, page, limit]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenDetails = async (user: AdminUserItem) => {
    setSelectedUser(user);
    setIsDetailsModalOpen(true);
    setUserDetails(null);
    try {
      const details = await adminApi.getUserDetails(user.id);
      setUserDetails(details);
    } catch (err) {
      console.error('Failed to load user details:', err);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    const targetStatus = selectedUser.status === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await adminApi.updateUserStatus(selectedUser.id, targetStatus, suspendReason);
      setActionMessage({ text: res.message, type: 'success' });
      setIsSuspendModalOpen(false);
      setSuspendReason('');
      loadUsers();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Operation failed', type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      const res = await adminApi.updateUserRole(selectedUser.id, newRole);
      setActionMessage({ text: res.message, type: 'success' });
      setIsRoleModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to update role', type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmPasswordReset = async () => {
    if (!selectedUser) return;
    setIsActionLoading(true);
    try {
      const res = await adminApi.resetUserPassword(selectedUser.id);
      setTempPassword(res.tempPassword || null);
      setActionMessage({ text: res.message, type: 'success' });
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to reset password', type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser || deleteConfirmText !== selectedUser.email) return;
    setIsActionLoading(true);
    try {
      const res = await adminApi.deleteUser(selectedUser.id);
      setActionMessage({ text: res.message, type: 'success' });
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
      loadUsers();
    } catch (err: any) {
      setActionMessage({ text: err.message || 'Failed to delete user', type: 'error' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Banner */}
      {actionMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/30' 
            : 'bg-rose-950/90 text-rose-300 border border-rose-500/30'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-400" />
            <span>{t('admin.navUsers')}</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Total {formatNumber(total)} registered accounts across Chronos.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-neutral-500 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('admin.searchUsers')}
              className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none focus:border-violet-500"
          >
            <option value="all">{t('admin.filterStatus')}: {t('admin.filterAll')}</option>
            <option value="active">{t('admin.active')}</option>
            <option value="suspended">{t('admin.suspended')}</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-300 focus:outline-none focus:border-violet-500"
          >
            <option value="all">{t('admin.filterRole')}: {t('admin.filterAll')}</option>
            <option value="Member">Member</option>
            <option value="superadmin">Super Admin</option>
            <option value="Admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 overflow-hidden backdrop-blur shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-950/60 text-neutral-400 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 text-start">User</th>
                <th className="py-3 px-4 text-start">Status</th>
                <th className="py-3 px-4 text-start">Role</th>
                <th className="py-3 px-4 text-start">Projects</th>
                <th className="py-3 px-4 text-start">Teams</th>
                <th className="py-3 px-4 text-start">Joined</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {users.map(u => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-neutral-850/50 transition-colors">
                    {/* User Identity */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${u.avatarColor || 'from-violet-600 to-indigo-600'} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                          {u.initials || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-neutral-200 truncate">{u.name}</p>
                          <p className="text-[11px] text-neutral-400 font-mono truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        u.status === 'suspended'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'suspended' ? 'bg-rose-500' : 'bg-emerald-400'}`} />
                        <span>{u.status === 'suspended' ? t('admin.suspended') : t('admin.active')}</span>
                      </span>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        u.role === 'superadmin'
                          ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                          : u.role === 'Admin'
                          ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Projects count */}
                    <td className="py-3 px-4 font-mono text-neutral-300">
                      {u.personalProjectsCount}
                    </td>

                    {/* Team memberships count */}
                    <td className="py-3 px-4 font-mono text-neutral-300">
                      {u.teamMembershipsCount}
                    </td>

                    {/* Joined Date */}
                    <td className="py-3 px-4 text-neutral-400 font-mono text-[11px]">
                      {formatDate(u.joinedAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(u)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                          title={t('admin.userDetails')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Suspend / Reactivate */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setIsSuspendModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.status === 'suspended'
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            }`}
                            title={u.status === 'suspended' ? t('admin.reactivateUser') : t('admin.suspendUser')}
                          >
                            {u.status === 'suspended' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {/* Change Role */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setNewRole(u.role);
                              setIsRoleModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                            title={t('admin.changeRole')}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setTempPassword(null);
                            setIsPasswordModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                          title={t('admin.resetPassword')}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete User */}
                        {!isSelf && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(u);
                              setDeleteConfirmText('');
                              setIsDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title={t('admin.deleteUser')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-500 text-xs">
                    {t('admin.noRecords')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-800 bg-neutral-950/40 text-xs text-neutral-400">
          <span>
            {t('admin.page')} {page} {t('admin.of')} {totalPages} ({formatNumber(total)} total)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. User Details Modal */}
      {isDetailsModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${selectedUser.avatarColor || 'from-violet-600 to-indigo-600'} flex items-center justify-center text-sm font-bold text-white shadow`}>
                  {selectedUser.initials || 'U'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-neutral-400 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailsModalOpen(false)} className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {userDetails ? (
              <div className="space-y-5 text-xs">
                {/* Meta Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">User ID</p>
                    <p className="font-mono text-neutral-300 truncate">{selectedUser.id}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">Role</p>
                    <p className="font-semibold text-violet-300">{selectedUser.role}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">Status</p>
                    <p className="font-semibold text-emerald-400">{selectedUser.status}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-800">
                    <p className="text-[10px] text-neutral-500 uppercase font-bold">Registered</p>
                    <p className="font-mono text-neutral-300">{formatDate(selectedUser.joinedAt)}</p>
                  </div>
                </div>

                {/* Personal Projects */}
                <div className="space-y-2">
                  <h4 className="font-bold text-neutral-200 flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-sky-400" />
                    <span>Personal Projects ({userDetails.personalProjectsCount})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                    {userDetails.personalProjects.map((p: any) => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800 flex items-center justify-between">
                        <span className="font-semibold text-neutral-200">{p.name}</span>
                        <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
                          <span>{p.status}</span>
                          <span>•</span>
                          <span>{p.loggedHours}h logged</span>
                        </div>
                      </div>
                    ))}
                    {userDetails.personalProjects.length === 0 && (
                      <p className="text-neutral-500 italic py-2">No personal projects.</p>
                    )}
                  </div>
                </div>

                {/* Team Workspaces */}
                <div className="space-y-2">
                  <h4 className="font-bold text-neutral-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span>Team Workspaces ({userDetails.workspaces.length})</span>
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                    {userDetails.workspaces.map((w: any) => (
                      <div key={w.id} className="p-2.5 rounded-xl bg-neutral-950/50 border border-neutral-800 flex items-center justify-between">
                        <span className="font-semibold text-neutral-200">{w.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-semibold">{w.role}</span>
                      </div>
                    ))}
                    {userDetails.workspaces.length === 0 && (
                      <p className="text-neutral-500 italic py-2">No team memberships.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-neutral-400 animate-pulse">
                Loading detailed user records...
              </div>
            )}

            <div className="pt-2 text-end">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-200 hover:text-white font-semibold text-xs"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Suspend / Reactivate Confirmation Modal */}
      {isSuspendModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-white">
                {selectedUser.status === 'suspended' ? t('admin.reactivateUser') : t('admin.suspendUser')}
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Are you sure you want to {selectedUser.status === 'suspended' ? 'reactivate' : 'suspend'} the account for <strong className="text-neutral-200">{selectedUser.email}</strong>?
              {selectedUser.status !== 'suspended' && ' The user will immediately be blocked from logging in or making API requests.'}
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-400">Administrative Reason (logged in audit stream)</label>
              <input
                type="text"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="e.g. Inappropriate conduct, security review"
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-semibold text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={isActionLoading}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md shadow-amber-600/30 disabled:opacity-50"
              >
                {isActionLoading ? t('common.loading') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Role Change Modal */}
      {isRoleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-violet-400">
              <Shield className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-white">{t('admin.changeRole')}</h3>
            </div>
            <p className="text-xs text-neutral-400">
              Select permitted role for <strong className="text-neutral-200">{selectedUser.email}</strong>:
            </p>

            <div className="space-y-2">
              {['Member', 'Admin', 'superadmin'].map(r => (
                <label 
                  key={r}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    newRole === r 
                      ? 'bg-violet-600/15 border-violet-500/40 text-violet-200' 
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:bg-neutral-850'
                  }`}
                >
                  <span className="font-bold text-xs">{r}</span>
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={newRole === r}
                    onChange={() => setNewRole(r)}
                    className="accent-violet-500"
                  />
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-semibold text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmRoleChange}
                disabled={isActionLoading}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-600/30 disabled:opacity-50"
              >
                {isActionLoading ? t('common.loading') : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Password Reset Modal */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-indigo-400">
              <KeyRound className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-white">{t('admin.resetPassword')}</h3>
            </div>

            {!tempPassword ? (
              <>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Generate a cryptographically secure temporary password for <strong className="text-neutral-200">{selectedUser.email}</strong>. Passwords and hashes are never exposed in plaintext in database records.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-semibold text-xs"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmPasswordReset}
                    disabled={isActionLoading}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {isActionLoading ? t('common.loading') : 'Generate Password'}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 space-y-2">
                  <p className="text-xs font-bold">{t('admin.tempPasswordNotice')}:</p>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-sm text-white select-all">
                    <span>{tempPassword}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                      }}
                      className="p-1 text-emerald-400 hover:text-emerald-300"
                    >
                      {copiedPassword ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Provide this temporary password securely to the user. It will not be shown again.
                  </p>
                </div>

                <div className="text-end">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-800 text-white font-semibold text-xs"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Delete Account Double-Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-neutral-900 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-extrabold text-base text-white">{t('admin.deleteUser')}</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              This action is permanent and cannot be undone. All personal tasks, projects, goals, and memberships associated with <strong className="text-rose-300">{selectedUser.email}</strong> will be permanently purged.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] text-neutral-400">
                To confirm deletion, type <span className="font-mono text-rose-400 font-bold">{selectedUser.email}</span> below:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={selectedUser.email}
                className="w-full px-3 py-2 text-xs rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-semibold text-xs"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText !== selectedUser.email || isActionLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/30 disabled:opacity-40"
              >
                {isActionLoading ? t('common.loading') : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
