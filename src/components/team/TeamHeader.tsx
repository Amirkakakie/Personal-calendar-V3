import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, 
  ChevronDown, 
  Plus, 
  UserPlus, 
  LogOut, 
  Kanban, 
  BarChart3, 
  Users, 
  Check, 
  FolderPlus 
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { LanguageSwitcher } from '../LanguageSwitcher.tsx';

export type TeamViewTab = 'kanban' | 'analytics' | 'directory';

interface TeamHeaderProps {
  currentTab: TeamViewTab;
  onChangeTab: (tab: TeamViewTab) => void;
  onOpenNewTask: () => void;
  onOpenInviteModal: () => void;
  onOpenProjectModal: () => void;
}

export const TeamHeader: React.FC<TeamHeaderProps> = ({
  currentTab,
  onChangeTab,
  onOpenNewTask,
  onOpenInviteModal,
  onOpenProjectModal
}) => {
  const { projects, currentProject, setCurrentProjectId, teamMembers } = useTeam();
  const { currentUser, logout } = useAuth();
  const { t, direction } = useI18n();

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const projDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projDropdownRef.current && !projDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Side: Brand & Project Selector */}
        <div className="flex items-center gap-3">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-tight">Chronos Team</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  Trello Pro
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 truncate max-w-[140px] sm:max-w-none">
                {currentProject ? currentProject.name : (direction === 'rtl' ? 'پروژه‌های تیمی' : 'Team Projects')}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-neutral-800 mx-1 hidden sm:block" />

          {/* Project Selector Dropdown */}
          <div className="relative" ref={projDropdownRef}>
            {currentProject ? (
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="px-3 py-1.5 bg-neutral-950/70 hover:bg-neutral-800/80 border border-neutral-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-neutral-200 transition-colors"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: currentProject.color }}
                />
                <span className="font-mono text-indigo-400">[{currentProject.key}]</span>
                <span className="truncate max-w-[120px] sm:max-w-[180px]">{currentProject.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenProjectModal}
                className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-xl flex items-center gap-2 text-xs font-semibold text-indigo-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{direction === 'rtl' ? 'ایجاد اولین پروژه' : 'Create First Project'}</span>
              </button>
            )}

            {isProjectDropdownOpen && (
              <div className="absolute start-0 mt-1.5 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  {t('team.projects')}
                </div>

                <div className="max-h-56 overflow-y-auto">
                  {projects.map(proj => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setCurrentProjectId(proj.id);
                        setIsProjectDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-start flex items-center justify-between hover:bg-neutral-800/70 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: proj.color }}
                        />
                        <span className="font-mono text-neutral-400">[{proj.key}]</span>
                        <span className={`truncate ${proj.id === currentProject?.id ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                          {proj.name}
                        </span>
                      </div>
                      {proj.id === currentProject?.id && (
                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-1 pt-1 border-t border-neutral-800 px-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectDropdownOpen(false);
                      onOpenProjectModal();
                    }}
                    className="w-full px-2.5 py-1.5 text-start flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('team.newProject')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Navigation View Tabs */}
        <div className="flex items-center bg-neutral-950/80 p-1 border border-neutral-800 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => onChangeTab('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'kanban'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>{t('team.board')}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'analytics'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{t('team.analytics')}</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              currentTab === 'directory'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('team.members')}</span>
          </button>
        </div>

        {/* Right Side: Members Stack, Invite, New Task, Language, Profile */}
        <div className="flex items-center gap-2.5">
          {/* Team Member Avatars Stack */}
          <div className="flex items-center -space-x-1.5 rtl:space-x-reverse overflow-hidden">
            {teamMembers.slice(0, 4).map(m => (
              <div
                key={m.id}
                title={`${m.name} (${m.role})`}
                className={`w-7 h-7 rounded-full bg-gradient-to-tr ${m.avatarColor} flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-neutral-900 shadow-sm`}
              >
                {m.initials}
              </div>
            ))}
          </div>

          {/* Invite Member Button */}
          <button
            type="button"
            onClick={onOpenInviteModal}
            title={t('team.inviteMember')}
            className="p-1.5 bg-neutral-950/70 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-xl transition-colors"
          >
            <UserPlus className="w-4 h-4" />
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* User Profile / Logout Dropdown */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2 p-1 hover:bg-neutral-800 rounded-xl transition-colors"
            >
              {currentUser ? (
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${currentUser.avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                  {currentUser.initials}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400">
                  <Users className="w-4 h-4" />
                </div>
              )}
            </button>

            {isProfileDropdownOpen && currentUser && (
              <div className="absolute end-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2 border-b border-neutral-800">
                  <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{currentUser.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-indigo-400 border border-neutral-700 font-medium">
                    {currentUser.role} • {currentUser.title}
                  </span>
                </div>

                <div className="pt-1.5 px-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full px-3 py-2 text-start flex items-center gap-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('auth.logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
