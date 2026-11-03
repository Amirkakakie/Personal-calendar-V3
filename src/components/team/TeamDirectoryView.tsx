import React from 'react';
import { Users, Mail, Shield, CheckCircle2, UserPlus } from 'lucide-react';
import { useTeam } from '../../context/TeamContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface TeamDirectoryViewProps {
  onOpenInviteModal: () => void;
}

export const TeamDirectoryView: React.FC<TeamDirectoryViewProps> = ({ onOpenInviteModal }) => {
  const { workspace, teamMembers, tasks } = useTeam();
  const { t, formatNumber } = useI18n();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              {workspace.name}
            </h2>
          </div>
          <p className="text-sm text-neutral-400">
            {t('team.members')} ({formatNumber(teamMembers.length)}) • {workspace.description}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenInviteModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t('team.inviteMember')}</span>
        </button>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map(member => {
          const assignedTasks = tasks.filter(t => t.assigneeId === member.id);
          const completedTasks = assignedTasks.filter(t => t.columnId === 'completed');

          return (
            <div
              key={member.id}
              className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${member.avatarColor} flex items-center justify-center text-white text-base font-bold shadow-md`}>
                      {member.initials}
                    </div>
                    {member.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-neutral-900" title={t('team.online')} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {member.name}
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {member.title}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {member.role}
                </span>
              </div>

              <div className="space-y-2 pt-3 border-t border-neutral-800/80 text-xs text-neutral-400">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Mail className="w-3.5 h-3.5 text-neutral-500" />
                  <span className="font-mono text-[11px] truncate">{member.email}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-neutral-400">Active Workload:</span>
                  <span className="font-semibold text-neutral-200">
                    {formatNumber(assignedTasks.length)} tasks ({formatNumber(completedTasks.length)} done)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
