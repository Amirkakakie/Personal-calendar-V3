import React, { useState } from 'react';
import { UserPlus, AlertCircle, ArrowRight, ArrowLeft, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { LanguageSwitcher } from '../LanguageSwitcher.tsx';

interface SignupProps {
  onSwitchToLogin: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSwitchToLogin }) => {
  const { signup } = useAuth();
  const { t, direction } = useI18n();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage(direction === 'rtl' ? 'لطفاً تمامی فیلدهای الزامی را تکمیل کنید.' : 'Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage(direction === 'rtl' ? 'رمز عبور باید حداقل ۶ کاراکتر باشد.' : 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(direction === 'rtl' ? 'رمزهای عبور با یکدیگر مطابقت ندارند.' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await signup(name, email, password, jobTitle);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || (direction === 'rtl' ? 'خطا در ثبت نام.' : 'Failed to create account.'));
    }
  };

  const ArrowIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center relative overflow-hidden px-4 py-12 selection:bg-indigo-500/30">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Language Switcher */}
      <div className="absolute top-6 start-6 end-6 flex justify-between items-center max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">Chronos Team</span>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="max-w-md w-full mx-auto relative z-10">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
              {t('auth.signupTitle')}
            </h2>
            <p className="text-sm text-neutral-400">
              {t('auth.signupSubtitle')}
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
                {t('auth.name')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
                className="w-full px-4 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                {t('auth.email')} *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full px-4 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                {t('auth.jobTitle')}
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder={t('auth.jobTitlePlaceholder')}
                className="w-full px-4 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  {t('auth.password')} *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  {t('auth.confirmPassword')} *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-neutral-950/70 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{t('auth.signingUp')}</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{t('auth.signUp')}</span>
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-neutral-800/60 text-center">
            <p className="text-xs text-neutral-400">
              {t('auth.alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors ml-1"
              >
                <span>{t('auth.signIn')}</span>
                <ArrowIcon className="w-3.5 h-3.5 inline-block" />
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
