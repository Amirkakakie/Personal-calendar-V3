import React from 'react';
import { 
  Sparkles, 
  Plus, 
  User, 
  Users 
} from 'lucide-react';
import type { ProductivityStats } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { UserAccountMenu } from './UserAccountMenu.tsx';

export type WorkspaceMode = 'personal' | 'team';

interface HeaderProps {
  stats: ProductivityStats | null;
  googleUser: any;
  workspaceMode: WorkspaceMode;
  onToggleWorkspaceMode: (mode: WorkspaceMode) => void;
  onOpenNewTask: () => void;
  onOpenAIDecompose: () => void;
  onOpenPomodoro: () => void;
  onOpenGoogleGuide: () => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onExportIcal: () => void;
  onOpenAuthModal?: () => void;
  onDataRestored?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  googleUser,
  workspaceMode,
  onToggleWorkspaceMode,
  onOpenNewTask,
  onOpenAIDecompose,
  onOpenPomodoro,
  onOpenGoogleGuide,
  onGoogleSignIn,
  onGoogleSignOut,
  onExportIcal,
  onOpenAuthModal,
  onDataRestored
}) => {
  const { t } = useI18n();

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Side: Logo & Workspace Mode Segmented Switcher */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t('header.appName')}
                </h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium hidden sm:inline">
                  {workspaceMode === 'team' ? 'Team Collab' : 'Personal OS'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-neutral-800 hidden sm:block" />

          {/* Primary Workspace Switcher (Personal vs Team) */}
          <div className="bg-neutral-950 p-1 border border-neutral-800 rounded-xl flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => onToggleWorkspaceMode('personal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                workspaceMode === 'personal'
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal Space</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleWorkspaceMode('team')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 ${
                workspaceMode === 'team'
                  ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-neutral-700/50'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Team Workspaces</span>
            </button>
          </div>
        </div>

        {/* Right Side: Primary "+ New Task" & Clean User Profile Dropdown */}
        <div className="flex items-center gap-2.5">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('header.newTask')}</span>
          </button>

          {/* Consolidated User Account & Settings Dropdown */}
          <UserAccountMenu
            stats={stats}
            googleUser={googleUser}
            onGoogleSignIn={onGoogleSignIn}
            onGoogleSignOut={onGoogleSignOut}
            onOpenGoogleGuide={onOpenGoogleGuide}
            onOpenPomodoro={onOpenPomodoro}
            onOpenAIDecompose={onOpenAIDecompose}
            onExportIcal={onExportIcal}
            onOpenAuthModal={onOpenAuthModal}
            onDataRestored={onDataRestored}
          />
        </div>
      </div>
    </header>
  );
};
