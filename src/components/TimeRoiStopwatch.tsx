import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Sparkles,
  Flame,
  Download,
  Filter,
  CheckSquare
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Project, Task, TimeLog, ProductivityStats } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { useTasks } from '../context/TaskContext.tsx';

interface TimeRoiStopwatchProps {
  projects: Project[];
  tasks: Task[];
  stats: ProductivityStats;
  timeLogs: TimeLog[];
  onRefreshData: () => void;
}

export const TimeRoiStopwatch: React.FC<TimeRoiStopwatchProps> = ({
  projects,
  tasks,
  stats,
  timeLogs,
  onRefreshData
}) => {
  const { t, locale, formatNumber, formatDate } = useI18n();
  const { showToast } = useTasks();
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [hourlyRate, setHourlyRate] = useState<number>(100);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [energyBand, setEnergyBand] = useState<'High Focus' | 'Creative' | 'Low Energy/Admin'>('High Focus');
  const [efficiencyRate, setEfficiencyRate] = useState<number>(92);
  const [sessionNote, setSessionNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Table filter state
  const [tableProjectFilter, setTableProjectFilter] = useState<string>('all');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
      setHourlyRate(projects[0].hourlyValuation || 100);
    }
  }, [projects]);

  const handleProjectChange = (projId: string) => {
    setSelectedProjectId(projId);
    const proj = projects.find(p => p.id === projId);
    if (proj?.hourlyValuation) {
      setHourlyRate(proj.hourlyValuation);
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const toggleTimer = () => {
    setIsRunning(prev => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
  };

  const applySprintPreset = (minutes: number) => {
    setIsRunning(false);
    setElapsedSeconds(minutes * 60);
    showToast(
      locale === 'fa' 
        ? `تایمر روی ${minutes} دقیقه تنظیم شد` 
        : `Sprint preset set to ${minutes}m focus session`, 
      'info'
    );
  };

  const formatClock = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const raw = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    return locale === 'fa' 
      ? raw.replace(/[0-9]/g, w => ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'][+w]) 
      : raw;
  };

  const currentRoi = ((elapsedSeconds / 3600) * hourlyRate * (efficiencyRate / 100)).toFixed(2);

  const handleSaveSession = async () => {
    if (elapsedSeconds < 10) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const selectedProj = projects.find(p => p.id === selectedProjectId);
      const selectedTask = tasks.find(t => t.id === selectedTaskId);

      const roiNumber = parseFloat(currentRoi);
      const calculatedXp = Math.max(20, Math.round((elapsedSeconds / 60) * 1.5));

      const newLog: Partial<TimeLog> = {
        projectId: selectedProjectId || undefined,
        projectName: selectedProj?.name,
        taskId: selectedTaskId || undefined,
        taskTitle: selectedTask?.title,
        durationSeconds: elapsedSeconds,
        hourlyRate,
        calculatedRoi: roiNumber,
        efficiencyRate,
        energyReported: energyBand,
        note: sessionNote || undefined,
        startedAt: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
        endedAt: new Date().toISOString()
      };

      await api.addTimeLog(newLog);

      confetti({
        particleCount: 70,
        spread: 75,
        origin: { y: 0.6 }
      });

      setSaveSuccessMsg(
        locale === 'fa'
          ? `جلسه ثبت شد! ${formatNumber(roiNumber)} دلار ارزش خلق شد و +${formatNumber(calculatedXp)} امتیاز تجربه تعلق گرفت.`
          : `Session logged! Generated $${roiNumber} in value and +${calculatedXp} XP awarded.`
      );
      resetTimer();
      setSessionNote('');
      onRefreshData();

      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to save time log:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCsv = () => {
    if (timeLogs.length === 0) return;
    const headers = ['Date', 'Project', 'Task', 'Duration Minutes', 'Hourly Rate', 'ROI Yield USD', 'Energy', 'Efficiency %', 'Note'];
    const rows = timeLogs.map(l => [
      l.endedAt.split('T')[0],
      `"${(l.projectName || '').replace(/"/g, '""')}"`,
      `"${(l.taskTitle || '').replace(/"/g, '""')}"`,
      Math.round(l.durationSeconds / 60),
      l.hourlyRate,
      l.calculatedRoi.toFixed(2),
      l.energyReported,
      l.efficiencyRate,
      `"${(l.note || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `chronos-roi-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported ROI logs to CSV', 'success');
  };

  const totalLogsHours = timeLogs.reduce((acc, l) => acc + l.durationSeconds / 3600, 0);
  const totalLogsRoi = timeLogs.reduce((acc, l) => acc + l.calculatedRoi, 0);

  const filteredLogs = useMemo(() => {
    if (tableProjectFilter === 'all') return timeLogs;
    return timeLogs.filter(l => l.projectId === tableProjectFilter);
  }, [timeLogs, tableProjectFilter]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {t('stopwatch.title')}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {t('stopwatch.subtitle')}
          </p>
        </div>

        {/* Quick Sprint Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline me-1">Presets:</span>
          {[
            { label: '25m Pomodoro', mins: 25 },
            { label: '50m Deep Work', mins: 50 },
            { label: '90m Ultradian', mins: 90 },
          ].map(p => (
            <button
              key={p.mins}
              type="button"
              onClick={() => applySprintPreset(p.mins)}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-[11px] font-mono transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stopwatch Interface */}
      <div className={`bg-neutral-900 border rounded-2xl p-6 sm:p-8 shadow-xl transition-all duration-300 ${
        isRunning ? 'border-emerald-500/40 shadow-emerald-500/5' : 'border-neutral-800'
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Digital Timer Display & Live Counter */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center text-center space-y-5">
            <div className="relative">
              {/* Pulse glow ring when timer is actively ticking */}
              {isRunning && (
                <div className="absolute inset-0 -m-4 rounded-3xl bg-emerald-500/10 animate-pulse pointer-events-none" />
              )}
              <div className="text-5xl sm:text-7xl font-extrabold font-mono text-white drop-shadow-md tabular-nums tracking-tight" dir="ltr">
                {formatClock(elapsedSeconds)}
              </div>
              <div className="text-xs font-mono text-neutral-400 mt-2 uppercase tracking-widest">
                {locale === 'fa' ? 'زمان سپری‌شده کار عمیق' : 'Elapsed Focus Time'}
              </div>
            </div>

            {/* Live Yield Counter Badge */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>
                {locale === 'fa' ? `بازده دلاری این جلسه: ${currentRoi} دلار` : `Live Session Yield: $${currentRoi}`}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={toggleTimer}
                className={`flex-1 sm:flex-none px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                  isRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>{t('stopwatch.pauseTimer')}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>{elapsedSeconds > 0 ? t('stopwatch.resumeTimer') : t('stopwatch.startTimer')}</span>
                  </>
                )}
              </button>

              <button
                onClick={resetTimer}
                disabled={elapsedSeconds === 0}
                className="px-4 py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition-all border border-neutral-700 disabled:opacity-40"
                title={t('stopwatch.resetTimer')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleSaveSession}
                disabled={elapsedSeconds < 10 || isSaving}
                className="flex-1 sm:flex-none px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isSaving ? t('common.loading') : t('stopwatch.recordSession')}</span>
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
              {locale === 'fa' ? 'پارامترهای تمرکز و نسبت‌دهی' : 'Focus Parameters & Attribution'}
            </h3>

            {/* Project Selection */}
            <div>
              <label className="text-[11px] font-medium text-neutral-300 mb-1.5 block">
                {t('stopwatch.selectProject')}
              </label>
              <select
                value={selectedProjectId}
                onChange={e => handleProjectChange(e.target.value)}
                className="app-select"
              >
                <option value="">{locale === 'fa' ? '-- بدون پروژه (عمومی) --' : '-- No Project (General) --'}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${formatNumber(p.hourlyValuation || 100)}/hr)
                  </option>
                ))}
              </select>
            </div>

            {/* Task Selection */}
            <div>
              <label className="text-[11px] font-medium text-neutral-300 mb-1.5 block">
                {t('stopwatch.selectTask')}
              </label>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="app-select"
              >
                <option value="">{locale === 'fa' ? '-- جلسه آزاد بدون وظیفه خاص --' : '-- Unlinked Sprint --'}</option>
                {tasks
                  .filter(t => t.status !== 'completed')
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.category}] {t.title}
                    </option>
                  ))}
              </select>
            </div>

            {/* Hourly Valuation Rate & Energy Band */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-neutral-300 mb-1.5 block">
                  {t('stopwatch.hourlyRateLabel')}
                </label>
                <div className="relative">
                  <span className="absolute start-3 top-2 text-xs text-neutral-500">$</span>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(Math.max(10, Number(e.target.value)))}
                    className="app-input ps-7 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-300 mb-1.5 block">
                  {locale === 'fa' ? 'ریتم انرژی زیستی' : 'Biological Energy'}
                </label>
                <select
                  value={energyBand}
                  onChange={e => setEnergyBand(e.target.value as any)}
                  className="app-select"
                >
                  <option value="High Focus">{t('energyLevels.highFocus')}</option>
                  <option value="Creative">{t('energyLevels.creative')}</option>
                  <option value="Low Energy/Admin">{t('energyLevels.lowEnergyAdmin')}</option>
                </select>
              </div>
            </div>

            {/* Efficiency Rate Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-neutral-300 mb-1">
                <span>{locale === 'fa' ? 'سنجش راندمان تمرکز' : 'Focus Efficiency Rating'}</span>
                <span className="font-mono text-indigo-400 font-bold">{formatNumber(efficiencyRate)}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={efficiencyRate}
                onChange={e => setEfficiencyRate(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
              />
            </div>

            {/* Session Note */}
            <div>
              <input
                type="text"
                placeholder={locale === 'fa' ? 'در این بازه چه کاری انجام دادید؟ (مثال: پیاده‌سازی اینترسپتور gRPC)' : 'What did you execute in this sprint? (e.g. Implemented gRPC interceptor)'}
                value={sessionNote}
                onChange={e => setSessionNote(e.target.value)}
                className="app-input placeholder:text-neutral-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400 font-medium">
              {locale === 'fa' ? 'کل ساعت کار عمیق' : 'Logged Deep Work'}
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">
              {formatNumber(Number(totalLogsHours.toFixed(1)))} {t('common.hours')}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400 font-medium">
              {locale === 'fa' ? 'کل ارزش دلاری خلق‌شده' : 'Total ROI Valuation'}
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
              ${formatNumber(Math.round(totalLogsRoi))}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-neutral-400 font-medium">
              {t('stats.totalXp')}
            </div>
            <div className="text-xl font-bold font-mono text-purple-400 mt-1 tabular-nums">
              {formatNumber(stats.totalXp)} XP
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Flame className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Recent Focus Logs Table */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              {t('stopwatch.loggedToday')}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by Project */}
            {projects.length > 0 && (
              <select
                value={tableProjectFilter}
                onChange={e => setTableProjectFilter(e.target.value)}
                className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 text-xs focus:outline-none"
              >
                <option value="all">{locale === 'fa' ? 'همه پروژه‌ها' : 'All Projects'}</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}

            {timeLogs.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>CSV</span>
              </button>
            )}

            <span className="text-xs font-mono text-neutral-500 ms-1">
              {formatNumber(filteredLogs.length)} {locale === 'fa' ? 'جلسه' : 'logs'}
            </span>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 text-xs">
            {locale === 'fa' ? 'هیچ جلسه‌ای در این فیلتر ثبت نشده است.' : 'No time logs found matching the filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-neutral-800/80 bg-neutral-950/40 text-[11px] font-mono text-neutral-400 uppercase">
                  <th className="py-3 px-6 text-start">{locale === 'fa' ? 'پروژه / وظیفه' : 'Project / Attribution'}</th>
                  <th className="py-3 px-4 text-start">{locale === 'fa' ? 'مدت' : 'Duration'}</th>
                  <th className="py-3 px-4 text-start">{locale === 'fa' ? 'نرخ' : 'Rate'}</th>
                  <th className="py-3 px-4 text-start">{locale === 'fa' ? 'بازده' : 'ROI Yield'}</th>
                  <th className="py-3 px-4 text-start">{locale === 'fa' ? 'انرژی' : 'Energy'}</th>
                  <th className="py-3 px-4 text-start">{locale === 'fa' ? 'راندمان' : 'Efficiency'}</th>
                  <th className="py-3 px-6 text-end">{locale === 'fa' ? 'تاریخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-xs font-mono tabular-nums">
                {filteredLogs.slice(0, 15).map(log => {
                  const mins = Math.round(log.durationSeconds / 60);
                  return (
                    <tr key={log.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="py-3.5 px-6 font-sans">
                        <div className="font-semibold text-white">
                          {log.projectName || log.taskTitle || (locale === 'fa' ? 'کار عمیق متفرقه' : 'Ad-hoc Deep Work')}
                        </div>
                        {log.note && (
                          <div className="text-[11px] text-neutral-400 font-normal truncate max-w-xs mt-0.5">
                            {log.note}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300">
                        {formatNumber(mins)} {t('common.minutes')}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400">
                        ${formatNumber(log.hourlyRate)}/{t('common.hours')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        +${formatNumber(Number(log.calculatedRoi.toFixed(2)))}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {log.energyReported === 'High Focus' ? t('energyLevels.highFocus') : log.energyReported === 'Creative' ? t('energyLevels.creative') : t('energyLevels.lowEnergyAdmin')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-indigo-400">
                        {formatNumber(log.efficiencyRate)}%
                      </td>
                      <td className="py-3.5 px-6 text-end text-neutral-500 font-sans text-[11px]">
                        {formatDate(log.endedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

