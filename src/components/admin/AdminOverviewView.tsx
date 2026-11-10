import React from 'react';
import { 
  Users, 
  FolderGit2, 
  Building2, 
  CheckSquare, 
  TrendingUp, 
  UserCheck, 
  UserX, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import type { AdminOverviewStats } from '../../services/adminApi.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';
import type { AdminTab } from './AdminLayout.tsx';

interface AdminOverviewViewProps {
  stats: AdminOverviewStats | null;
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminOverviewView: React.FC<AdminOverviewViewProps> = ({ stats, onNavigateTab }) => {
  const { t, direction, formatNumber, formatDate } = useI18n();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  if (!stats) {
    return (
      <div className="py-20 text-center text-neutral-400">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  const { users, projects, teams, activity } = stats;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/60 via-indigo-950/40 to-neutral-900 border border-violet-500/20 p-6 sm:p-8 backdrop-blur">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-violet-300">
                Super Admin Operational Deck
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('admin.controlCenterTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
              Global overview of user registrations, workspaces, projects, task velocity, and platform governance across Chronos OS.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{t('admin.navAnalytics')}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('audit-logs')}
              className="px-4 py-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{t('admin.navAuditLogs')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Registered Users */}
        <div 
          onClick={() => onNavigateTab('users')}
          className="group p-5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-violet-500/40 transition-all cursor-pointer backdrop-blur shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('admin.totalUsers')}</span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{formatNumber(users.total)}</span>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+{users.growthPercentage}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-1 border-t border-neutral-850">
            <span className="text-emerald-400 font-semibold">+{users.newThisMonth} {t('admin.newThisMonth')}</span>
            <span>•</span>
            <span className="text-neutral-500">{users.active} {t('admin.active')}</span>
          </div>
        </div>

        {/* 2. Total Platform Projects */}
        <div 
          onClick={() => onNavigateTab('projects')}
          className="group p-5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-indigo-500/40 transition-all cursor-pointer backdrop-blur shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('admin.totalProjects')}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <FolderGit2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{formatNumber(projects.total)}</span>
            <span className="text-xs text-neutral-400 font-medium">{projects.active} {t('admin.active')}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-1 border-t border-neutral-850">
            <span>{projects.personal} {t('admin.personalProjects')}</span>
            <span>•</span>
            <span className="text-indigo-400 font-semibold">{projects.team} {t('admin.teamProjects')}</span>
          </div>
        </div>

        {/* 3. Team Workspaces */}
        <div 
          onClick={() => onNavigateTab('teams')}
          className="group p-5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-sky-500/40 transition-all cursor-pointer backdrop-blur shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('admin.totalTeams')}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{formatNumber(teams.total)}</span>
            <span className="text-xs text-neutral-400 font-medium">{teams.totalMemberships} memberships</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-1 border-t border-neutral-850">
            <span>{teams.averageMembersPerTeam} {t('admin.avgMembers')}</span>
            <span>•</span>
            <span className="text-sky-400 font-semibold">{teams.activeProjects} active projects</span>
          </div>
        </div>

        {/* 4. Global Tasks & Completion Rate */}
        <div 
          onClick={() => onNavigateTab('tasks')}
          className="group p-5 rounded-2xl bg-neutral-900/70 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 transition-all cursor-pointer backdrop-blur shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t('admin.totalTasks')}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-white">{formatNumber(projects.totalTasks)}</span>
            <span className="text-xs font-bold text-emerald-400">{projects.completionRate}% {t('admin.completionRate')}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-400 pt-1 border-t border-neutral-850">
            <span className="text-emerald-400 font-semibold">{projects.completedTasks} {t('admin.completedTasks')}</span>
            <span>•</span>
            <span className="text-neutral-400">{projects.pendingTasks} {t('admin.pendingTasks')}</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">{t('admin.activeUsers')}</p>
            <p className="text-base font-bold text-neutral-100">{formatNumber(users.active)}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">{t('admin.inactiveUsers')}</p>
            <p className="text-base font-bold text-neutral-100">{formatNumber(users.inactive)}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">{t('admin.suspendedUsers')}</p>
            <p className="text-base font-bold text-neutral-100">{formatNumber(users.suspended)}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-neutral-400">{t('admin.newToday')}</p>
            <p className="text-base font-bold text-neutral-100">+{formatNumber(users.newToday)}</p>
          </div>
        </div>
      </div>

      {/* Two-Column Activity Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <div className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-violet-400" />
              <h3 className="font-bold text-sm text-neutral-100">{t('admin.recentRegistrations')}</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('users')}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
            >
              <span>{t('admin.navUsers')}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {activity.recentRegistrations.map(user => (
              <div 
                key={user.id}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-850 hover:border-neutral-750 transition-all"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-200 truncate">{user.name}</p>
                    <p className="text-[11px] text-neutral-500 font-mono truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    user.status === 'suspended'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {user.status === 'suspended' ? t('admin.suspended') : t('admin.active')}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">{formatDate(user.joinedAt)}</span>
                </div>
              </div>
            ))}

            {activity.recentRegistrations.length === 0 && (
              <p className="text-xs text-neutral-500 py-6 text-center">{t('admin.noRecords')}</p>
            )}
          </div>
        </div>

        {/* Recent Admin Audit Activities */}
        <div className="p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-neutral-100">{t('admin.recentAuditLogs')}</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('audit-logs')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>{t('admin.navAuditLogs')}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {activity.recentAuditLogs.map(log => (
              <div 
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-850 hover:border-neutral-750 transition-all text-xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      {log.action}
                    </span>
                    <span className="text-neutral-400 text-[11px]">{log.adminEmail}</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 truncate max-w-sm">
                    {JSON.stringify(log.details)}
                  </p>
                </div>

                <span className="text-[10px] text-neutral-500 font-mono shrink-0 ms-2">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}

            {activity.recentAuditLogs.length === 0 && (
              <p className="text-xs text-neutral-500 py-6 text-center">{t('admin.noRecords')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
