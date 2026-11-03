import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Loader2, 
  BatteryCharging, 
  BatteryMedium, 
  BatteryLow, 
  BrainCircuit, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { AIProductivityBrief, Task } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface AICoachPanelProps {
  tasks?: Task[];
  onRefreshTasks?: () => void;
  onScheduleSlotSelect?: (title: string, slot: string) => void;
}

export const AICoachPanel: React.FC<AICoachPanelProps> = ({
  onScheduleSlotSelect
}) => {
  const { t, locale } = useI18n();
  const [energyLevel, setEnergyLevel] = useState<'High' | 'Medium' | 'Low'>('High');
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [brief, setBrief] = useState<AIProductivityBrief | null>(null);

  // Initial greeting based on locale
  const initialGreeting = locale === 'fa'
    ? "درود! من مربی هوشمند بهره‌وری و مدیریت تمرکز کرونوس هستم. می‌توانم برنامه زمانی شما را بهینه‌سازی کنم، به شما در غلبه بر خستگی یا اهمال‌کاری کمک کنم و اهدافتان را ساختار دهم. امروز در چه زمینه‌ای همراهی کنم؟"
    : "Hello! I am your Chronos AI Productivity Coach. I can analyze your schedule, help you overcome study or work resistance, balance your deep work blocks, and structure your goals. How can I assist your focus today?";

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    {
      role: 'assistant',
      text: initialGreeting
    }
  ]);
  const [isSendingChat, setIsSendingChat] = useState(false);

  const handleGenerateBrief = async () => {
    setIsGeneratingBrief(true);
    try {
      const data = await api.getDailyBrief(energyLevel);
      setBrief(data);
    } catch (err) {
      console.error('Failed to generate daily brief:', err);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isSendingChat) return;

    const userText = chatInput.trim();
    setChatInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsSendingChat(true);

    try {
      const advice = await api.askCoach(userText);
      setMessages((prev) => [...prev, { role: 'assistant', text: advice }]);
    } catch (err: any) {
      console.error('Chat coach error:', err);
      setMessages((prev) => [
        ...prev,
        { 
          role: 'assistant', 
          text: locale === 'fa' 
            ? 'خطا در ارتباط با سرویس هوش مصنوعی. لطفاً دوباره تلاش فرمایید.' 
            : 'Apologies, I encountered a connection issue. Please check your network or try again.' 
        }
      ]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const suggestedPrompts = locale === 'fa' ? [
    'چطور روی وظایف سنگین بخش ۲ آیزنهاور تمرکز کنم و اهمال‌کاری را کنار بگذارم؟',
    'آیا حجم کاری فعلی من خطر فرسودگی دارد؟ بررسی و پیشنهاد بده.',
    'یک استراتژی کار عمیق ۳ ساعته برای ساعات اوج انرژی بعدازظهر پیشنهاد کن.',
    'چگونه بین اهداف یادگیری و کارهای روزمره شغلی تعادل برقرار کنم؟'
  ] : [
    'How do I overcome procrastination on high-priority study tasks?',
    'Review my task distribution: Am I spending enough time in Quadrant 2?',
    'Recommend a 3-hour deep work block strategy for this afternoon',
    'Tips to avoid burnout when juggling full-time work and certification prep'
  ];

  return (
    <div className="space-y-6">
      {/* Daily Executive Briefing Generator */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950/40 border border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {t('coach.dailyBriefingTitle')}
              </h2>
              <p className="text-xs text-neutral-400">
                {t('coach.subtitle')}
              </p>
            </div>
          </div>

          {/* Energy Level Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-medium hidden sm:inline">
              {t('coach.energyPrompt')}
            </span>
            <div className="flex bg-neutral-800 p-1 rounded-xl border border-neutral-700">
              <button
                type="button"
                onClick={() => setEnergyLevel('High')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  energyLevel === 'High'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t('coach.highEnergy')}</span>
              </button>

              <button
                type="button"
                onClick={() => setEnergyLevel('Medium')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  energyLevel === 'Medium'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <BatteryMedium className="w-3.5 h-3.5 text-amber-300" />
                <span>{t('coach.mediumEnergy')}</span>
              </button>

              <button
                type="button"
                onClick={() => setEnergyLevel('Low')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  energyLevel === 'Low'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <BatteryLow className="w-3.5 h-3.5 text-rose-300" />
                <span>{t('coach.lowEnergy')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Generate Brief Button */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
            {locale === 'fa'
              ? 'مدل هوش مصنوعی وظایف و اهداف جاری شما را ارزیابی کرده و برنامه بهینه‌ای منطبق با اوج انرژی زیستی شما پیشنهاد می‌دهد.'
              : 'Our executive performance agent assesses your queue, calculates cognitive load, and designs an adaptive plan.'}
          </p>

          <button
            onClick={handleGenerateBrief}
            disabled={isGeneratingBrief}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02]"
          >
            {isGeneratingBrief ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('coach.thinking')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{t('coach.generateBrief')}</span>
              </>
            )}
          </button>
        </div>

        {/* Generated Briefing Results */}
        {brief && (
          <div className="mt-6 pt-5 border-t border-neutral-800 space-y-5 animate-fadeIn">
            {/* Executive Summary & Quote */}
            <div className="bg-neutral-850/80 border border-neutral-750 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">
                  {locale === 'fa' ? 'خلاصه راهبردی روزانه' : 'Executive State Summary'}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  brief.burnoutRisk === 'High' 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                    : brief.burnoutRisk === 'Moderate'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {t('coach.burnoutAssessment', { level: brief.burnoutRisk })}
                </span>
              </div>
              <p className="text-xs text-neutral-200 leading-relaxed">{brief.summary}</p>
              {brief.motivationalQuote && (
                <div className="mt-3 pt-3 border-t border-neutral-800 text-xs italic text-neutral-400">
                  "{brief.motivationalQuote}"
                </div>
              )}
            </div>

            {/* Strategic Advice Directives */}
            {brief.strategicAdvice && brief.strategicAdvice.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  {t('coach.strategicAdvice')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {brief.strategicAdvice.map((advice, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-neutral-800/60 border border-neutral-750 text-xs text-neutral-300 leading-relaxed">
                      <div className="flex items-center gap-2 mb-1 text-emerald-400 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{locale === 'fa' ? `راهبرد ${idx + 1}` : `Directive ${idx + 1}`}</span>
                      </div>
                      {advice}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Circadian Schedule */}
            {brief.recommendedSchedule && brief.recommendedSchedule.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  {t('coach.suggestedSchedule')}
                </h4>
                <div className="space-y-2">
                  {brief.recommendedSchedule.map((item, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-neutral-800/80 border border-neutral-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 font-mono text-indigo-300 font-medium">
                          {item.timeSlot}
                        </span>
                        <div>
                          <span className="font-semibold text-white">{item.suggestedTaskTitle}</span>
                          <span className="text-neutral-400 ms-2 text-[11px]">— {item.reason}</span>
                        </div>
                      </div>
                      {onScheduleSlotSelect && (
                        <button
                          onClick={() => onScheduleSlotSelect(item.suggestedTaskTitle || '', item.timeSlot)}
                          className="self-end sm:self-auto px-2.5 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-medium transition-colors"
                        >
                          {locale === 'fa' ? 'قفل در تقویم' : 'Lock in Calendar'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Coaching Chat */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 sm:p-6 flex flex-col h-[520px]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">{t('coach.chatWithCoach')}</h3>
          </div>
          <span className="text-[10px] text-neutral-400 font-mono">Gemini Flash OS</span>
        </div>

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pe-2">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl max-w-lg ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-neutral-800 text-neutral-200 border border-neutral-700/60 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            );
          })}

          {isSendingChat && (
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>{t('coach.thinking')}</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t border-neutral-800/80">
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setChatInput(p);
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[11px] whitespace-nowrap border border-neutral-700/60 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendChat} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={t('coach.coachPlaceholder')}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isSendingChat}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
            title={t('coach.askBtn')}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
