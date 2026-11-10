import React from 'react';
import { ShieldAlert, ArrowLeft, ArrowRight, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface AdminAccessDeniedProps {
  onReturnToApp: () => void;
  onSwitchAccount: () => void;
}

export const AdminAccessDenied: React.FC<AdminAccessDeniedProps> = ({
  onReturnToApp,
  onSwitchAccount
}) => {
  const { currentUser } = useAuth();
  const { t, direction } = useI18n();

  const ArrowIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 selection:bg-rose-500/30">
      <div className="max-w-md w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block text-[11px] font-mono tracking-wider uppercase px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
            HTTP 403 Forbidden
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-100 tracking-tight">
            {t('admin.accessDeniedTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            {t('admin.accessDeniedSubtitle')}
          </p>
        </div>

        {currentUser && (
          <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-start space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
              <span>{t('admin.currentAccount')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-neutral-200">{currentUser.name}</p>
                <p className="text-xs text-neutral-500 font-mono">{currentUser.email}</p>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                {currentUser.role}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={onReturnToApp}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowIcon className="w-4 h-4" />
            <span>{t('admin.accessDeniedReturn')}</span>
          </button>

          <button
            type="button"
            onClick={onSwitchAccount}
            className="w-full py-2.5 px-4 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white font-semibold text-xs sm:text-sm border border-neutral-700/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('admin.accessDeniedRelogin')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
