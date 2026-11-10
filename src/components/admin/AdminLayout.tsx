import React, { useState } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  FolderGit2, 
  Building2, 
  CheckSquare, 
  History, 
  Activity, 
  Settings, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  Menu, 
  X,
  Server,
  LogOut,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export type AdminTab = 
  | 'overview' 
  | 'analytics' 
  | 'users' 
  | 'projects' 
  | 'teams' 
  | 'tasks' 
  | 'audit-logs' 
  | 'system' 
  | 'settings';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onExitToApp: () => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onTabChange,
  onExitToApp,
  onRefreshData,
  isRefreshing = false,
  children
}) => {
  const { currentUser, logout } = useAuth();
  const { t, locale, setLocale, direction } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ id: AdminTab; labelKey: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', labelKey: 'admin.navOverview', icon: LayoutDashboard },
    { id: 'analytics', labelKey: 'admin.navAnalytics', icon: BarChart3 },
    { id: 'users', labelKey: 'admin.navUsers', icon: Users },
    { id: 'projects', labelKey: 'admin.navProjects', icon: FolderGit2 },
    { id: 'teams', labelKey: 'admin.navTeams', icon: Building2 },
    { id: 'tasks', labelKey: 'admin.navTasks', icon: CheckSquare },
    { id: 'audit-logs', labelKey: 'admin.navAuditLogs', icon: History },
    { id: 'system', labelKey: 'admin.navSystem', icon: Activity },
    { id: 'settings', labelKey: 'admin.navSettings', icon: Settings },
  ];

  const ArrowExitIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-violet-500/30">
      {/* Top Administrative Header */}
      <header className="sticky top-0 z-40 h-16 border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className="lg:hidden p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 ring-1 ring-violet-400/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">Chronos</span>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  {t('admin.badge')}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 hidden sm:block">
                {t('admin.controlCenterSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Persistence Engine Status Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Server className="w-3.5 h-3.5 text-neutral-400" />
            <span className="text-neutral-300 font-mono text-[11px]">System Online</span>
          </div>

          {/* Refresh Data */}
          {onRefreshData && (
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white transition-all disabled:opacity-50"
              title={t('admin.refreshData')}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          )}

          {/* Language Switcher */}
          <div className="flex items-center bg-neutral-900/90 border border-neutral-800 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                locale === 'en' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLocale('fa')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                locale === 'fa' 
                  ? 'bg-violet-600 text-white shadow-sm' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              فا
            </button>
          </div>

          {/* Exit to User Workspace */}
          <button
            type="button"
            onClick={onExitToApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-850 border border-neutral-800 text-xs font-semibold text-neutral-200 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <ArrowExitIcon className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">{t('admin.exitToApp')}</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col border-e border-neutral-800/80 bg-neutral-950/60 p-4 shrink-0 overflow-y-auto custom-scrollbar justify-between">
          <div className="space-y-1.5">
            <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
              Operations
            </div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-neutral-500'}`} />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </div>

          {/* Current Admin User Footnote */}
          {currentUser && (
            <div className="pt-4 border-t border-neutral-850 p-2 rounded-2xl bg-neutral-900/40 border border-neutral-800/60 mt-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${currentUser.avatarColor || 'from-violet-600 to-indigo-600'} flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm`}>
                  {currentUser.initials || 'SA'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-200 truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-violet-400 font-mono truncate">{currentUser.email}</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className={`relative w-4/5 max-w-xs bg-neutral-900 border-e border-neutral-800 p-5 flex flex-col justify-between z-10 animate-in slide-in-from-${direction === 'rtl' ? 'right' : 'left'} duration-200`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-violet-400" />
                    <span className="font-bold text-sm text-white">{t('admin.controlCenterTitle')}</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-neutral-800">
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>

                <div className="space-y-1">
                  {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onTabChange(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{t(item.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={onExitToApp}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 text-neutral-200 hover:text-white text-xs font-bold flex items-center justify-center gap-2 border border-neutral-700 mt-4"
              >
                <ArrowExitIcon className="w-4 h-4 text-violet-400" />
                <span>{t('admin.exitToApp')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
