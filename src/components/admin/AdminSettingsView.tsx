import React from 'react';
import { 
  Settings, ShieldCheck, Terminal, Key, Lock, CheckCircle, 
  AlertCircle, Server, FileText, UserCheck 
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { AdminUserDetail } from '../../services/adminApi';

interface AdminSettingsViewProps {
  currentAdmin: AdminUserDetail | null;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ currentAdmin }) => {
  const { t } = useI18n();

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          {t('admin.settingsSecurity')}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('admin.settingsSecuritySubtitle')}
        </p>
      </div>

      {/* Active Super Admin Identity */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
          <UserCheck className="w-4 h-4 text-emerald-400" />
          {t('admin.currentSuperAdminSession')}
        </h3>

        {currentAdmin ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-500 block mb-1">{t('admin.name')}</span>
              <span className="font-semibold text-white">{currentAdmin.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">{t('admin.email')}</span>
              <span className="font-mono text-indigo-400">{currentAdmin.email}</span>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">{t('admin.role')}</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                {currentAdmin.role}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500">{t('admin.loading')}</div>
        )}
      </div>

      {/* Super Admin Bootstrap Instructions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          {t('admin.bootstrapArchitecture')}
        </h3>

        <p className="text-xs text-slate-300 leading-relaxed">
          {t('admin.bootstrapDescription')}
        </p>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('admin.cliCommand')}
          </p>
          <pre className="font-mono text-xs text-emerald-400 overflow-x-auto p-2 bg-slate-900 rounded">
            npm run admin:bootstrap
          </pre>
          <p className="text-[11px] text-slate-500">
            {t('admin.cliCommandHelp')}
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t('admin.envVariables')}
          </p>
          <div className="font-mono text-xs text-indigo-300 space-y-1 p-2 bg-slate-900 rounded">
            <div>CHRONOS_SUPERADMIN_EMAIL=admin@example.com</div>
            <div>CHRONOS_SUPERADMIN_PASSWORD=your-super-strong-password</div>
          </div>
          <p className="text-[11px] text-slate-500">
            {t('admin.envVariablesHelp')}
          </p>
        </div>
      </div>

      {/* Security Policies In Place */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          {t('admin.securityControlsOverview')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>{t('admin.serverSideRoleVerification')}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('admin.serverSideRoleDesc')}
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>{t('admin.immutableAuditLogging')}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('admin.immutableAuditDesc')}
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>{t('admin.suspendedAccountGuard')}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('admin.suspendedAccountDesc')}
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>{t('admin.rateLimitingTitle')}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t('admin.rateLimitingDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
