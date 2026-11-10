import React, { useState } from 'react';
import { Users, Mail, Shield, CheckCircle2, UserPlus, FolderGit2, UserMinus } from 'lucide-react';
import { useTeam } from '../../context/TeamContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface TeamDirectoryViewProps {
  onOpenInviteModal: () => void;
}

export const TeamDirectoryView: React.FC<TeamDirectoryViewProps> = ({ onOpenInviteModal }) => {
  const { currentProject, teamMembers, projectTasks, updateMemberRole, removeMember } = useTeam();
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { t, formatNumber, direction } = useI18n();

  if (!currentProject) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400">
        <FolderGit2 className="w-10 h-10 mx-auto text-neutral-600 mb-3" />
        <h3 className="text-base font-bold text-white mb-1">
          {direction === 'rtl' ? 'پروژه‌ای انتخاب نشده است' : 'No Active Project'}
        </h3>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
          {direction === 'rtl'
            ? 'لطفاً یک پروژه تیمی ایجاد کرده یا انتخاب کنید تا اعضای همکار نمایش داده شوند.'
            : 'Please select or create a team project to manage collaborating members.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span 
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: currentProject.color }}
            />
            <h2 className="text-xl font-bold text-white tracking-tight">
              {currentProject.name}
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
              {currentProject.key}
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            {direction === 'rtl' ? 'اعضای پروژه:' : 'Project Collaborators:'}{' '}
            <span className="font-semibold text-neutral-200">
              {formatNumber(teamMembers.length)} {direction === 'rtl' ? 'نفر' : 'members'}
            </span>
            {currentProject.description ? ` • ${currentProject.description}` : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenInviteModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>{direction === 'rtl' ? 'دعوت همکار از طریق ایمیل' : 'Invite Teammate via Email'}</span>
        </button>
      </div>

      {actionError && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">{actionError}</p>}

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map(member => {
          const assignedTasks = projectTasks.filter(t => t.assigneeId === member.id);
          const completedTasks = assignedTasks.filter(t => t.columnId === 'completed');
          const isOwner = member.id === currentProject.ownerId;

          return (
            <div
              key={member.id}
              className="min-w-0 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${member.avatarColor} flex items-center justify-center text-white text-base font-bold shadow-md`}>
                        {member.initials}
                      </div>
                      {member.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-neutral-900" title="Active" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-white tracking-tight">
                          {member.name}
                        </h3>
                        {isOwner && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                            {direction === 'rtl' ? 'مالک' : 'Owner'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400">
                        {member.title}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {member.role === 'Owner' ? (direction === 'rtl' ? 'مالک' : 'Owner') : member.role === 'Admin' ? (direction === 'rtl' ? 'مدیر' : 'Admin') : member.role === 'Viewer' ? (direction === 'rtl' ? 'فقط مشاهده' : 'Viewer') : (direction === 'rtl' ? 'عضو' : 'Member')}
                  </span>
                </div>

                <div className="space-y-2 pt-3 border-t border-neutral-800/80 text-xs text-neutral-400">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{member.email}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-neutral-400">
                      {direction === 'rtl' ? 'کارهای این پروژه:' : 'Tasks in Project:'}
                    </span>
                    <span className="font-semibold text-neutral-200">
                      {formatNumber(assignedTasks.length)} ({formatNumber(completedTasks.length)} {direction === 'rtl' ? 'انجام‌شده' : 'done'})
                    </span>
                  </div>
                </div>
              </div>
              {member.id !== currentProject.ownerId && currentProject.ownerId && (
                <div className="mt-4 flex flex-col sm:flex-row gap-2 border-t border-neutral-800 pt-3">
                  <label className="sr-only" htmlFor={`role-${member.id}`}>{direction === 'rtl' ? 'سطح دسترسی' : 'Member role'}</label>
                  <select
                    id={`role-${member.id}`}
                    value={member.role}
                    disabled={busyMemberId === member.id}
                    onChange={async e => {
                      setBusyMemberId(member.id); setActionError(null);
                      try { await updateMemberRole(member.id, e.target.value as any); }
                      catch (error: any) { setActionError(error?.message || (direction === 'rtl' ? 'تغییر دسترسی انجام نشد.' : 'Could not update member role.')); }
                      finally { setBusyMemberId(null); }
                    }}
                    className="app-input min-w-0 flex-1 text-xs"
                  >
                    <option value="Admin">{direction === 'rtl' ? 'مدیر پروژه' : 'Admin'}</option>
                    <option value="Member">{direction === 'rtl' ? 'عضو' : 'Member'}</option>
                    <option value="Viewer">{direction === 'rtl' ? 'فقط مشاهده' : 'Viewer'}</option>
                  </select>
                  <button
                    type="button"
                    disabled={busyMemberId === member.id}
                    onClick={async () => {
                      if (!window.confirm(direction === 'rtl' ? 'دسترسی این عضو به پروژه لغو شود؟' : 'Remove this member from the project?')) return;
                      setBusyMemberId(member.id); setActionError(null);
                      try { await removeMember(member.id); }
                      catch (error: any) { setActionError(error?.message || (direction === 'rtl' ? 'حذف عضو انجام نشد.' : 'Could not remove member.')); }
                      finally { setBusyMemberId(null); }
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    {direction === 'rtl' ? 'لغو دسترسی' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {teamMembers.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-neutral-700 p-8 text-center text-sm text-neutral-400">
            {direction === 'rtl' ? 'هنوز عضوی به این پروژه اضافه نشده است.' : 'No members have joined this project yet.'}
          </div>
        )}
      </div>
    </div>
  );
};
