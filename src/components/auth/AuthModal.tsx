import React, { useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login'
}) => {
  const { login, signup, currentUser, logout } = useAuth();
  const { t, direction } = useI18n();

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage(direction === 'rtl' ? 'لطفاً ایمیل و رمز عبور را وارد کنید.' : 'Please enter email and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Login failed.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage(direction === 'rtl' ? 'لطفاً ایمیل و رمز عبور را وارد کنید.' : 'Please enter email and password.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage(direction === 'rtl' ? 'رمز عبور باید حداقل ۶ کاراکتر باشد.' : 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(direction === 'rtl' ? 'رمزهای عبور با هم مطابقت ندارند.' : 'Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    const displayName = name.trim() || email.trim().split('@')[0];
    const res = await signup(displayName, email.trim(), password, jobTitle);
    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setErrorMessage(res.error || 'Signup failed.');
    }
  };

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {mode === 'login' ? t('auth.loginTitle') : t('auth.signupTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Sign-In */}
          <div className="mb-4">
            <GoogleSignInButton 
              onSuccess={onClose} 
              onError={(err) => setErrorMessage(err)} 
            />
          </div>

          <div className="relative flex py-1 items-center mb-4">
            <div className="flex-grow border-t border-neutral-800" />
            <span className="flex-shrink mx-2.5 text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
              {direction === 'rtl' ? 'یا ورود با ایمیل' : 'or continue with email'}
            </span>
            <div className="flex-grow border-t border-neutral-800" />
          </div>

          {/* Form */}
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  {t('auth.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  {t('auth.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  {t('auth.name')} <span className="text-neutral-500 font-normal lowercase">({direction === 'rtl' ? 'اختیاری' : 'optional'})</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  {t('auth.email')} *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                  {t('auth.jobTitle')}
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                  placeholder={t('auth.jobTitlePlaceholder')}
                  className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    {t('auth.password')} *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
                    {t('auth.confirmPassword')} *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 text-xs focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitting ? t('auth.signingUp') : t('auth.signUp')}
              </button>
            </form>
          )}

          {/* Toggle between Login and Signup */}
          <div className="mt-4 pt-3 border-t border-neutral-800/60 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-neutral-400">
                {t('auth.dontHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <span>{t('auth.signUp')}</span>
                  <ArrowIcon className="w-3 h-3" />
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-400">
                {t('auth.alreadyHaveAccount')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
                >
                  <span>{t('auth.signIn')}</span>
                  <ArrowIcon className="w-3 h-3" />
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
