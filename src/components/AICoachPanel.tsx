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
  MessageSquare,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api.ts';
import type { AIProductivityBrief, Task } from '../types/index.ts';
import { useI18n } from '../i18n/I18nContext.tsx';
import { useTasks } from '../context/TaskContext.tsx';

interface AICoachPanelProps {
  tasks?: Task[];
  onRefreshTasks?: () => void;
  onScheduleSlotSelect?: (title: string, slot: string) => void;
}

export const AICoachPanel: React.FC<AICoachPanelProps> = ({
  onScheduleSlotSelect
}) => {
  const { t, locale } = useI18n();
  const { showToast } = useTasks();
  const [energyLevel, setEnergyLevel] = useState<'High' | 'Medium' | 'Low'>('High');
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [brief, setBrief] = useState<AIProductivityBrief | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
      showToast(locale === 'fa' ? 'گزارش راهبردی روزانه تولید شد' : 'Executive daily brief generated', 'success');
    } catch (err) {
      console.error('Failed to generate daily brief:', err);
      showToast('Failed to connect to AI Coach service', 'error');
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handleSendChat = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const userText = (customText || chatInput).trim();
    if (!userText || isSendingChat) return;

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

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    showToast(locale === 'fa' ? 'پاسخ کپی شد' : 'Advice copied to clipboard', 'info');
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleResetChat = () => {
    setMessages([{ role: 'assistant', text: initialGreeting }]);
    setChatInput('');
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn items-start pb-8">
      {/* Column 1: Daily Executive Briefing Generator & Circadian Directives */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
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
            <span className="text-[11px] text-neutral-500 font-medium hidden sm:inline">
              {t('coach.energyPrompt')}
            </span>
            <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setEnergyLevel('High')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  energyLevel === 'High'
                    ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('coach.highEnergy')}</span>
              </button>

              <button
                type="button"
                onClick={() => setEnergyLevel('Medium')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  energyLevel === 'Medium'
                    ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <BatteryMedium className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('coach.mediumEnergy')}</span>
              </button>

              <button
                type="button"
                onClick={() => setEnergyLevel('Low')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  energyLevel === 'Low'
                    ? 'bg-neutral-800 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <BatteryLow className="w-3.5 h-3.5 text-rose-400" />
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
            <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4">
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
                    <div key={idx} className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs text-neutral-300 leading-relaxed">
                      <div className="flex items-center gap-2 mb-1.5 text-emerald-400 font-semibold">
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
                    <div key={idx} className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-indigo-300 font-semibold text-xs">
                          {item.timeSlot}
                        </span>
                        <div>
                          <span className="font-semibold text-white">{item.suggestedTaskTitle}</span>
                          <span className="text-neutral-400 ms-2 text-[11px]">— {item.reason}</span>
                        </div>
                      </div>
                      {onScheduleSlotSelect && (
                        <button
                          type="button"
                          onClick={() => onScheduleSlotSelect(item.suggestedTaskTitle || '', item.timeSlot)}
                          className="self-end sm:self-auto px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold transition-colors border border-indigo-500/30"
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

      {/* Column 2: Interactive Coaching Chat Studio */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6 flex flex-col h-[600px] xl:sticky xl:top-20 shadow-xl">
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">{t('coach.chatWithCoach')}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-neutral-500 font-mono">Gemini AI</span>
            <button
              type="button"
              onClick={handleResetChat}
              className="p-1 text-neutral-500 hover:text-neutral-300 rounded transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pe-2 custom-scrollbar">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                )}
                <div
                  className={`group relative p-3.5 rounded-2xl max-w-lg ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-neutral-950/80 text-neutral-200 border border-neutral-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopyText(m.text, idx)}
                      className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
                      title="Copy advice"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {isSendingChat && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>{t('coach.thinking')}</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="py-2.5 flex items-center gap-2 overflow-x-auto border-t border-neutral-800 custom-scrollbar touch-pan-x">
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendChat(undefined, p)}
              className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs whitespace-nowrap border border-neutral-800 transition-all shrink-0 min-h-[36px] flex items-center"
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
            className="app-input min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isSendingChat}
            className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-lg shadow-indigo-600/20 shrink-0 flex items-center justify-center"
            title={t('coach.askBtn')}
            aria-label="Send prompt to AI coach"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

