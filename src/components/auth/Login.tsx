import React, { useState } from 'react';
import { LogIn, Sparkles, AlertCircle, ArrowRight, ArrowLeft, Shield, Users, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { LanguageSwitcher } from '../LanguageSwitcher.tsx';

interface LoginProps {
  onSwitchToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToSignup }) => {
  const { login } = useAuth();
  const { t, direction } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage(direction === 'rtl' ? 'لطفاً ایمیل و رمز عبور را وارد کنید.' : 'Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await login(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || (direction === 'rtl' ? 'خطا در ورود به حساب.' : 'Invalid credentials.'));
    }
  };

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center relative overflow-hidden px-4 py-12 selection:bg-indigo-500/30">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Language Switcher */}
      <div className="absolute top-6 start-6 end-6 flex justify-between items-center max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">Chronos Team</span>
          <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
            v2.0
          </span>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Main Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              {t('auth.loginTitle')}
            </h2>
            <p className="text-sm text-neutral-400">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-sm text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="app-input"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                  {t('auth.password')}
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                className="app-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t('auth.signingIn')}</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{t('auth.signIn')}</span>
                </>
              )}
            </button>
          </form>

          {/* Switch to Signup */}
          <div className="mt-6 pt-5 border-t border-neutral-800/60 text-center">
            <p className="text-xs text-neutral-400">
              {t('auth.dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors ml-1"
              >
                <span>{t('auth.signUp')}</span>
                <ArrowIcon className="w-3.5 h-3.5 inline-block" />
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
