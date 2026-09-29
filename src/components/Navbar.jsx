import React from 'react';
import { Settings, LogOut, PhoneCall, Trophy, BookOpen, Bot } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function Navbar() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    localStorage.removeItem('scriptmaster_user');
    window.dispatchEvent(new Event('scriptmaster_auth_changed'));
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    navigate('/login');
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/coach" title="Go to AI Coach" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md group-hover:bg-indigo-500 transition">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              ScriptMaster <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded-full font-semibold">COACH</span>
            </h1>
            <p className="text-[10px] text-slate-400 -mt-0.5">Cold Calling & 50% Deposit Closer</p>
          </div>
        </Link>

        <div className="flex items-center gap-4 sm:gap-5">
          <Link 
            to="/coach" 
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 rounded-xl border border-indigo-700/60 shadow-sm"
          >
            <Bot className="w-3.5 h-3.5" /> Coach & Ring Dialer
          </Link>

          <Link 
            to="/progress" 
            className="text-xs font-semibold text-slate-300 hover:text-amber-400 transition flex items-center gap-1"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Progress & Mastery
          </Link>

          <Link 
            to="/rebuttals" 
            className="text-xs font-semibold text-slate-300 hover:text-cyan-400 transition flex items-center gap-1 hidden sm:flex"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" /> Rebuttal Vault
          </Link>

          <Link 
            to="/dashboard" 
            className="text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Dashboard
          </Link>

          <Link 
            to="/saved-scripts" 
            className="text-xs font-semibold text-slate-300 hover:text-white transition hidden md:inline"
          >
            Saved Scripts
          </Link>

          <Link 
            to="/settings"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings size={18} />
          </Link>

          <button
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
