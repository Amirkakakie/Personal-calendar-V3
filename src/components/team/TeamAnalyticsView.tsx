import React from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  Target,
  Layers
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const TeamAnalyticsView: React.FC = () => {
  const { currentProject, projectTasks, teamMembers } = useTeam();
  const { t, formatNumber } = useI18n();

  const total = projectTasks.length;
  const completed = projectTasks.filter(t => t.columnId === 'completed').length;
  const inProgress = projectTasks.filter(t => t.columnId === 'in_progress').length;
  const inReview = projectTasks.filter(t => t.columnId === 'in_review').length;
  const todo = projectTasks.filter(t => t.columnId === 'todo').length;
  const backlog = projectTasks.filter(t => t.columnId === 'backlog').length;

  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Total estimated hours
  const totalHours = projectTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);

  // Workload per member
  const memberWorkload = teamMembers.map(m => {
    const tasks = projectTasks.filter(t => t.assigneeId === m.id);
    const hours = tasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const done = tasks.filter(t => t.columnId === 'completed').length;
    return {
      member: m,
      taskCount: tasks.length,
      doneCount: done,
      hours
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('stats.completionRate')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(completionPct)}%
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {formatNumber(completed)} of {formatNumber(total)} tasks completed
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('kanban.inProgress')}</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(inProgress)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Active in current sprint
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">{t('kanban.inReview')}</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(inReview)}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Pending QA & Code Review
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimated Scope</span>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {formatNumber(totalHours)} <span className="text-sm font-normal text-neutral-400">hours</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Across {formatNumber(total)} action items
          </p>
        </div>
      </div>

      {/* Progress Breakdown Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white tracking-tight mb-3">
          Pipeline Distribution
        </h3>
        <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden flex mb-3">
          {total > 0 ? (
            <>
              <div style={{ width: `${(completed / total) * 100}%` }} className="bg-emerald-500" title="Completed" />
              <div style={{ width: `${(inReview / total) * 100}%` }} className="bg-sky-500" title="Under Review" />
              <div style={{ width: `${(inProgress / total) * 100}%` }} className="bg-amber-500" title="In Progress" />
              <div style={{ width: `${(todo / total) * 100}%` }} className="bg-indigo-500" title="To Do" />
              <div style={{ width: `${(backlog / total) * 100}%` }} className="bg-neutral-600" title="Backlog" />
            </>
          ) : (
            <div className="w-full bg-neutral-800" />
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-neutral-400">{t('kanban.completed')}: <b className="text-white">{formatNumber(completed)}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-neutral-400">{t('kanban.inReview')}: <b className="text-white">{formatNumber(inReview)}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-neutral-400">{t('kanban.inProgress')}: <b className="text-white">{formatNumber(inProgress)}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-neutral-400">{t('kanban.todo')}: <b className="text-white">{formatNumber(todo)}</b></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
            <span className="text-neutral-400">{t('kanban.backlog')}: <b className="text-white">{formatNumber(backlog)}</b></span>
          </div>
        </div>
      </div>

      {/* Team Workload Balance */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white tracking-tight mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Team Member Velocity & Assigned Tasks</span>
        </h3>

        <div className="space-y-4">
          {memberWorkload.map(item => {
            const memberPct = item.taskCount > 0 ? Math.round((item.doneCount / item.taskCount) * 100) : 0;
            return (
              <div key={item.member.id} className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${item.member.avatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                      {item.member.initials}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{item.member.name}</p>
                      <p className="text-[10px] text-neutral-400">{item.member.title}</p>
                    </div>
                  </div>
                  <div className="text-end text-xs">
                    <span className="text-neutral-200 font-semibold">{formatNumber(item.taskCount)} tasks</span>
                    <span className="text-neutral-400 text-[11px] block">{formatNumber(item.hours)} estimated hrs</span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${memberPct}%` }}
                    className="h-full bg-indigo-500 rounded-full transition-all"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
