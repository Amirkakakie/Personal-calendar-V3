import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldCheck, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { api } from '../services/api.ts';
import type { DeadlineRiskAlert } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface BurnoutData {
  burnoutIndex: number;
  riskLevel: 'Critical' | 'Moderate' | 'Low';
  imminentTasksCount: number;
  totalImminentMinutes: number;
  highFocusMinutes: number;
  deadlineAlerts: DeadlineRiskAlert[];
  recommendation: string;
}

export const BurnoutAlertBanner: React.FC<{ onNavigateToCalendar: () => void }> = ({
  onNavigateToCalendar
}) => {
  const { t, formatNumber, formatDuration, locale, direction } = useI18n();
  const [data, setData] = useState<BurnoutData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const fetchBurnoutRisk = async () => {
    try {
      setIsLoading(true);
      const res = await api.getBurnoutRisk();
      setData(res);
    } catch (err) {
      console.error('Burnout risk fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBurnoutRisk();
  }, []);

  if (isDismissed || isLoading || !data) return null;

  const isCritical = data.riskLevel === 'Critical';
  const isModerate = data.riskLevel === 'Moderate';

  const riskLabel = isCritical 
    ? t('burnout.critical') 
    : isModerate 
    ? t('burnout.moderate') 
    : t('burnout.low');

  return (
    <div
      role={data.riskLevel === "Critical" ? "alert" : "status"}
      aria-live={data.riskLevel === "Critical" ? "assertive" : "polite"}
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-[0_16px_45px_-34px_rgba(0,0,0,0.9)] transition-all duration-300 sm:p-5 ${
        isCritical
          ? 'bg-gradient-to-r from-rose-950/40 via-neutral-900 to-neutral-900 border-rose-500/30 text-rose-200'
          : isModerate
          ? 'bg-gradient-to-r from-amber-950/30 via-neutral-900 to-neutral-900 border-amber-500/30 text-amber-200'
          : 'bg-gradient-to-r from-emerald-950/20 via-neutral-900 to-neutral-900 border-emerald-500/20 text-emerald-200'
      }`}
    >
      <div aria-hidden="true" className={`pointer-events-none absolute inset-y-0 start-0 w-1 ${isCritical ? "bg-rose-400" : isModerate ? "bg-amber-400" : "bg-emerald-400"}`} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isCritical
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : isModerate
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isCritical ? (
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            ) : isModerate ? (
              <Clock className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                {t('burnout.title')}
              </h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  isCritical
                    ? 'bg-rose-500 text-neutral-950'
                    : isModerate
                    ? 'bg-amber-500 text-neutral-950'
                    : 'bg-emerald-500 text-neutral-950'
                }`}
              >
                {riskLabel} ({formatNumber(data.burnoutIndex)}/۱۰۰)
              </span>
            </div>

            <p className="mt-2 text-sm leading-6 text-neutral-300">
              {locale === 'fa' && isCritical
                ? t('burnout.imminentWarning', { count: data.deadlineAlerts.length, minutes: data.totalImminentMinutes })
                : data.recommendation}
            </p>

            {data.deadlineAlerts.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-xs leading-5 text-neutral-400">
                  {locale === 'fa' 
                    ? `${formatNumber(data.deadlineAlerts.length)} کار در ۴۸ ساعت آینده (${formatDuration(data.totalImminentMinutes)} کار تخمینی):`
                    : `${data.deadlineAlerts.length} task(s) due within 48h (${Math.round(data.totalImminentMinutes / 60)}h workload):`}
                </span>
                {data.deadlineAlerts.slice(0, 3).map(alert => (
                  <span
                    key={alert.taskId}
                    className="rounded-lg border border-white/[0.07] bg-neutral-800/80 px-2.5 py-1 text-[11px] text-neutral-200"
                  >
                    {alert.taskTitle} ({formatNumber(alert.estimatedRemainingMinutes)}m)
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-stretch sm:self-center">
          <button
            type="button"
            onClick={onNavigateToCalendar}
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex-none"
          >
            <span>{t('burnout.resolveNow')}</span>
            {direction === 'rtl' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label={locale === "fa" ? "بستن هشدار" : "Dismiss alert"}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl px-3 py-2 text-xs text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
