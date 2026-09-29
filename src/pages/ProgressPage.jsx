import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  Trophy, 
  Award, 
  Flame, 
  Target, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Zap, 
  PhoneCall, 
  BookOpen, 
  ArrowRight,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProgressPage() {
  const [userProfile, setUserProfile] = useState(null);
  const [stats, setStats] = useState({
    xp: 850,
    level: 2,
    levelTitle: 'Pattern Breaker',
    streakDays: 3,
    callsCompleted: 14,
    winRate: 64,
    avgScore: 78,
    depositsClosed: 6,
    activeGoal: 'Master the 50% Upfront Deposit Close'
  });

  const [badges, setBadges] = useState([
    {
      id: 'pattern-blackbelt',
      name: 'Pattern Interrupt Blackbelt',
      desc: 'Delivered 5 consecutive 20-second hooks without prospect hangup.',
      unlocked: true,
      icon: '⚡',
      color: 'from-amber-500 to-amber-700'
    },
    {
      id: 'deposit-defender',
      name: '50% Deposit Defender',
      desc: 'Closed 3 upfront deposits by utilizing milestone staging protection.',
      unlocked: true,
      icon: '🛡️',
      color: 'from-emerald-500 to-emerald-700'
    },
    {
      id: 'zero-apology',
      name: 'Zero-Apology Discipline',
      desc: 'Completed 3 full calls without saying "Did I catch you at a bad time".',
      unlocked: true,
      icon: '🚫',
      color: 'from-blue-500 to-indigo-700'
    },
    {
      id: 'email-virtuoso',
      name: 'Email Pivot Virtuoso',
      desc: 'Turned 5 "Just send me an email" objections into immediate live conversations.',
      unlocked: false,
      icon: '🎯',
      color: 'from-purple-500 to-purple-700'
    },
    {
      id: 'goldilocks-pro',
      name: 'Goldilocks Field Pro',
      desc: 'Used authentic trade terminology without sounding too technical or dumbed down.',
      unlocked: true,
      icon: '🔨',
      color: 'from-cyan-500 to-cyan-700'
    },
    {
      id: 'apex-closer',
      name: 'Apex Master Closer',
      desc: 'Reach 5,000 XP and maintain an 85%+ win rate across all contractor trades.',
      unlocked: false,
      icon: '👑',
      color: 'from-rose-500 to-rose-700'
    }
  ]);

  useEffect(() => {
    const cachedUser = JSON.parse(localStorage.getItem('scriptmaster_user') || 'null');
    if (cachedUser) setUserProfile(cachedUser);

    const savedStats = JSON.parse(localStorage.getItem('scriptmaster_progress_stats') || 'null');
    if (savedStats) setStats(prev => ({ ...prev, ...savedStats }));

    const goal = localStorage.getItem('scriptmaster_user_goal');
    if (goal) setStats(prev => ({ ...prev, activeGoal: goal }));
  }, []);

  const nextLevelXp = stats.level === 1 ? 500 : stats.level === 2 ? 1500 : stats.level === 3 ? 3000 : 5000;
  const prevLevelXp = stats.level === 1 ? 0 : stats.level === 2 ? 500 : stats.level === 3 ? 1500 : 3000;
  const progressPercent = Math.min(100, Math.round(((stats.xp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100));

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col font-sans select-none antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        
        {/* Top Header & Rank Badge */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Closer Rank Progression
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • {userProfile?.name || 'Sales Closer'}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              Progress & Mastery Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Track your objection handling accuracy, XP levels, daily streaks, and deposit closes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/coach"
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-cyan-200" />
              Practice in Coach Arena
            </Link>
          </div>
        </div>

        {/* Level & XP Overview Card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0e111a] via-[#111422] to-[#0a0c14] border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-indigo-600 flex items-center justify-center text-3xl shadow-lg border border-white/20">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">Level {stats.level}</span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-300 font-bold">{stats.xp} Total XP</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white">{stats.levelTitle}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target Goal: <span className="text-cyan-300 font-semibold">{stats.activeGoal}</span>
                </p>
              </div>
            </div>

            {/* Level XP Bar */}
            <div className="lg:w-80 w-full space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Progress to Level {stats.level + 1}</span>
                <span className="text-amber-400">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-indigo-500 to-cyan-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span>{stats.xp} XP</span>
                <span>{nextLevelXp} XP Needed</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-[#0b0d14]/70 p-3.5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Daily Streak
              </div>
              <div className="text-xl font-black text-white mt-1">{stats.streakDays} Days 🔥</div>
              <span className="text-[10px] text-emerald-400 font-medium">Keep rhythm rolling</span>
            </div>

            <div className="bg-[#0b0d14]/70 p-3.5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <PhoneCall className="w-3.5 h-3.5 text-cyan-400" /> Reps Logged
              </div>
              <div className="text-xl font-black text-white mt-1">{stats.callsCompleted} Calls</div>
              <span className="text-[10px] text-slate-400 font-medium">Trade contractor reps</span>
            </div>

            <div className="bg-[#0b0d14]/70 p-3.5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Target className="w-3.5 h-3.5 text-emerald-400" /> 50% Deposits Locked
              </div>
              <div className="text-xl font-black text-emerald-400 mt-1">{stats.depositsClosed} Closed</div>
              <span className="text-[10px] text-slate-400 font-medium">Milestone escrow protected</span>
            </div>

            <div className="bg-[#0b0d14]/70 p-3.5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Avg Coach Score
              </div>
              <div className="text-xl font-black text-indigo-300 mt-1">{stats.avgScore} / 100</div>
              <span className="text-[10px] text-slate-400 font-medium">Frame & control rating</span>
            </div>
          </div>
        </div>

        {/* Skill Matrix Proficiency */}
        <div className="p-6 rounded-3xl bg-[#0b0d14]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              Core Closer Skill Matrix
            </h3>
            <span className="text-xs text-slate-400">Evaluated on real call performance</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Pattern Interrupt & 20s Permission</span>
                <span className="text-emerald-400 font-bold">88% (Advanced)</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }} />
              </div>
              <p className="text-[10px] text-slate-500">Quickly acknowledges field reality without asking "Did I catch you at a bad time".</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>50% Upfront Deposit Defense</span>
                <span className="text-cyan-400 font-bold">76% (Proficient)</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-cyan-500 rounded-full" style={{ width: '76%' }} />
              </div>
              <p className="text-[10px] text-slate-500">Defends sprint reservation with milestone escrow staging.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Field Vocabulary (Neither Technical nor Dumbed Down)</span>
                <span className="text-indigo-400 font-bold">82% (High Mastery)</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '82%' }} />
              </div>
              <p className="text-[10px] text-slate-500">Speaks authentic trade language that business owners respect.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Countering "Just Send Me An Email"</span>
                <span className="text-amber-400 font-bold">68% (Developing)</span>
              </div>
              <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '68%' }} />
              </div>
              <p className="text-[10px] text-slate-500">Remember to use the 20-Second Permission Pivot instead of agreeing to send a PDF.</p>
            </div>
          </div>
        </div>

        {/* Gamified Mastery Badges Grid */}
        <div className="p-6 rounded-3xl bg-[#0b0d14]/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                Mastery Badges & Milestones
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Unlocked through field-tested calls and coach evaluations</p>
            </div>
            <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/60">
              {badges.filter(b => b.unlocked).length} / {badges.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border transition relative overflow-hidden ${
                  badge.unlocked
                    ? 'bg-[#12141f] border-slate-700/80 shadow-md'
                    : 'bg-slate-900/30 border-slate-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-inner bg-gradient-to-br ${
                    badge.unlocked ? badge.color : 'from-slate-800 to-slate-900 text-slate-600'
                  }`}>
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-white leading-tight">{badge.name}</h4>
                      {badge.unlocked ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">{badge.desc}</p>
                    <span className={`inline-block mt-2 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      badge.unlocked ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {badge.unlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
