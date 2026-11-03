import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  Clock, 
  CheckCircle, 
  Layers, 
  Zap,
  Flame
} from 'lucide-react';
import type { CalendarEvent, Task } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface EnergyCalendarViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  onRefreshData: () => void;
}

export const EnergyCalendarView: React.FC<EnergyCalendarViewProps> = ({
  events,
  tasks,
  onRefreshData
}) => {
  const { t, locale, formatNumber, formatDate, formatTime } = useI18n();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isAutoScheduling, setIsAutoScheduling] = useState<boolean>(false);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Multi-calendar overlay state
  const [overlayWork, setOverlayWork] = useState<boolean>(true);
  const [overlayStudy, setOverlayStudy] = useState<boolean>(true);
  const [overlayPersonal, setOverlayPersonal] = useState<boolean>(true);

  // Filter events for the selected date
  const dayEvents = events.filter(e => {
    const isSameDate = e.startTime.startsWith(selectedDate);
    if (!isSameDate) return false;

    if (e.category === 'Work/Career' && !overlayWork) return false;
    if (e.category === 'Academic/Study' && !overlayStudy) return false;
    if ((e.category === 'Personal Growth' || e.category === 'Health & Habits') && !overlayPersonal) return false;

    return true;
  });

  // Circadian Auto-Schedule
  const handleAutoSchedule = async () => {
    setIsAutoScheduling(true);
    try {
      const res = await api.autoScheduleCalendar(selectedDate);
      setStatusMessage(res.message || (locale === 'fa' ? 'وظایف با موفقیت در پنجره‌های انرژی زیستی چیده شدند.' : 'Tasks successfully placed into peak biological energy slots.'));
      onRefreshData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Auto-schedule failed:', err);
    } finally {
      setIsAutoScheduling(false);
    }
  };

  // Conflict Resolution
  const handleResolveConflicts = async () => {
    setIsResolving(true);
    try {
      const res = await api.resolveCalendarConflicts();
      setStatusMessage(res.message || (locale === 'fa' ? 'تداخل‌های زمانی حل و فصل شدند.' : 'Temporal overlaps resolved.'));
      onRefreshData();
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error('Resolve conflicts failed:', err);
    } finally {
      setIsResolving(false);
    }
  };

  // Export iCal
  const handleExportIcal = () => {
    window.location.href = '/api/calendar/export/ical';
  };

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-neutral-900/70 border border-neutral-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">{t('calendar.title')}</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {t('calendar.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={handleAutoSchedule}
            disabled={isAutoScheduling}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAutoScheduling ? t('common.loading') : t('calendar.autoSchedule')}</span>
          </button>

          <button
            onClick={handleResolveConflicts}
            disabled={isResolving}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isResolving ? t('common.loading') : t('calendar.resolveConflicts')}</span>
          </button>

          <button
            onClick={handleExportIcal}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-medium transition-all flex items-center gap-1.5"
            title={t('calendar.exportIcal')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{locale === 'fa' ? 'خروجی تقویم' : '.ics Export'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Multi-Calendar Overlay Toggles */}
      <div className="flex items-center gap-3 py-2 border-b border-neutral-800 text-xs flex-wrap">
        <span className="text-neutral-500 font-mono flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" /> {locale === 'fa' ? 'لایه‌های تقویم:' : 'Calendar Overlays:'}
        </span>

        <button
          onClick={() => setOverlayWork(p => !p)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
            overlayWork
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'bg-neutral-900 text-neutral-500 border border-neutral-800 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>{t('calendar.overlayWork')}</span>
        </button>

        <button
          onClick={() => setOverlayStudy(p => !p)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
            overlayStudy
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-neutral-900 text-neutral-500 border border-neutral-800 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{t('calendar.overlayStudy')}</span>
        </button>

        <button
          onClick={() => setOverlayPersonal(p => !p)}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
            overlayPersonal
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'bg-neutral-900 text-neutral-500 border border-neutral-800 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-purple-400" />
          <span>{t('calendar.overlayPersonal')}</span>
        </button>
      </div>

      {/* Circadian Energy Bands Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t('energyLevels.highFocus')} (08:30 - 12:30)</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              {locale === 'fa' ? 'اوج تمرکز' : 'Peak Cortisol'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {locale === 'fa' ? 'اختصاص یافته به معماری سامانه و مطالعه عمیق' : 'Dedicated to architecture design, heavy coding & complex study'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('energyLevels.creative')} (13:30 - 16:30)</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              {locale === 'fa' ? 'تفکر خلاق' : 'Divergent Mind'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {locale === 'fa' ? 'طراحی پروتوتایپ، حل مسئله و بازنگری کد' : 'Ideation, collaborative reviews, RFC drafts, and exploration'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('energyLevels.lowEnergyAdmin')} (16:30 - 18:30)</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              {locale === 'fa' ? 'کارهای سبک' : 'Triage / Recovery'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {locale === 'fa' ? 'پاسخ به ایمیل‌ها، هماهنگی‌ها و فعالیت‌های بدنی' : 'Communication batching, admin tasks, movement & circadian sunset'}
          </p>
        </div>
      </div>

      {/* Hourly Schedule View */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              {locale === 'fa' ? `برنامه زمانی ${formatDate(selectedDate)}` : `Agenda for ${formatDate(selectedDate)}`}
            </h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {formatNumber(dayEvents.length)} {locale === 'fa' ? 'رویداد فعال' : 'active events'}
          </span>
        </div>

        <div className="space-y-3">
          {hours.map(hour => {
            const timeStr = `${String(hour).padStart(2, '0')}:00`;
            const matchingEvents = dayEvents.filter(e => {
              const startHour = parseInt(e.startTime.substring(11, 13), 10);
              return startHour === hour;
            });

            return (
              <div key={hour} className="flex items-start gap-4 py-2 border-b border-neutral-800/40">
                <span className="w-14 text-xs font-mono text-neutral-500 pt-1 shrink-0 text-start">
                  {formatTime(timeStr)}
                </span>

                <div className="flex-1 space-y-2">
                  {matchingEvents.length === 0 ? (
                    <div className="h-6 border border-dashed border-neutral-800/60 rounded-lg flex items-center px-3 text-[11px] text-neutral-600">
                      {locale === 'fa' ? 'بازه زمانی آزاد' : 'Available window'}
                    </div>
                  ) : (
                    matchingEvents.map(evt => (
                      <div
                        key={evt.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          evt.category === 'Work/Career'
                            ? 'bg-blue-950/30 border-blue-500/30 text-blue-200'
                            : evt.category === 'Academic/Study'
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                            : 'bg-purple-950/30 border-purple-500/30 text-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            evt.category === 'Work/Career' ? 'bg-blue-400' : evt.category === 'Academic/Study' ? 'bg-emerald-400' : 'bg-purple-400'
                          }`} />
                          <span className="text-xs font-bold text-white truncate">{evt.title}</span>
                          <span className="text-[11px] text-neutral-400 font-mono shrink-0">
                            ({evt.startTime.substring(11, 16)} - {evt.endTime.substring(11, 16)})
                          </span>
                        </div>

                        {evt.isGoogleEvent && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0 font-medium">
                            {locale === 'fa' ? 'تقویم گوگل' : 'Google Cal'}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
