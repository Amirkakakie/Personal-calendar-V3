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
      className={`rounded-2xl border p-4 sm:p-5 transition-all ${
        isCritical
          ? 'bg-gradient-to-r from-rose-950/40 via-neutral-900 to-neutral-900 border-rose-500/30 text-rose-200'
          : isModerate
          ? 'bg-gradient-to-r from-amber-950/30 via-neutral-900 to-neutral-900 border-amber-500/30 text-amber-200'
          : 'bg-gradient-to-r from-emerald-950/20 via-neutral-900 to-neutral-900 border-emerald-500/20 text-emerald-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
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

          <div>
            <div className="flex items-center gap-2">
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

            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
              {locale === 'fa' && isCritical
                ? t('burnout.imminentWarning', { count: data.deadlineAlerts.length, minutes: data.totalImminentMinutes })
                : data.recommendation}
            </p>

            {data.deadlineAlerts.length > 0 && (
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-neutral-400">
                  {locale === 'fa' 
                    ? `${formatNumber(data.deadlineAlerts.length)} وظیفه در ۴۸ ساعت آینده (${formatDuration(data.totalImminentMinutes)} کار تخمینی):`
                    : `${data.deadlineAlerts.length} task(s) due within 48h (${Math.round(data.totalImminentMinutes / 60)}h workload):`}
                </span>
                {data.deadlineAlerts.slice(0, 3).map(alert => (
                  <span
                    key={alert.taskId}
                    className="px-2 py-0.5 rounded bg-neutral-800 text-[11px] font-mono text-neutral-300 border border-neutral-700"
                  >
                    {alert.taskTitle} ({formatNumber(alert.estimatedRemainingMinutes)}m)
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={onNavigateToCalendar}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <span>{t('burnout.resolveNow')}</span>
            {direction === 'rtl' ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-xs text-neutral-500 hover:text-neutral-400 px-2 py-1"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
