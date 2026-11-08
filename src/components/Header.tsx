import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  User, 
  Users,
  Bell,
  Search,
  Command
} from 'lucide-react';
import type { ProductivityStats } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { useTeam } from '../context/TeamContext.tsx';
import { UserAccountMenu } from './UserAccountMenu.tsx';
import { InvitationsInboxModal } from './notifications/InvitationsInboxModal.tsx';

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
  onOpenCommandPalette?: () => void;
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
  onDataRestored,
  onOpenCommandPalette
}) => {
  const { t, formatNumber, direction, locale } = useI18n();
  const { myPendingInvites } = useTeam();
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  return (
    <header className="h-14 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50 px-3 sm:px-4">
      <div className="h-full max-w-[1600px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: Brand & Workspace Switcher */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 min-w-0">
          <div className="flex items-center gap-2 group cursor-pointer shrink-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all group-hover:scale-105">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white tracking-tight hidden sm:block">
              Chronos
            </h1>
          </div>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Premium Switcher */}
          <div className="flex items-center bg-white/[0.03] p-0.5 rounded-lg border border-white/5 shrink-0">
            <button
              onClick={() => onToggleWorkspaceMode('personal')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all min-h-[32px] ${
                workspaceMode === 'personal'
                  ? 'bg-neutral-800 text-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] ring-1 ring-white/10'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              aria-label="Personal Workspace"
            >
              <User className={`w-3 h-3 ${workspaceMode === 'personal' ? 'text-indigo-400' : ''}`} />
              <span>Personal</span>
            </button>
            <button
              onClick={() => onToggleWorkspaceMode('team')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all min-h-[32px] ${
                workspaceMode === 'team'
                  ? 'bg-neutral-800 text-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] ring-1 ring-white/10'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
              aria-label="Team Workspace"
            >
              <Users className={`w-3 h-3 ${workspaceMode === 'team' ? 'text-emerald-400' : ''}`} />
              <span>Team</span>
            </button>
          </div>
        </div>

        {/* Center: Command Search Button */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden lg:flex flex-1 max-w-md relative group items-center text-start"
          aria-label="Search or jump to command"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-400 transition-colors pointer-events-none" />
          <div className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-neutral-700 rounded-lg py-1.5 pl-9 pr-12 text-[11px] text-neutral-400 transition-all cursor-pointer">
            {locale === 'fa' ? 'جستجو یا پرش سریع...' : 'Search or jump to...'}
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-white/10 bg-neutral-900 text-[9px] text-neutral-500 font-mono select-none">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </button>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-600/20 min-h-[36px]"
            aria-label="New Task"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span className="hidden sm:inline">New Task</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsInboxOpen(true)}
              className="relative p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.05] transition-all min-h-[38px] min-w-[38px] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {myPendingInvites.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-neutral-950" />
              )}
            </button>

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
      </div>

      <InvitationsInboxModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
      />
    </header>
  );
};
