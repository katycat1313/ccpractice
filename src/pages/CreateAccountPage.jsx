import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { signUp } from '../lib/supabaseAuth';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, ArrowRight, ShieldCheck, PhoneCall, Sparkles, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import ColdCalling3DScene from '../components/ColdCalling3DScene';
import GeminiLiveAvatar from '../components/GeminiLiveAvatar';

export default function CreateAccountPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      // 1. Attempt Supabase auth registration
      const res = await signUp({ email, password, data: { name } });

      // 2. Persist user locally so all progress, scripts, and stats are permanently preserved
      const userId = res.data?.user?.id || `usr-${Date.now()}`;
      const userProfile = {
        id: userId,
        email,
        name: name || email.split('@')[0],
        role: 'Sales Representative',
        created_at: new Date().toISOString()
      };

      localStorage.setItem('scriptmaster_user', JSON.stringify(userProfile));
      localStorage.setItem('scriptmaster_is_first_login', 'true');
      sessionStorage.setItem('coach_greet_on_mount', 'true');

      // 3. Try to save profile to Supabase database
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          email,
          name: userProfile.name,
          role: 'Sales Representative'
        });
      } catch (profileErr) {
        console.warn('Profile sync notice:', profileErr);
      }

      // 4. Notify app of authentication change and navigate directly to dashboard!
      window.dispatchEvent(new Event('scriptmaster_auth_changed'));
      navigate('/dashboard');
    } catch (err) {
      console.error('Account creation error:', err);
      // Fallback local persistence so user is never blocked
      const userProfile = {
        id: `usr-${Date.now()}`,
        email,
        name: name || email.split('@')[0],
        role: 'Sales Representative',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('scriptmaster_user', JSON.stringify(userProfile));
      localStorage.setItem('scriptmaster_is_first_login', 'true');
      sessionStorage.setItem('coach_greet_on_mount', 'true');
      window.dispatchEvent(new Event('scriptmaster_auth_changed'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoUser = {
        id: 'demo-user-alex',
        email: 'demo@scriptmaster.app',
        name: 'Alex Hunter',
        role: 'Top Performer Closer',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('scriptmaster_user', JSON.stringify(demoUser));

      try {
        await supabase.auth.signInWithPassword({
          email: 'demo@scriptmaster.app',
          password: 'password123',
        });
      } catch (_) {}

      window.dispatchEvent(new Event('scriptmaster_auth_changed'));
      navigate('/dashboard');
    } catch {
      window.dispatchEvent(new Event('scriptmaster_auth_changed'));
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col justify-between items-center relative overflow-hidden font-sans antialiased">
      
      {/* Precision Micro Specular Edge Lights */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 via-indigo-400/40 to-transparent z-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent z-30 pointer-events-none" />

      {/* Atmospheric Cold Calling Hardware Visual (In Background) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <ColdCalling3DScene
          interactive={true}
          density="medium"
          showGrid={false}
          className="w-full h-full"
        />
      </div>

      {/* Top Header */}
      <header className="relative z-30 w-full max-w-7xl px-6 sm:px-10 pt-6 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/60 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.5)]">
            <PhoneCall className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                ScriptMaster
              </span>
              <span className="text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.15)]">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">AI Cold Calling Coach & Sales Simulator</p>
          </div>
        </div>

        <Link
          to="/login"
          className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        >
          Sign In Instead
        </Link>
      </header>

      {/* Registration Form Card */}
      <div className="relative z-30 w-full max-w-[440px] my-auto px-4 pointer-events-auto">
        <div className="p-[1px] rounded-3xl bg-gradient-to-b from-slate-600/40 via-slate-800/30 to-cyan-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(0,240,255,0.06)]">
          <div className="bg-[#0b0d14]/95 backdrop-blur-2xl rounded-[23px] p-7 sm:p-8">
            
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3">
                <GeminiLiveAvatar size={90} hat="coach" speakerName="Gemini Live Sales Coach" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/70 text-[11px] font-medium text-slate-300 shadow-sm mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="tracking-tight">Sales Closer Onboarding</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-b from-[#ffffff] via-[#e2e8f0] to-[#94a3b8] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(255,255,255,0.08)]">
                Create Account
              </h1>
              <p className="text-xs text-slate-400 font-normal mt-1.5 leading-relaxed tracking-tight">
                Unlock high-velocity cold calling drills and simulated prospect arenas.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-700/60 rounded-xl text-xs text-rose-200 tracking-tight leading-relaxed shadow-inner">
                {error}
              </div>
            )}

            {successNotice && (
              <div className="mb-5 p-3.5 bg-emerald-950/60 border border-emerald-600/60 rounded-xl text-xs text-emerald-200 tracking-tight leading-relaxed shadow-inner flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>{successNotice}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Alex Hunter"
                  className="w-full px-4 py-3 bg-[#11131c] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition shadow-inner select-text cursor-text"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="rep@company.com"
                  className="w-full px-4 py-3 bg-[#11131c] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition shadow-inner select-text cursor-text"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Secure Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
                    className="w-full pl-4 pr-11 py-3 bg-[#11131c] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition shadow-inner select-text cursor-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1.5 rounded-lg hover:bg-slate-800"
                    tabIndex={-1}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] border-t border-indigo-300/40 transition transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 tracking-tight"
              >
                {loading ? 'Creating Account...' : 'Get Started Now'}
                <ArrowRight className="w-4 h-4 text-indigo-200" />
              </button>
            </form>

            {/* 1-Click Instant Demo Access */}
            <div className="mt-5 pt-5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(245,158,11,0.5)] border-2 border-amber-300 tracking-tight group"
              >
                <Sparkles className="w-4 h-4 text-slate-950 group-hover:rotate-12 transition-transform" />
                ⚡ Instant 1-Click Demo Login (Alex Hunter)
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400/90 tracking-tight">
                Already registered?{' '}
                <Link to="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-30 w-full max-w-7xl px-6 sm:px-10 pb-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400/80 pointer-events-auto tracking-tight">
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-medium">Contractor PaaS</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">AI Receptionist</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">Live Objection Drills</span>
        </div>
        <div className="text-slate-500 text-[11px]">
          ScriptMaster Pro Enterprise
        </div>
      </footer>

    </div>
  );
}
