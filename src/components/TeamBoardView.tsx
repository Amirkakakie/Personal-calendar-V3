import React, { useState } from 'react';
import { 
  Kanban, 
  BarChart3, 
  Users, 
  Plus, 
  UserPlus, 
  FolderPlus, 
  FolderGit2, 
  Calendar, 
  ChevronDown, 
  Check, 
  Sparkles,
  Layers
} from 'lucide-react';
import { useTeam } from '../context/TeamContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { useI18n } from '../i18n/I18nContext.tsx';

// Subcomponents
import { KanbanBoard } from './kanban/KanbanBoard.tsx';
import { TeamAnalyticsView } from './team/TeamAnalyticsView.tsx';
import { TeamDirectoryView } from './team/TeamDirectoryView.tsx';
import { InviteMemberModal } from './team/InviteMemberModal.tsx';
import { ProjectModal } from './team/ProjectModal.tsx';
import { TeamTaskModal } from './kanban/TeamTaskModal.tsx';

export type TeamSubView = 'board' | 'analytics' | 'directory';

interface TeamBoardViewProps {
  onOpenAuthModal?: () => void;
}

export const TeamBoardView: React.FC<TeamBoardViewProps> = ({ onOpenAuthModal }) => {
  const { projects, currentProject, setCurrentProjectId, projectTasks, teamMembers, myPendingInvites } = useTeam();
  const { currentUser, isAuthenticated } = useAuth();
  const { t, formatDate, formatNumber, direction } = useI18n();

  const [activeTab, setActiveTab] = useState<TeamSubView>('board');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Blank slate empty state when newly registered user has no projects
  if (!currentProject) {
    return (
      <div className="space-y-5 min-w-0">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 md:p-12 text-center max-w-xl mx-auto space-y-4 my-8 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20 shadow-lg">
            <FolderGit2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {direction === 'rtl' ? 'هنوز پروژه‌ای برای تیم ندارید' : 'No Team Projects Yet'}
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto mt-2 leading-relaxed">
              {direction === 'rtl'
                ? 'یک پروژه مشترک بسازید یا با دعوت‌نامه‌ای که از همکارانتان دریافت کرده‌اید به پروژه آن‌ها بپیوندید.'
                : 'Create your first collaborative project board with a unique key prefix, or accept an invitation from teammates in your inbox.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(true)}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{direction === 'rtl' ? 'ساخت اولین پروژه' : 'Create First Project'}</span>
            </button>
          </div>
        </div>

        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
        />
      </div>
    );
  }

  const completedCount = projectTasks.filter(t => t.columnId === 'completed').length;
  const totalCount = projectTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Team Project Banner & Sub-Navigation */}
      <div className="chronos-toolbar p-3.5 sm:p-4 md:p-5 backdrop-blur flex flex-col xl:flex-row xl:items-center justify-between gap-4 min-w-0">
        {/* Left: Project Selector & Details */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ backgroundColor: currentProject.color }}
          >
            <FolderGit2 className="w-5 h-5" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-2">
              {/* Project Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="flex items-center gap-2 hover:bg-neutral-800/80 px-2 py-1 -ms-2 rounded-lg transition-colors group"
              >
                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-neutral-800 text-indigo-400 border border-neutral-700 font-bold">
                  {currentProject.key}
                </span>
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                  {currentProject.name}
                </h2>
                <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 truncate max-w-sm md:max-w-lg mt-0.5">
              {currentProject.description}
            </p>

            {/* Dropdown Menu */}
            {isProjectDropdownOpen && (
              <div className="absolute start-0 mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  {t('team.projects')}
                </div>

                <div className="max-h-60 overflow-y-auto">
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
                        <span className={`truncate ${proj.id === currentProject.id ? 'text-white font-semibold' : 'text-neutral-300'}`}>
                          {proj.name}
                        </span>
                      </div>
                      {proj.id === currentProject.id && (
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
                      setIsProjectModalOpen(true);
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

        {/* Center: Sub-view tabs (Board / Analytics / Directory) */}
        <div className="flex items-center bg-neutral-950/80 p-1 border border-neutral-800 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('board')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'board'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>{t('team.board')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'analytics'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{t('team.analytics')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'directory'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('team.members')}</span>
          </button>
        </div>

        {/* Right: Team Actions & Progress */}
        <div className="flex items-center gap-2.5">
          {/* Member Avatars Stack */}
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
            onClick={() => setIsInviteModalOpen(true)}
            title={t('team.inviteMember')}
            className="p-1.5 bg-neutral-950/70 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 rounded-xl transition-colors"
          >
            <UserPlus className="w-4 h-4" />
          </button>

          {/* New Task Button */}
          <button
            type="button"
            onClick={() => setIsTaskModalOpen(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('kanban.addTask')}</span>
          </button>
        </div>
      </div>

      {/* Main View Content */}
      <div className="min-h-[420px] sm:min-h-[520px] min-w-0">
        {activeTab === 'board' && <KanbanBoard />}
        {activeTab === 'analytics' && <TeamAnalyticsView />}
        {activeTab === 'directory' && (
          <TeamDirectoryView onOpenInviteModal={() => setIsInviteModalOpen(true)} />
        )}
      </div>

      {/* Modals */}
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
      />

      <TeamTaskModal
        task={null}
        defaultColumnId="todo"
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />
    </div>
  );
};
