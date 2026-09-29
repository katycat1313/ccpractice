import React, { useState } from 'react';
import { resetPassword } from '../lib/supabaseAuth';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, KeyRound, PhoneCall } from 'lucide-react';
import ColdCalling3DScene from '../components/ColdCalling3DScene';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const res = await resetPassword(email);
    setLoading(false);
    if (res.error) {
      setError(res.error.message || JSON.stringify(res.error));
      return;
    }
    setMessage('If an account exists, a secure recovery link has been dispatched to your email.');
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col justify-between items-center relative overflow-hidden font-sans antialiased">
      
      {/* Precision Micro Specular Edge Lights */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 via-indigo-400/40 to-transparent z-30 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/50 to-transparent z-30 pointer-events-none" />

      {/* 3D Cold Calling Interactive Scene in Background */}
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
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-tight">AI Cold Calling Coach & Sales Simulator</p>
          </div>
        </div>

        <Link
          to="/login"
          className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </header>

      {/* Reset Card */}
      <div className="relative z-30 w-full max-w-[420px] my-auto px-4 pointer-events-auto">
        <div className="p-[1px] rounded-3xl bg-gradient-to-b from-slate-600/40 via-slate-800/30 to-cyan-500/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95),0_0_35px_rgba(0,240,255,0.06)]">
          <div className="bg-[#0b0d14]/92 backdrop-blur-2xl rounded-[23px] p-7 sm:p-8">
            
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/70 text-[11px] font-medium text-slate-300 shadow-sm mb-3">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span className="tracking-tight">Credential Recovery</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight bg-gradient-to-b from-[#ffffff] via-[#e2e8f0] to-[#94a3b8] bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(255,255,255,0.08)]">
                Reset Password
              </h1>
              <p className="text-xs text-slate-400 font-normal mt-1.5 leading-relaxed tracking-tight">
                Enter your verified work email address to receive password reset instructions.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-950/50 border border-rose-700/50 rounded-xl text-xs text-rose-200 tracking-tight leading-relaxed shadow-inner">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-5 p-3.5 bg-emerald-950/50 border border-emerald-700/50 rounded-xl text-xs text-emerald-200 tracking-tight leading-relaxed shadow-inner">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300/80 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="rep@company.com"
                  className="w-full px-4 py-3 bg-[#11131c]/90 border border-slate-700/70 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500/80 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/30 transition shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.03)]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-[0_10px_25px_-5px_rgba(99,102,241,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] border-t border-indigo-300/40 transition transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 tracking-tight"
              >
                {loading ? 'Dispatching...' : 'Send Recovery Instructions'}
                <ArrowRight className="w-4 h-4 text-indigo-200" />
              </button>
            </form>

            <div className="mt-5 text-center">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition tracking-tight">
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
              </Link>
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
