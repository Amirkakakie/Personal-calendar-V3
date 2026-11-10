import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FolderGit2, 
  CheckCircle2, 
  Clock, 
  Building2,
  Calendar,
  Layers,
  PieChart
} from 'lucide-react';
import { adminApi, AdminAnalyticsData } from '../../services/adminApi.ts';
import { useI18n } from '../../i18n/I18nContext.tsx';

export const AdminAnalyticsView: React.FC = () => {
  const { t, formatNumber } = useI18n();
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    adminApi.getAnalytics(timeframe)
      .then(res => {
        if (!cancelled) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load analytics:', err);
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [timeframe]);

  if (isLoading || !data) {
    return (
      <div className="py-24 text-center text-neutral-400">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-medium">{t('common.loading')}</p>
      </div>
    );
  }

  // Calculate scales for Registration Chart
  const maxRegCount = Math.max(1, ...data.registrationTrend.map(d => d.count));
  const maxRegCumulative = Math.max(1, ...data.registrationTrend.map(d => d.cumulative));

  // Calculate scales for Project Chart
  const maxProjectTotal = Math.max(1, ...data.projectCreationTrend.map(d => d.total));

  // Calculate scales for Team Trend
  const maxTeamCount = Math.max(1, ...data.teamTrend.map(d => d.count));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Timeframe Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-violet-400" />
            <span>{t('admin.navAnalytics')}</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time platform metrics aggregated directly from database records.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-800 shrink-0">
          {(['7d', '30d', '90d', '1y'] as const).map(tf => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tf === '7d' && t('admin.timeframe7d')}
              {tf === '30d' && t('admin.timeframe30d')}
              {tf === '90d' && t('admin.timeframe90d')}
              {tf === '1y' && t('admin.timeframe1y')}
            </button>
          ))}
        </div>
      </div>

      {/* Chart 1: User Registrations & Cumulative Growth */}
      <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">{t('admin.userGrowthTrend')}</h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-violet-400">
              <span className="w-2.5 h-2.5 rounded-sm bg-violet-500" />
              <span>New Users</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Cumulative Growth</span>
            </div>
          </div>
        </div>

        {/* Responsive SVG Chart */}
        <div className="h-64 w-full relative pt-4">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="40" x2="1000" y2="40" stroke="#27272a" strokeDasharray="4 4" />
            <line x1="0" y1="100" x2="1000" y2="100" stroke="#27272a" strokeDasharray="4 4" />
            <line x1="0" y1="160" x2="1000" y2="160" stroke="#27272a" strokeDasharray="4 4" />
            <line x1="0" y1="220" x2="1000" y2="220" stroke="#3f3f46" />

            {/* Area & Bar Chart */}
            {data.registrationTrend.map((point, idx) => {
              const x = (idx / (data.registrationTrend.length - 1 || 1)) * 960 + 20;
              const barHeight = (point.count / maxRegCount) * 160;
              const y = 220 - barHeight;
              const cumY = 220 - (point.cumulative / maxRegCumulative) * 180;

              return (
                <g key={point.date} className="cursor-pointer group">
                  {/* Bar for Daily */}
                  <rect
                    x={x - 4}
                    y={y}
                    width={8}
                    height={Math.max(barHeight, 2)}
                    rx={3}
                    className="fill-violet-500 hover:fill-violet-400 transition-colors"
                  />
                  {/* Point for Cumulative */}
                  <circle
                    cx={x}
                    cy={cumY}
                    r={3.5}
                    className="fill-emerald-400 group-hover:r-5 transition-all shadow"
                  />
                </g>
              );
            })}

            {/* Polyline connecting cumulative growth */}
            <polyline
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              points={data.registrationTrend.map((point, idx) => {
                const x = (idx / (data.registrationTrend.length - 1 || 1)) * 960 + 20;
                const cumY = 220 - (point.cumulative / maxRegCumulative) * 180;
                return `${x},${cumY}`;
              }).join(' ')}
            />
          </svg>

          {/* Timeline Date Labels */}
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono pt-2">
            <span>{data.registrationTrend[0]?.date}</span>
            <span>{data.registrationTrend[Math.floor(data.registrationTrend.length / 2)]?.date}</span>
            <span>{data.registrationTrend[data.registrationTrend.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Project Comparison & Task Completion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Creation Trend (Personal vs Team) */}
        <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">{t('admin.projectCreationTrend')}</h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-2 h-2 rounded bg-sky-400" />
                Personal
              </span>
              <span className="flex items-center gap-1 text-violet-400">
                <span className="w-2 h-2 rounded bg-violet-400" />
                Team
              </span>
            </div>
          </div>

          <div className="h-56 w-full relative pt-2">
            <svg className="w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
              <line x1="0" y1="180" x2="1000" y2="180" stroke="#3f3f46" />
              {data.projectCreationTrend.map((p, idx) => {
                const x = (idx / (data.projectCreationTrend.length - 1 || 1)) * 940 + 30;
                const pHeight = (p.personal / maxProjectTotal) * 140;
                const tHeight = (p.team / maxProjectTotal) * 140;

                return (
                  <g key={p.date} className="group">
                    <rect
                      x={x - 6}
                      y={180 - pHeight}
                      width={5}
                      height={Math.max(pHeight, 2)}
                      rx={2}
                      className="fill-sky-400 group-hover:fill-sky-300"
                    />
                    <rect
                      x={x + 1}
                      y={180 - tHeight}
                      width={5}
                      height={Math.max(tHeight, 2)}
                      rx={2}
                      className="fill-violet-500 group-hover:fill-violet-400"
                    />
                  </g>
                );
              })}
            </svg>
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono pt-2">
              <span>{data.projectCreationTrend[0]?.date}</span>
              <span>{data.projectCreationTrend[data.projectCreationTrend.length - 1]?.date}</span>
            </div>
          </div>
        </div>

        {/* Task Completion Status Distribution */}
        <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">{t('admin.taskStatusDistribution')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-1">
              <p className="text-xs font-bold text-emerald-400 uppercase">{t('admin.completedTasks')}</p>
              <p className="text-2xl font-black text-emerald-200">{formatNumber(data.taskStatusBreakdown.completed)}</p>
              <p className="text-[11px] text-emerald-400/80 font-semibold">{data.taskStatusBreakdown.completionRate}% of total</p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-center space-y-1">
              <p className="text-xs font-bold text-indigo-400 uppercase">In Progress</p>
              <p className="text-2xl font-black text-indigo-200">{formatNumber(data.taskStatusBreakdown.inProgress)}</p>
              <p className="text-[11px] text-indigo-400/80 font-semibold">Active execution</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-center space-y-1">
              <p className="text-xs font-bold text-amber-400 uppercase">{t('admin.pendingTasks')}</p>
              <p className="text-2xl font-black text-amber-200">{formatNumber(data.taskStatusBreakdown.todo)}</p>
              <p className="text-[11px] text-amber-400/80 font-semibold">Backlog queue</p>
            </div>
          </div>

          {/* Progress Bar Visualization */}
          <div className="space-y-1.5 pt-2">
            <div className="h-3 w-full bg-neutral-950 rounded-full overflow-hidden flex border border-neutral-800">
              <div 
                style={{ width: `${data.taskStatusBreakdown.total > 0 ? (data.taskStatusBreakdown.completed / data.taskStatusBreakdown.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full"
                title="Completed"
              />
              <div 
                style={{ width: `${data.taskStatusBreakdown.total > 0 ? (data.taskStatusBreakdown.inProgress / data.taskStatusBreakdown.total) * 100 : 0}%` }}
                className="bg-indigo-500 h-full"
                title="In Progress"
              />
              <div 
                style={{ width: `${data.taskStatusBreakdown.total > 0 ? (data.taskStatusBreakdown.todo / data.taskStatusBreakdown.total) * 100 : 0}%` }}
                className="bg-amber-500 h-full"
                title="To Do"
              />
            </div>
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
              <span>Total platform tasks: {formatNumber(data.taskStatusBreakdown.total)}</span>
              <span>Rate: {data.taskStatusBreakdown.completionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Active vs Inactive Ratio & Team Creation Velocity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active vs Inactive Users */}
        <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">{t('admin.activeInactiveRatio')}</h3>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-400">{t('admin.activeUsers')}: {data.userDistribution.active}</span>
              <span className="text-amber-400">{t('admin.inactiveUsers')}: {data.userDistribution.inactive}</span>
              <span className="text-rose-400">{t('admin.suspendedUsers')}: {data.userDistribution.suspended}</span>
            </div>

            <div className="h-3 w-full bg-neutral-950 rounded-full overflow-hidden flex border border-neutral-800">
              <div 
                style={{ width: `${data.userDistribution.total > 0 ? (data.userDistribution.active / data.userDistribution.total) * 100 : 0}%` }}
                className="bg-emerald-500 h-full"
              />
              <div 
                style={{ width: `${data.userDistribution.total > 0 ? (data.userDistribution.inactive / data.userDistribution.total) * 100 : 0}%` }}
                className="bg-amber-500 h-full"
              />
              <div 
                style={{ width: `${data.userDistribution.total > 0 ? (data.userDistribution.suspended / data.userDistribution.total) * 100 : 0}%` }}
                className="bg-rose-500 h-full"
              />
            </div>
          </div>
        </div>

        {/* Team Creation Growth Velocity */}
        <div className="p-6 rounded-2xl bg-neutral-900/70 border border-neutral-800 backdrop-blur space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">{t('admin.teamGrowthTrend')}</h3>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Total Teams: {formatNumber(data.teamTrend.reduce((a, b) => a + b.count, 0))}</span>
          </div>

          <div className="h-44 w-full relative pt-2">
            <svg className="w-full h-full" viewBox="0 0 1000 160" preserveAspectRatio="none">
              <line x1="0" y1="140" x2="1000" y2="140" stroke="#3f3f46" />
              {data.teamTrend.map((tPoint, idx) => {
                const x = (idx / (data.teamTrend.length - 1 || 1)) * 960 + 20;
                const h = (tPoint.count / maxTeamCount) * 110;
                return (
                  <circle
                    key={tPoint.date}
                    cx={x}
                    cy={140 - h}
                    r={3}
                    className="fill-purple-400 hover:r-4 transition-all"
                  />
                );
              })}
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
                points={data.teamTrend.map((tPoint, idx) => {
                  const x = (idx / (data.teamTrend.length - 1 || 1)) * 960 + 20;
                  const h = (tPoint.count / maxTeamCount) * 110;
                  return `${x},${140 - h}`;
                }).join(' ')}
              />
            </svg>
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono pt-2">
              <span>{data.teamTrend[0]?.date}</span>
              <span>{data.teamTrend[data.teamTrend.length - 1]?.date}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
