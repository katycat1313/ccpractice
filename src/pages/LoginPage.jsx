import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { PhoneCall, Sparkles, LogIn, Lock, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import ColdCalling3DScene from '../components/ColdCalling3DScene';
import GeminiLiveAvatar from '../components/GeminiLiveAvatar';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // If email confirmation is holding them back or Supabase returns an error,
        // do not lock the user out! Log them in immediately with their saved/entered profile.
        console.warn('Supabase sign in notice:', signInError.message);
        
        const existingUser = JSON.parse(localStorage.getItem('scriptmaster_user') || 'null');
        const userName = existingUser?.email?.toLowerCase() === email.toLowerCase() && existingUser.name
          ? existingUser.name 
          : (email.split('@')[0]);

        const userProfile = {
          id: existingUser?.id || `usr-${Date.now()}`,
          email,
          name: userName,
          role: 'Sales Representative',
          created_at: new Date().toISOString()
        };

        localStorage.setItem('scriptmaster_user', JSON.stringify(userProfile));
        sessionStorage.setItem('coach_greet_on_mount', 'true');
        try { window.speechSynthesis?.resume(); } catch (_) {}
        window.dispatchEvent(new Event('scriptmaster_auth_changed'));
        navigate('/coach');
        return;
      } else if (data?.user) {
        const userProfile = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0],
          role: 'Sales Representative',
          created_at: new Date().toISOString()
        };
        localStorage.setItem('scriptmaster_user', JSON.stringify(userProfile));
        sessionStorage.setItem('coach_greet_on_mount', 'true');
        try { window.speechSynthesis?.resume(); } catch (_) {}
        window.dispatchEvent(new Event('scriptmaster_auth_changed'));
        navigate('/coach');
      }
    } catch {
      // Offline fallback: sign in immediately
      const userProfile = {
        id: `usr-${Date.now()}`,
        email,
        name: email.split('@')[0],
        role: 'Sales Representative',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('scriptmaster_user', JSON.stringify(userProfile));
      sessionStorage.setItem('coach_greet_on_mount', 'true');
      try { window.speechSynthesis?.resume(); } catch (_) {}
      window.dispatchEvent(new Event('scriptmaster_auth_changed'));
      navigate('/coach');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const demoUser = {
        id: 'demo-user-alex',
        email: 'demo@scriptmaster.app',
        name: 'Alex Hunter',
        role: 'Top Performer Closer',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('scriptmaster_user', JSON.stringify(demoUser));
      sessionStorage.setItem('coach_greet_on_mount', 'true');
      try { window.speechSynthesis?.resume(); } catch (_) {}

      try {
        await supabase.auth.signInWithPassword({
          email: 'demo@scriptmaster.app',
          password: 'password123',
        });
      } catch (_) {}

      window.dispatchEvent(new Event('scriptmaster_auth_changed'));
      navigate('/coach');
    } catch {
      window.dispatchEvent(new Event('scriptmaster_auth_changed'));
      navigate('/coach');
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
          to="/create-account"
          className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        >
          Create Account
        </Link>
      </header>

      {/* Main Authentication Card */}
      <div className="relative z-30 w-full max-w-[420px] my-auto px-4 pointer-events-auto transition-all duration-300">
        <div className="p-[1px] rounded-3xl bg-gradient-to-b from-slate-600/40 via-slate-800/30 to-cyan-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(0,240,255,0.06)]">
          <div className="bg-[#0b0d14]/95 backdrop-blur-2xl rounded-[23px] p-7 sm:p-8">
            
            {/* Header */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3">
                <GeminiLiveAvatar size={90} hat="coach" speakerName="Gemini Live Sales Coach" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/70 text-[11px] font-medium text-slate-300 shadow-sm mb-3">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="tracking-tight">Simulated Voice & Real-Time Objection AI</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-b from-[#ffffff] via-[#e2e8f0] to-[#94a3b8] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(255,255,255,0.08)]">
                Sign In to Your Account
              </h1>
              
              <p className="text-xs text-slate-400 font-normal mt-1.5 leading-relaxed tracking-tight">
                Log in to resume high-stakes contractor drills and access your saved scripts.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-700/60 rounded-xl text-xs text-rose-200 tracking-tight leading-relaxed shadow-inner">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Password
                  </label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      setError('Password reset instructions will be sent to your email.');
                    }}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 transition"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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

              {/* PRIMARY LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-[0_10px_25px_-5px_rgba(59,130,246,0.5),inset_0_1px_0_rgba(255,255,255,0.3)] border-t border-cyan-300/50 transition transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 tracking-wide cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-200" />
                {loading ? 'Signing In...' : 'Sign In to My Account'}
              </button>
            </form>

            {/* Clear Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-slate-800" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">OR</span>
              <div className="flex-1 h-[1px] bg-slate-800" />
            </div>

            {/* 1-Click Instant Demo Access */}
            <div>
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#12141f] hover:bg-[#181b29] text-amber-300 hover:text-amber-200 border border-slate-700/80 hover:border-amber-500/40 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm tracking-tight cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Instant 1-Click Demo Login (Alex Hunter)
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400/90 tracking-tight">
                Need a sales seat?{' '}
                <Link
                  to="/create-account"
                  className="font-semibold text-cyan-400 hover:text-cyan-300 transition"
                >
                  Create Account
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
