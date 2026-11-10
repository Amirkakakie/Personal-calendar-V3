import React, { useState } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
  ArrowRight, 
  ArrowLeft, 
  Zap, 
  RotateCcw,
  Loader2,
  CheckCircle2,
  Flame,
  BatteryCharging
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { Task, AIProductivityBrief } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface AICoachSnapshotProps {
  tasks: Task[];
  onOpenFullCoach: () => void;
  onOpenNewTaskWithTime?: (date: string, time: string) => void;
}

export const AICoachSnapshot: React.FC<AICoachSnapshotProps> = ({
  tasks,
  onOpenFullCoach,
  onOpenNewTaskWithTime
}) => {
  const { t, locale, direction } = useI18n();
  const [energyLevel, setEnergyLevel] = useState<'High' | 'Medium' | 'Low'>('High');
  const [isLoading, setIsLoading] = useState(false);
  const [brief, setBrief] = useState<AIProductivityBrief | null>(null);

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const handleQuickBrief = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDailyBrief(energyLevel);
      setBrief(data);
    } catch (err) {
      console.error('Quick brief error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Circadian window hint based on local time
  const currentHour = new Date().getHours();
  const currentEnergyZone = currentHour >= 8 && currentHour < 13
    ? { title: locale === 'fa' ? 'ساعت‌های اوج تمرکز' : 'Peak Focus Window', subtitle: '08:30 - 12:30', color: 'text-indigo-400', badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' }
    : currentHour >= 13 && currentHour < 17
    ? { title: locale === 'fa' ? 'ساعت‌های مناسب کار خلاقانه' : 'Creative Mind Window', subtitle: '13:30 - 16:30', color: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20' }
    : { title: locale === 'fa' ? 'ساعت‌های مناسب کارهای سبک' : 'Recovery & Admin Window', subtitle: '16:30 - 20:00', color: 'text-amber-400', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 sm:p-5 backdrop-blur-md shadow-sm flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20 shrink-0">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight leading-tight">
                {t('dashboard.aiFocusSnapshot')}
              </h3>
              <p className="text-[11px] text-neutral-400 truncate max-w-[190px] sm:max-w-xs">
                {currentEnergyZone.title} ({currentEnergyZone.subtitle})
              </p>
            </div>
          </div>

          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentEnergyZone.badge} shrink-0`}>
            {energyLevel}
          </span>
        </div>

        {/* Dynamic Advice / Brief Content */}
        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 mb-3 text-xs">
          {isLoading ? (
            <div className="flex items-center justify-center py-4 text-neutral-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-[11px]">{locale === 'fa' ? 'در حال بررسی حجم کارها…' : 'Evaluating cognitive queue...'}</span>
            </div>
          ) : brief ? (
            <div className="space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-violet-300">{locale === 'fa' ? 'پیشنهاد امروز' : 'Daily Directive'}</span>
                <span className="text-[10px] text-emerald-400 font-mono font-medium">
                  {brief.burnoutRisk} Risk
                </span>
              </div>
              <p className="text-neutral-300 text-[11px] leading-relaxed line-clamp-3">
                {brief.summary}
              </p>
              {brief.recommendedSchedule && brief.recommendedSchedule[0] && (
                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="font-mono text-indigo-400">{brief.recommendedSchedule[0].timeSlot}</span>
                  <span className="truncate ms-2 text-white font-medium">{brief.recommendedSchedule[0].suggestedTaskTitle}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-neutral-300 text-[11px] leading-relaxed">
                {locale === 'fa'
                  ? 'در برنامه امروزتان کارهای مهم و غیرفوری وجود دارد. بهتر است کارهای نیازمند تمرکز را در ساعت‌های پربازده انجام دهید.'
                  : 'Queue prioritized for Quadrant 2 execution. Align complex problem-solving with your peak cortisol circadian band.'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>
                  {tasks.filter(t => t.status !== 'completed').length} {locale === 'fa' ? 'کار در فهرست انجام' : 'tasks in active pipeline'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Energy selector buttons */}
        <div className="flex items-center justify-between gap-1 mb-3">
          <span className="text-[10px] uppercase font-mono text-neutral-500">
            {locale === 'fa' ? 'سطح انرژی:' : 'Energy:'}
          </span>
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
            {(['High', 'Medium', 'Low'] as const).map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => setEnergyLevel(lvl)}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  energyLevel === lvl
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
        <button
          type="button"
          onClick={handleQuickBrief}
          disabled={isLoading}
          className="flex-1 py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700/80 text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>{locale === 'fa' ? 'پیشنهاد سریع' : 'Quick Brief'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenFullCoach}
          className="flex-1 py-2 px-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold shadow-md shadow-violet-600/20 transition-all flex items-center justify-center gap-1 hover:scale-[1.01]"
        >
          <span>{locale === 'fa' ? 'استودیو کامل' : 'Full Coach'}</span>
          <ArrowIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
