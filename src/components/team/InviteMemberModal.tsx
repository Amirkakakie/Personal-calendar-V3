import React, { useState } from 'react';
import { X, UserPlus, Mail, Shield, AlertCircle, CheckCircle2, FolderGit2 } from 'lucide-react';
import type { TeamRole } from '../../types/team.ts';
import { useTeam } from '../../context/TeamContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose }) => {
  const { currentProject, sendProjectInvite } = useTeam();
  const { t, direction } = useI18n();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('Member');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) {
      setFeedback({
        type: 'error',
        message: direction === 'rtl' ? 'پروژه‌ای انتخاب نشده است.' : 'No active project selected.'
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setFeedback({
        type: 'error',
        message: direction === 'rtl' ? 'لطفاً ایمیل کاربر را وارد کنید.' : 'Please enter an account email address.'
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await sendProjectInvite(currentProject.id, cleanEmail, role);
    setIsSubmitting(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message
      });
      setEmail('');
    } else {
      setFeedback({
        type: 'error',
        message: res.message
      });
    }
  };

  const handleClose = () => {
    setFeedback(null);
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              {direction === 'rtl' ? 'دعوت به پروژه تیمی' : 'Invite Teammate to Project'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Target Project Pill */}
          {currentProject && (
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{direction === 'rtl' ? 'پروژه مقصد:' : 'Target Project:'}</span>
              </span>
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: currentProject.color }}
                />
                <span>{currentProject.name}</span>
                <span className="font-mono text-[10px] text-neutral-400">({currentProject.key})</span>
              </div>
            </div>
          )}

          <p className="text-xs text-neutral-400 leading-relaxed">
            {direction === 'rtl'
              ? 'برای حفظ حریم خصوصی کامل، دعوت‌نامه‌ها مستقیماً به ایمیل ثبت‌نام‌شده کاربر ارسال می‌شوند و پس از تأیید در صندوق ورودی، دسترسی فعال می‌شود.'
              : 'To guarantee strict data isolation, invites are sent to registered accounts by email. The recipient must accept via their Inbox to join.'}
          </p>

          {/* Feedback Banners */}
          {feedback && (
            <div 
              className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                feedback.type === 'success' 
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <span className="leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              {direction === 'rtl' ? 'آدرس ایمیل کاربر *' : 'Registered User Email *'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute start-3.5 top-3 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="colleague@company.com"
                className="w-full ps-10 pe-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {direction === 'rtl' 
                ? 'کاربر باید پیش از این در سیستم ثبت‌نام کرده باشد.' 
                : 'User must already have an account on Chronos.'}
            </p>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              {direction === 'rtl' ? 'نقش در پروژه' : 'Project Permission Role'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Member', 'Admin', 'Viewer'] as TeamRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                    role === r 
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' 
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {r === 'Admin' ? t('team.roleAdmin') : r === 'Member' ? t('team.roleMember') : t('team.roleViewer')}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{direction === 'rtl' ? 'ارسال دعوت‌نامه' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
