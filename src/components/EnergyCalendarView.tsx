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
  Flame,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import type { CalendarEvent, Task } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface EnergyCalendarViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  onRefreshData: () => void;
  onOpenNewTaskWithTime?: (date: string, time: string) => void;
  onExportIcal?: () => void;
}

export const EnergyCalendarView: React.FC<EnergyCalendarViewProps> = ({
  events,
  tasks,
  onRefreshData,
  onOpenNewTaskWithTime,
  onExportIcal
}) => {
  const { t, locale, formatNumber, formatDate, formatTime, direction } = useI18n();
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

  // Quick Day Nav
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

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
      setStatusMessage(res.message || (locale === 'fa' ? 'زمان انجام کارها با موفقیت بر اساس ساعت‌های پربازده تنظیم شد.' : 'Tasks successfully placed into peak biological energy slots.'));
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

  // Export iCal (Safe Blob Download)
  const handleExportIcal = () => {
    if (onExportIcal) {
      onExportIcal();
      return;
    }
    fetch('/api/calendar/export/ical')
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `chronos-schedule-${selectedDate}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(err => console.error('Export failed:', err));
  };

  const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00

  // Determine biological energy zone for a specific hour
  const getHourEnergyZone = (hour: number) => {
    if (hour >= 8 && hour < 13) {
      return {
        label: t('energyLevels.highFocus'),
        badge: 'High Focus',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/5',
        border: 'border-indigo-500/20'
      };
    }
    if (hour >= 13 && hour < 17) {
      return {
        label: t('energyLevels.creative'),
        badge: 'Creative Mind',
        color: 'text-purple-400',
        bg: 'bg-purple-500/5',
        border: 'border-purple-500/20'
      };
    }
    return {
      label: t('energyLevels.lowEnergyAdmin'),
      badge: 'Recovery / Admin',
      color: 'text-amber-400',
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/20'
    };
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">{t('calendar.title')}</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            {t('calendar.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Day Navigation */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-0.5">
            <button
              onClick={handlePrevDay}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-850 transition-colors"
              title="Previous Day"
            >
              {direction === 'rtl' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <button
              onClick={handleToday}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                isToday ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {locale === 'fa' ? 'امروز' : 'Today'}
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-850 transition-colors"
              title="Next Day"
            >
              {direction === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={handleAutoSchedule}
            disabled={isAutoScheduling}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAutoScheduling ? t('common.loading') : t('calendar.autoSchedule')}</span>
          </button>

          <button
            onClick={handleResolveConflicts}
            disabled={isResolving}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isResolving ? t('common.loading') : t('calendar.resolveConflicts')}</span>
          </button>

          <button
            onClick={handleExportIcal}
            className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-semibold transition-all flex items-center gap-1.5"
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
      <div className="flex items-center gap-2.5 py-2 border-b border-neutral-800 text-xs flex-wrap">
        <span className="text-neutral-500 font-mono flex items-center gap-1 text-[11px]">
          <Layers className="w-3.5 h-3.5" /> {locale === 'fa' ? 'لایه‌های تقویم:' : 'Calendar Overlays:'}
        </span>

        <button
          onClick={() => setOverlayWork(p => !p)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            overlayWork
              ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold'
              : 'bg-neutral-900 text-neutral-500 border border-neutral-800 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>{t('calendar.overlayWork')}</span>
        </button>

        <button
          onClick={() => setOverlayStudy(p => !p)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            overlayStudy
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
              : 'bg-neutral-900 text-neutral-500 border border-neutral-800 opacity-60'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{t('calendar.overlayStudy')}</span>
        </button>

        <button
          onClick={() => setOverlayPersonal(p => !p)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
            overlayPersonal
              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold'
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
              {locale === 'fa' ? 'زمان اوج تمرکز' : 'Peak Cortisol'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {locale === 'fa' ? 'مناسب برای کارهای پیچیده، برنامه‌نویسی و مطالعه عمیق' : 'Dedicated to architecture design, heavy coding & complex study'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{t('energyLevels.creative')} (13:30 - 16:30)</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
              {locale === 'fa' ? 'زمان کار خلاقانه' : 'Divergent Mind'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {locale === 'fa' ? 'مناسب برای ایده‌پردازی، حل مسئله و بازبینی کد' : 'Ideation, collaborative reviews, RFC drafts, and exploration'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('energyLevels.lowEnergyAdmin')} (16:30 - 18:30)</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
              {locale === 'fa' ? 'زمان کارهای سبک' : 'Triage / Recovery'}
            </span>
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">
            {locale === 'fa' ? 'مناسب برای پاسخ به ایمیل‌ها، هماهنگی‌ها و استراحت کوتاه' : 'Communication batching, admin tasks, movement & circadian sunset'}
          </p>
        </div>
      </div>

      {/* Hourly Schedule View */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              {locale === 'fa' ? `برنامه زمانی ${formatDate(selectedDate)}` : `Agenda for ${formatDate(selectedDate)}`}
            </h3>
          </div>
          <span className="text-xs font-mono text-neutral-400">
            {formatNumber(dayEvents.length)} {locale === 'fa' ? 'رویداد' : 'active events'}
          </span>
        </div>

        <div className="space-y-2.5">
          {hours.map(hour => {
            const timeStr = `${String(hour).padStart(2, '0')}:00`;
            const zone = getHourEnergyZone(hour);
            const matchingEvents = dayEvents.filter(e => {
              const startHour = parseInt(e.startTime.substring(11, 13), 10);
              return startHour === hour;
            });

            return (
              <div 
                key={hour} 
                className={`flex items-start gap-4 py-2.5 px-3 rounded-xl border ${zone.border} ${zone.bg} transition-colors group`}
              >
                {/* Time & Zone indicator */}
                <div className="w-20 pt-1 shrink-0">
                  <span className="text-xs font-mono font-semibold text-neutral-300 block">
                    {formatTime(timeStr)}
                  </span>
                  <span className={`text-[10px] font-mono ${zone.color} block`}>
                    {zone.badge}
                  </span>
                </div>

                {/* Slot Content */}
                <div className="flex-1 space-y-2">
                  {matchingEvents.length === 0 ? (
                    <div 
                      onClick={() => onOpenNewTaskWithTime && onOpenNewTaskWithTime(selectedDate, timeStr)}
                      className="min-h-[40px] border border-dashed border-neutral-800 rounded-lg flex items-center justify-between px-3 text-xs text-neutral-500 cursor-pointer hover:border-neutral-700 transition-colors"
                    >
                      <span>{locale === 'fa' ? 'زمان آزاد' : 'Available focus window'}</span>
                      {onOpenNewTaskWithTime && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenNewTaskWithTime(selectedDate, timeStr);
                          }}
                          className="flex sm:opacity-0 sm:group-hover:opacity-100 items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-opacity min-h-[36px] py-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{locale === 'fa' ? 'افزودن کار' : 'Schedule task'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    matchingEvents.map(evt => (
                      <div
                        key={evt.id}
                        className="p-3 rounded-xl border border-neutral-700/80 bg-neutral-950/80 flex items-center justify-between gap-3 transition-all hover:border-neutral-600"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            evt.category === 'Work/Career' ? 'bg-blue-400' : evt.category === 'Academic/Study' ? 'bg-emerald-400' : 'bg-purple-400'
                          }`} />
                          <span className="text-xs font-bold text-white truncate">{evt.title}</span>
                          <span className="text-[11px] text-neutral-400 font-mono shrink-0">
                            ({evt.startTime.substring(11, 16)} - {evt.endTime.substring(11, 16)})
                          </span>
                        </div>

                        {evt.isGoogleEvent && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 shrink-0 font-medium">
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
