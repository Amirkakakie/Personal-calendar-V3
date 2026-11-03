import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar, 
  Download
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext.tsx';

interface GoogleCloudGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected?: boolean;
  userEmail?: string;
  onToggleConnection?: (connected: boolean) => void;
  onExportIcal?: () => void;
}

export const GoogleCloudGuideModal: React.FC<GoogleCloudGuideModalProps> = ({
  isOpen,
  onClose,
  isConnected = false,
  userEmail,
  onToggleConnection,
  onExportIcal
}) => {
  const { t, formatNumber } = useI18n();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const redirectUri = window.location.origin + '/api/auth/google/callback';
  const calendarScope = 'https://www.googleapis.com/auth/calendar.events';
  const tasksScope = 'https://www.googleapis.com/auth/tasks';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {t('cloudGuide.title')}
            </h2>
            <p className="text-xs text-slate-400">
              {t('cloudGuide.subtitle')}
            </p>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="space-y-4 text-xs text-slate-300">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 font-mono">
                {formatNumber(1)}
              </span>
              <span>{t('cloudGuide.step1Title')}</span>
            </div>
            <p className="text-slate-400 ps-7">
              {t('cloudGuide.step1Desc')}{' '}
              <a 
                href="https://console.cloud.google.com/projectcreate" 
                target="_blank" 
                rel="noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Google Cloud Console <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 font-mono">
                {formatNumber(2)}
              </span>
              <span>{t('cloudGuide.step2Title')}</span>
            </div>
            <p className="text-slate-400 ps-7">
              {t('cloudGuide.step2Desc')}
            </p>
            <ul className="ps-12 list-disc space-y-1 text-slate-300">
              <li><strong className="text-white">Google Calendar API</strong> (calendar.googleapis.com)</li>
              <li><strong className="text-white">Google Tasks API</strong> (tasks.googleapis.com)</li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 font-mono">
                {formatNumber(3)}
              </span>
              <span>{t('cloudGuide.step3Title')}</span>
            </div>
            <p className="text-slate-400 ps-7">
              {t('cloudGuide.step3Desc')}
            </p>
            <div className="ps-7 space-y-2">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80">
                <span className="text-[11px] text-slate-400 block mb-1 font-semibold">{t('cloudGuide.requiredScopes')}</span>
                <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-800 font-mono text-[11px] text-slate-200">
                  <span className="truncate">{calendarScope}</span>
                  <button
                    onClick={() => copyToClipboard(calendarScope, 'scope-cal')}
                    className="p-1 hover:text-white text-slate-400 shrink-0"
                  >
                    {copiedKey === 'scope-cal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-800 font-mono text-[11px] text-slate-200 mt-1">
                  <span className="truncate">{tasksScope}</span>
                  <button
                    onClick={() => copyToClipboard(tasksScope, 'scope-tasks')}
                    className="p-1 hover:text-white text-slate-400 shrink-0"
                  >
                    {copiedKey === 'scope-tasks' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-2">
            <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shrink-0 font-mono">
                {formatNumber(4)}
              </span>
              <span>{t('cloudGuide.step4Title')}</span>
            </div>
            <p className="text-slate-400 ps-7">
              {t('cloudGuide.step4Desc')}
            </p>
            <div className="ps-7 space-y-2">
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">{t('cloudGuide.authOrigins')}</span>
                <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-200">
                  <span className="truncate">{window.location.origin}</span>
                  <button
                    onClick={() => copyToClipboard(window.location.origin, 'origin')}
                    className="p-1 hover:text-white text-slate-400 shrink-0"
                  >
                    {copiedKey === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">{t('cloudGuide.authRedirects')}</span>
                <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-slate-200">
                  <span className="truncate">{redirectUri}</span>
                  <button
                    onClick={() => copyToClipboard(redirectUri, 'redirect')}
                    className="p-1 hover:text-white text-slate-400 shrink-0"
                  >
                    {copiedKey === 'redirect' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Alternative: Instant .ics download */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-indigo-300 block">
                {t('cloudGuide.icsTitle')}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('cloudGuide.icsDesc')}
              </p>
            </div>

            <button
              onClick={onExportIcal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('cloudGuide.downloadIcs')}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {t('cloudGuide.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
