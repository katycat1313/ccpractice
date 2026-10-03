import React from 'react';
import { ExternalLink, Mic, X, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export default function IframeMicModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0D1322] border-2 border-indigo-500/80 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-[0_0_50px_rgba(99,102,241,0.35)] text-white space-y-5 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Pulsing Mic Icon */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Microphone Access Restricted in iFrame
            </h3>
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Browser iFrame Security Policy
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            Your browser blocks microphone recording and Web Speech recognition inside embedded preview frames.
          </p>
          <p className="text-indigo-300 font-medium">
            Click the button below to open ScriptMaster in a dedicated browser tab where your microphone can be allowed immediately.
          </p>
        </div>

        {/* Action Button: Opens the app in a full window */}
        <div className="space-y-2.5 pt-1">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 group text-center"
          >
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Open in Full Window (Enable Mic)</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl border border-slate-800 transition cursor-pointer"
          >
            I'll type instead (Stay in preview)
          </button>
        </div>

      </div>
    </div>
  );
}
