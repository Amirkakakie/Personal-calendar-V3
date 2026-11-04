import React from 'react';
import { 
  X, 
  Inbox, 
  Check, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  User, 
  Calendar, 
  Mail, 
  ExternalLink,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext.tsx';
import { useI18n } from '../../i18n/I18nContext.tsx';

interface InvitationsInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvitationsInboxModal: React.FC<InvitationsInboxModalProps> = ({
  isOpen,
  onClose
}) => {
  const { myPendingInvites, acceptInvite, declineInvite } = useTeam();
  const { t, direction, formatNumber } = useI18n();

  if (!isOpen) return null;

  const handleAccept = (inviteId: string) => {
    acceptInvite(inviteId);
  };

  const handleDecline = (inviteId: string) => {
    declineInvite(inviteId);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {direction === 'rtl' ? 'دعوت‌نامه‌های پروژه' : 'Project Invitations'}
                </h3>
                {myPendingInvites.length > 0 && (
                  <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                    {formatNumber(myPendingInvites.length)} {direction === 'rtl' ? 'جدید' : 'pending'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {direction === 'rtl' 
                  ? 'پروژه‌های تیمی که با ایمیل شما به اشتراک گذاشته شده‌اند' 
                  : 'Collaborative projects shared with your email account'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3.5">
          {myPendingInvites.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-800/60 border border-neutral-700/60 flex items-center justify-center text-neutral-500">
                <Inbox className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-neutral-200">
                  {direction === 'rtl' ? 'هیچ دعوت‌نامه‌ای وجود ندارد' : 'No Pending Invitations'}
                </h4>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  {direction === 'rtl'
                    ? 'هنگامی که همکاران یا مالکان پروژه‌ها ایمیل شما را برای همکاری اضافه کنند، درخواست‌ها در این صندوق ظاهر می‌شوند.'
                    : 'When teammates or project owners invite your email address to collaborate on shared boards, requests will appear here.'}
                </p>
              </div>
            </div>
          ) : (
            myPendingInvites.map(invite => (
              <div 
                key={invite.id}
                className="bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700/80 rounded-2xl p-4 transition-all shadow-sm space-y-3"
              >
                {/* Project Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0 border border-white/10"
                      style={{ backgroundColor: invite.projectColor || '#6366f1' }}
                    >
                      {invite.projectKey}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white tracking-tight">
                          {invite.projectName}
                        </h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {invite.projectKey}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                        <span>
                          {direction === 'rtl' ? 'دعوت شده توسط:' : 'Invited by:'}{' '}
                          <span className="text-neutral-200 font-medium">{invite.invitedByName}</span>
                          <span className="text-neutral-500 ms-1 font-mono text-[11px]">({invite.invitedByEmail})</span>
                        </span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-neutral-800 text-indigo-300 border border-indigo-500/20 shrink-0">
                    {invite.role}
                  </span>
                </div>

                {/* Details Bar & Action Buttons */}
                <div className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-neutral-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{invite.createdAt}</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecline(invite.id)}
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-neutral-800 hover:bg-rose-950/40 hover:text-rose-300 hover:border-rose-700/50 text-neutral-400 border border-neutral-700/80 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{direction === 'rtl' ? 'رد دعوت' : 'Decline'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAccept(invite.id)}
                      className="flex-1 sm:flex-none px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{direction === 'rtl' ? 'پذیرش و پیوستن' : 'Accept & Join'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {direction === 'rtl' ? 'حفظ حریم خصوصی و ایزولاسیون کامل داده‌ها' : 'Strict User Isolation Active'}
            </span>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};
