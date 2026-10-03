import React, { useState } from 'react';
import { Settings, LogOut, PhoneCall, FileText, Mic, User, ExternalLink, Sparkles, LayoutDashboard } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import IframeMicModal from './IframeMicModal';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);

  // Robust iframe check
  const isInIframe = typeof window !== 'undefined' && (() => {
    try {
      return window.self !== window.top;
    } catch (_) {
      return true;
    }
  })();

  const handleMicButtonClick = () => {
    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }
    // If not in iframe, test or route directly to practice
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach(t => t.stop());
          navigate('/practice');
        })
        .catch(() => {
          setIsIframeMicModalOpen(true);
        });
    } else {
      navigate('/practice');
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('scriptmaster_user');
    window.dispatchEvent(new Event('scriptmaster_auth_changed'));
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    navigate('/login');
  };

  const navLinks = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: currentPath === '/' || currentPath === '/dashboard' || currentPath === '/overview'
    },
    {
      to: '/script-builder',
      label: 'Script Builder',
      icon: FileText,
      active: currentPath === '/script-builder' || currentPath === '/scripts'
    },
    {
      to: '/practice',
      label: 'Practice Studio',
      icon: PhoneCall,
      active: currentPath === '/coach' || currentPath === '/practice'
    },
    {
      to: '/recordings',
      label: 'Recordings',
      icon: Mic,
      active: currentPath === '/recordings'
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      active: currentPath === '/settings'
    }
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 sticky top-0 z-40 shadow-lg text-slate-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6366f1] to-[#8b5cf6] text-white flex items-center justify-center transition shadow-md shadow-indigo-500/20 group-hover:scale-105">
            <PhoneCall className="w-4 h-4 fill-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 group-hover:text-indigo-400 transition">
              ScriptMaster
            </h1>
            <p className="text-[11px] text-slate-400 font-medium -mt-0.5">Cold Calling & Closer Studio</p>
          </div>
        </Link>

        {/* Primary Page Navigation Menu */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                  item.active
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${item.active ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Prominent Voice & Microphone Button */}
          <button
            type="button"
            onClick={handleMicButtonClick}
            className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white border border-indigo-400/40 rounded-xl transition flex items-center gap-1.5 text-xs font-bold shadow-md shadow-indigo-600/30 cursor-pointer group active:scale-95"
            title={isInIframe ? "Click to open full window & enable microphone" : "Microphone Audio Ready - Practice Call"}
          >
            <Mic className="w-3.5 h-3.5 text-white animate-pulse" />
            <span className="font-semibold">Mic</span>
            {isInIframe && (
              <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] rounded font-black tracking-wide">
                iFrame
              </span>
            )}
          </button>

          {/* Direct link button if inside preview iframe */}
          {isInIframe && (
            <a
              href={typeof window !== 'undefined' ? window.location.href : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 text-indigo-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 border border-slate-750 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold group"
              title="Open full window in new tab to enable microphone"
            >
              <ExternalLink size={13} className="text-indigo-400 group-hover:text-white transition-colors" />
              <span className="hidden md:inline">Open in Tab</span>
            </a>
          )}

          <button
            onClick={handleSignOut}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Global Iframe Microphone Modal */}
      <IframeMicModal 
        isOpen={isIframeMicModalOpen} 
        onClose={() => setIsIframeMicModalOpen(false)} 
      />
    </header>
  );
}
