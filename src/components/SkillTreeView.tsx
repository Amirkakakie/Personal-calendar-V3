import React, { useState } from 'react';
import { 
  Zap, 
  Award, 
  Lock, 
  Sparkles, 
  Network, 
  Cpu, 
  ShieldCheck, 
  HeartPulse, 
  Compass, 
  Flame, 
  CalendarCheck 
} from 'lucide-react';
import type { SkillNode, RPGAchievementBadge, ProductivityStats } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useI18n } from '../i18n/I18nContext.tsx';

interface SkillTreeViewProps {
  skills: SkillNode[];
  badges: RPGAchievementBadge[];
  stats: ProductivityStats;
  onRefreshData: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Network: <Network className="w-6 h-6 text-indigo-400" />,
  Cpu: <Cpu className="w-6 h-6 text-purple-400" />,
  ShieldCheck: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
  HeartPulse: <HeartPulse className="w-6 h-6 text-rose-400" />,
  Compass: <Compass className="w-6 h-6 text-amber-400" />,
  Flame: <Flame className="w-5 h-5 text-amber-400" />,
  CalendarCheck: <CalendarCheck className="w-5 h-5 text-blue-400" />,
  Award: <Award className="w-5 h-5 text-yellow-400" />,
  Sparkles: <Sparkles className="w-5 h-5 text-violet-400" />
};

export const SkillTreeView: React.FC<SkillTreeViewProps> = ({
  skills,
  badges,
  stats,
  onRefreshData
}) => {
  const { t, locale, formatNumber, formatDate } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [trainingSkillId, setTrainingSkillId] = useState<string | null>(null);
  const [trainingMessage, setTrainingMessage] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(skills.map(s => s.category)))];

  const filteredSkills = selectedCategory === 'All' 
    ? skills 
    : skills.filter(s => s.category === selectedCategory);

  const handleTrainSkill = async (skillId: string) => {
    setTrainingSkillId(skillId);
    try {
      const res = await api.trainSkill(skillId, 75);
      setTrainingMessage(res.message || (locale === 'fa' ? '+۷۵ امتیاز تجربه مهارت افزوده شد!' : 'Earned +75 XP!'));
      onRefreshData();
      setTimeout(() => setTrainingMessage(null), 3000);
    } catch (err) {
      console.error('Training failed:', err);
    } finally {
      setTrainingSkillId(null);
    }
  };

  const unlockedBadgesCount = badges.filter(b => b.unlocked).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* RPG Profile Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-6 backdrop-blur-md">
        <div className="absolute top-0 end-0 -mt-10 -me-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/10 flex items-center justify-center">
                <div className="w-full h-full bg-neutral-950 rounded-[14px] flex flex-col items-center justify-center">
                  <span className="text-[9px] text-neutral-500 font-mono uppercase">{locale === 'fa' ? 'سطح' : 'LVL'}</span>
                  <span className="text-2xl font-bold font-mono text-white leading-none">{formatNumber(stats.userLevel)}</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -end-1 bg-amber-500 text-neutral-950 p-1 rounded-full text-[10px] font-bold">
                <Zap className="w-3 h-3 fill-current" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">{stats.rpgTitle}</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {locale === 'fa' ? 'سطح مهارت' : 'Mastery Tier'}
                </span>
              </div>
              <p className="text-[12px] text-neutral-500 mt-1">
                {locale === 'fa' ? 'مجموع امتیاز تجربه: ' : 'Total XP: '}
                <span className="font-mono text-indigo-300 font-semibold">{formatNumber(stats.totalXp)} XP</span>
                {' • '}
                {locale === 'fa' ? 'نشان‌های دریافت‌شده: ' : 'Unlocked Badges: '}
                <span className="font-mono text-amber-300 font-semibold">{formatNumber(unlockedBadgesCount)} / {formatNumber(badges.length)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 min-w-[130px]">
              <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                {locale === 'fa' ? 'ارزش کار انجام‌شده' : 'Cognitive Value'}
              </div>
              <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                ${formatNumber(stats.totalRoiGenerated)}
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 min-w-[130px]">
              <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                {locale === 'fa' ? 'بازده تمرکز' : 'Focus Efficiency'}
              </div>
              <div className="text-base font-bold font-mono text-indigo-400 mt-0.5">
                {formatNumber(stats.focusScore)} / 100
              </div>
            </div>
          </div>
        </div>

        {trainingMessage && (
          <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[12px] text-indigo-300 flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>{trainingMessage}</span>
          </div>
        )}
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {cat === 'All' ? t('common.all') : cat}
            </button>
          ))}
        </div>
        <div className="text-xs text-neutral-500 font-mono">
          {formatNumber(filteredSkills.length)} {locale === 'fa' ? 'مهارت فعال' : 'active skill nodes'}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSkills.map(skill => {
          const isTraining = trainingSkillId === skill.id;
          return (
            <div
              key={skill.id}
              className="group relative rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all p-5 flex flex-col justify-between hover:bg-white/[0.03]"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                      {ICON_MAP[skill.icon] || <Sparkles className="w-6 h-6 text-indigo-400" />}
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {skill.name}
                      </h3>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        {skill.category}
                      </span>
                    </div>
                  </div>

                  <div className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-mono text-neutral-400 border border-white/5">
                    {t('skills.level', { level: skill.level })}
                  </div>
                </div>

                <p className="text-[12px] text-neutral-500 mt-3 line-clamp-2 leading-relaxed">
                  {skill.description}
                </p>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mb-1.5">
                    <span>{t('skills.mastery')}</span>
                    <span className="text-indigo-400 font-semibold">{formatNumber(skill.masteryPct)}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                      style={{ width: `${Math.min(100, skill.masteryPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => handleTrainSkill(skill.id)}
                  disabled={isTraining}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all hover:border-indigo-500/40"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isTraining ? t('common.loading') : t('skills.trainSkill')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Achievement Badges Section */}
      <div className="mt-8 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-amber-400" />
          <span>{t('skills.badgesTitle')}</span>
          <span className="text-xs font-mono text-neutral-400">
            ({formatNumber(unlockedBadgesCount)}/{formatNumber(badges.length)})
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {badges.map(badge => {
            const isUnlocked = badge.unlocked;
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                  isUnlocked
                    ? 'bg-neutral-800/80 border-amber-500/30 shadow-sm shadow-amber-500/5'
                    : 'bg-neutral-900/40 border-neutral-800/60 opacity-50'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-2.5 ${
                    isUnlocked
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                  }`}
                >
                  {isUnlocked ? ICON_MAP[badge.icon] || <Award className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                </div>

                <h4 className="text-xs font-bold text-white">{badge.name}</h4>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  {badge.description}
                </p>

                <div className="mt-2.5 flex items-center gap-1 text-[10px] font-mono text-amber-400 font-semibold">
                  <span>+{formatNumber(badge.xpBonus)} XP</span>
                </div>

                {isUnlocked && badge.unlockedAt && (
                  <span className="text-[10px] text-neutral-500 mt-1">
                    {t('skills.unlockedAt', { date: formatDate(badge.unlockedAt) })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
