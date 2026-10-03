import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  PhoneCall, 
  FileText, 
  Settings, 
  ArrowRight,
  Flame,
  Radio,
  Cpu,
  Eye,
  BookmarkCheck,
  Zap,
  ChevronRight
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getCoachMemory } from '../lib/coachMemory';
import { getCustomProspects, getSelectedProspectId, setSelectedProspectId } from '../lib/prospectManager';
import { getRecordings } from '../lib/recordingsService';
import IframeMicModal from '../components/IframeMicModal';

export default function DashboardPage() {
  const navigate = useNavigate();

  const [userName, setUserName] = useState('Katy');
  const [prospects, setProspects] = useState([]);
  const [recordingsCount, setRecordingsCount] = useState(0);
  const [activeProspect, setActiveProspect] = useState(null);
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);

  // Live Avatar Cost-Toggle State
  const [isAvatarEnabled, setIsAvatarEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('scriptmaster_live_avatar_enabled');
      if (saved !== null) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return true;
  });

  const isInIframe = typeof window !== 'undefined' && (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    const memory = getCoachMemory();
    
    let resolvedName = 'Katy';
    if (localUser.name && localUser.name !== 'Sales Rep') {
      resolvedName = localUser.name.split(' ')[0];
    } else if (localUser.email) {
      const prefix = localUser.email.split('@')[0].replace(/[0-9]/g, '');
      resolvedName = prefix ? prefix.charAt(0).toUpperCase() + prefix.slice(1) : 'Katy';
    } else if (memory.userName && memory.userName !== 'there') {
      resolvedName = memory.userName;
    }
    setUserName(resolvedName);

    const proList = getCustomProspects();
    setProspects(proList);

    const activeId = getSelectedProspectId();
    const current = proList.find(p => p.id === activeId) || proList[0] || null;
    setActiveProspect(current);

    const recs = getRecordings();
    setRecordingsCount(recs.length);
  }, []);

  const handleToggleAvatar = () => {
    const next = !isAvatarEnabled;
    setIsAvatarEnabled(next);
    try {
      localStorage.setItem('scriptmaster_live_avatar_enabled', JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const handleSelectAndCall = (prospect) => {
    setSelectedProspectId(prospect.id);
    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }
    navigate('/practice');
  };

  const handleInstantWarmup = () => {
    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }
    navigate('/workshops');
  };

  // Safe portrait resolver
  const getSafeAvatarUrl = (p) => {
    const isCarl = p.name?.includes('Carl') || p.name?.includes('Mac') || p.id?.includes('carl');
    const isBo = p.name?.includes('Bo') || p.name?.includes('Travis') || p.id?.includes('bo');
    const isDelbert = p.name?.includes('Delbert') || p.id?.includes('delbert');

    if (isCarl || p.avatarUrl?.includes('1544717305-2782549b5136')) {
      return 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80';
    }
    if (isBo) {
      return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
    }
    if (isDelbert) {
      return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80';
    }
    return p.avatarUrl || p.portraitUrl || 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80';
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* =========================================================================
            1. MINIMAL COMMAND HEADER
           ========================================================================= */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                Mountain State Engine Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Good afternoon, {userName}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select a West Virginia contractor below or run an instant 60-second warmup drill.
            </p>
          </div>

          <button
            type="button"
            onClick={handleInstantWarmup}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 shrink-0 self-start sm:self-auto"
          >
            <Flame className="w-4 h-4 fill-slate-950" />
            <span>Instant Warmup (60s)</span>
          </button>
        </header>

        {/* =========================================================================
            2. CLEAN 2-COLUMN COMMAND LAYOUT
            Left Column: Compact Practice Launcher, Live Avatar Toggle, Workspace Links (4 cols)
            Right Column: Seamless West Virginia Contractor Personas List (8 cols)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* =========================================================================
              LEFT COLUMN: COMMAND DOCK
             ========================================================================= */}
          <div className="lg:col-span-5 space-y-6">

            {/* Compact Practice Call Studio Launcher */}
            <div className="p-6 rounded-2xl bg-[#0d121c] border border-slate-800/80 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  Practice Call Studio
                </span>
                <span className="text-[10px] text-slate-500">Live WebRTC Voice</span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block font-medium">Ready Target:</span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {activeProspect?.name || "Carl 'Mac' McIntyre"}
                </h3>
                <p className="text-xs text-indigo-300 font-medium">
                  {activeProspect?.role || 'General Contractor'} • {activeProspect?.city || 'Kanawha County, WV'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (activeProspect) {
                    handleSelectAndCall(activeProspect);
                  } else {
                    navigate('/practice');
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
              >
                <PhoneCall className="w-4 h-4 fill-white" />
                <span>Launch Practice Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Avatar Cost-Toggle Indicator */}
            <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800/80 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  isAvatarEnabled 
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300' 
                    : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300'
                }`}>
                  {isAvatarEnabled ? <Eye className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">
                      {isAvatarEnabled ? 'Gemini Live + Avatar' : 'Live Voice Only'}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                      isAvatarEnabled 
                        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {isAvatarEnabled ? 'Full Video' : 'Low Cost'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAvatarEnabled ? 'Procedural animated avatar active' : '0 visual tokens billed • Audio stream'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleAvatar}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-[10px] font-bold transition cursor-pointer shrink-0"
              >
                {isAvatarEnabled ? 'Save Costs' : 'Enable Avatar'}
              </button>
            </div>

            {/* Clean Workspace Navigation Links */}
            <div className="p-4 rounded-2xl bg-[#0d121c] border border-slate-800/80 shadow-sm space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold block px-2 pb-2">
                Workspace Modules
              </span>

              <Link
                to="/script-builder"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition group text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">Script Builder</h4>
                    <span className="text-[10px] text-slate-400">20-second hooks &amp; lethal rebuttals</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                to="/workshops"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition group text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">Cold Calling Workshops</h4>
                    <span className="text-[10px] text-slate-400">4 focused rapid micro-drills</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                to="/recordings"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition group text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <BookmarkCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">Saved Recordings</h4>
                    <span className="text-[10px] text-slate-400">Review practice history ({recordingsCount})</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                to="/settings"
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800/60 transition group text-slate-300 hover:text-white"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-105 transition-transform">
                    <Settings className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-none">Settings</h4>
                    <span className="text-[10px] text-slate-400">Model keys &amp; voice persona preferences</span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
              </Link>
            </div>

          </div>

          {/* =========================================================================
              RIGHT COLUMN: SEAMLESS WEST VIRGINIA CONTRACTOR PERSONAS
             ========================================================================= */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div>
                <h2 className="text-xs uppercase font-mono font-bold tracking-widest text-slate-400">
                  Contractor Personas ({prospects.length})
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Authentic Mountain State trade operators with real jobsite friction and resistance.
                </p>
              </div>

              <Link
                to="/script-builder"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition flex items-center gap-1"
              >
                <span>+ Custom Persona</span>
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Persona Rows List */}
            <div className="space-y-3">
              {prospects.map((p) => {
                const avatar = getSafeAvatarUrl(p);
                const company = p.companyName || p.company || 'West Virginia Contractor';
                const location = p.city || p.location || 'Charleston, WV';
                const tag = p.tag || 'In Truck Cab • Route 60';
                const painText = p.bleedingNeckPain || p.painDescription || '';
                const isSelected = activeProspect?.id === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-[#0f1524] border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-[#0d121c] border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Avatar with subtle fade mask */}
                      <div className="w-14 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0 relative">
                        <img
                          src={avatar}
                          alt={p.name}
                          className="w-full h-full object-cover object-top filter contrast-105"
                          loading="eager"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {tag}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {location}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white truncate">
                          {p.name}
                        </h3>

                        <p className="text-xs text-indigo-300/90 font-medium truncate">
                          {p.role} · <span className="text-slate-400">{company}</span>
                        </p>

                        {painText && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 font-mono">
                            {painText}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleSelectAndCall(p)}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <PhoneCall className="w-3.5 h-3.5 fill-white" />
                        <span>Practice Call</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>

      </main>

      {/* IFRAME MICROPHONE PERMISSION / OPEN FULL WINDOW MODAL */}
      <IframeMicModal 
        isOpen={isIframeMicModalOpen} 
        onClose={() => setIsIframeMicModalOpen(false)} 
      />
    </div>
  );
}
