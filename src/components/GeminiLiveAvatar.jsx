import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Mic, 
  Volume2, 
  Sparkles, 
  Maximize2, 
  Minimize2, 
  ChevronDown,
  UserCheck,
  Check
} from 'lucide-react';

export const HUMAN_PERSONAS = {
  marcus: {
    id: 'marcus',
    name: 'Marcus Vance',
    gender: 'male',
    lang: 'en-US',
    role: 'Senior Executive Sales Mentor',
    hat: 'coach',
    tagline: 'High-Impact Closer • Confident & Deep',
    voiceStyle: 'American Male • Confident & Deep',
    geminiVoice: 'Fenrir',
    deepgramVoice: 'aura-orion-en',
    accentColor: 'cyan',
    greeting: "Let's sharpen your hook. What objection do you want to break down first?"
  },
  elena: {
    id: 'elena',
    name: 'Elena Rostova',
    gender: 'female',
    lang: 'en-US',
    role: 'Elite Sales Strategy Director',
    hat: 'coach',
    tagline: 'Enterprise Deal Closer • Articulate & Sharp',
    voiceStyle: 'American Female • Articulate & Sharp',
    geminiVoice: 'Aoede',
    deepgramVoice: 'aura-stella-en',
    accentColor: 'indigo',
    greeting: "Every second counts in the opener. Walk me through your value proposition."
  },
  hank: {
    id: 'hank',
    name: 'Hank Miller',
    gender: 'male',
    lang: 'en-US',
    role: 'Trade Contractor Owner (Austin, TX)',
    hat: 'prospect',
    tagline: 'Busy Business Owner • In Truck',
    voiceStyle: 'American Male • Gruff Contractor',
    geminiVoice: 'Charon',
    deepgramVoice: 'aura-arcas-en',
    accentColor: 'amber',
    greeting: "Miller HVAC, Hank speaking. Make it quick, what's this call about?"
  },
  sarah: {
    id: 'sarah',
    name: 'Sarah Chen',
    gender: 'female',
    lang: 'en-US',
    role: 'VP of Commercial Operations',
    hat: 'prospect',
    tagline: 'Discerning Decision Maker',
    voiceStyle: 'American Female • Analytical & Crisp',
    geminiVoice: 'Zephyr',
    deepgramVoice: 'aura-asteria-en',
    accentColor: 'rose',
    greeting: "Premier Services, Sarah here. You have my attention for 30 seconds."
  }
};

/**
 * GeminiLiveAvatar: Living Neural Orb
 * Supports both MALE and FEMALE voice personas seamlessly.
 * - Male persona (Marcus / Hank): Electric cyan / deep blue / gold amber glow, resonant EQ
 * - Female persona (Elena / Sarah): Luminous violet / magenta / rose glow, crisp radiant EQ
 * - Highly animated soundwaves, breathing halo rings, and state reactivity
 */
export default function GeminiLiveAvatar({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  hat = 'coach',
  speakerName = 'Sales Coach',
  onAvatarClick,
  size = 210,
  allowSwitching = true,
  onPersonaChange,
  currentSpeechText = '',
  isAudioBlocked = false,
  onUnlockAudio
}) {
  const getAutoPersonaKey = useCallback(() => {
    const lowerName = (speakerName || '').toLowerCase();
    if (hat === 'prospect') {
      if (lowerName.includes('sarah') || lowerName.includes('chen')) {
        return 'sarah';
      }
      return 'hank';
    }
    // Coach hat
    if (lowerName.includes('elena') || lowerName.includes('female')) {
      return 'elena';
    }
    return 'marcus';
  }, [hat, speakerName]);

  const [selectedPersonaKey, setSelectedPersonaKey] = useState(getAutoPersonaKey());
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [audioMeter, setAudioMeter] = useState([30, 45, 60, 40, 75, 50, 35, 65]);

  const menuRef = useRef(null);
  const animFrameRef = useRef(null);
  const speechClockRef = useRef(0);

  // Sync persona when hat or speakerName changes
  useEffect(() => {
    setSelectedPersonaKey(getAutoPersonaKey());
  }, [getAutoPersonaKey]);

  // Close persona dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowPersonaMenu(false);
      }
    };
    if (showPersonaMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showPersonaMenu]);

  const currentPersona = HUMAN_PERSONAS[selectedPersonaKey] || HUMAN_PERSONAS.marcus;
  const isFemale = currentPersona.gender === 'female';

  // Dynamic Audio EQ and Neural Orb Rhythm Synthesis
  useEffect(() => {
    let running = true;

    const updateDynamics = () => {
      speechClockRef.current += 0.05;
      const clock = speechClockRef.current;

      if (isSpeaking) {
        // Fast multi-frequency wave when speaking
        setAudioMeter([
          Math.min(100, Math.floor(40 + Math.sin(clock * 7) * 35 + Math.random() * 20)),
          Math.min(100, Math.floor(55 + Math.sin(clock * 9) * 30 + Math.random() * 15)),
          Math.min(100, Math.floor(75 + Math.sin(clock * 5) * 25 + Math.random() * 20)),
          Math.min(100, Math.floor(90 + Math.sin(clock * 12) * 20 + Math.random() * 10)),
          Math.min(100, Math.floor(80 + Math.sin(clock * 8) * 25 + Math.random() * 20)),
          Math.min(100, Math.floor(65 + Math.sin(clock * 6) * 30 + Math.random() * 20)),
          Math.min(100, Math.floor(45 + Math.sin(clock * 10) * 35 + Math.random() * 15)),
          Math.min(100, Math.floor(35 + Math.sin(clock * 4) * 30 + Math.random() * 15))
        ]);
      } else if (isListening) {
        // Pulse responsive to listening
        setAudioMeter([
          Math.floor(25 + Math.sin(clock * 4) * 25),
          Math.floor(40 + Math.sin(clock * 5) * 35),
          Math.floor(60 + Math.sin(clock * 3) * 30),
          Math.floor(75 + Math.sin(clock * 6) * 25),
          Math.floor(50 + Math.sin(clock * 4) * 30),
          Math.floor(35 + Math.sin(clock * 5) * 25),
          Math.floor(20 + Math.sin(clock * 3) * 20),
          Math.floor(15 + Math.sin(clock * 2) * 15)
        ]);
      } else if (isThinking) {
        setAudioMeter([20, 35, 50, 65, 75, 55, 35, 20]);
      } else {
        // Idle gentle breathing rhythm
        const idlePulse = Math.sin(clock * 1.5) * 6;
        setAudioMeter([
          12 + idlePulse, 
          16 + idlePulse, 
          14 + idlePulse, 
          20 + idlePulse, 
          18 + idlePulse, 
          14 + idlePulse, 
          10 + idlePulse, 
          8 + idlePulse
        ]);
      }

      if (running) {
        animFrameRef.current = requestAnimationFrame(updateDynamics);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateDynamics);

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSpeaking, isListening, isThinking]);

  // Switch gender helper (Male <-> Female in 1 tap)
  const handleToggleGender = (e) => {
    e.stopPropagation();
    let newKey = 'marcus';
    if (hat === 'coach') {
      newKey = isFemale ? 'marcus' : 'elena';
    } else {
      newKey = isFemale ? 'hank' : 'sarah';
    }
    setSelectedPersonaKey(newKey);
    const targetPersona = HUMAN_PERSONAS[newKey];
    if (onPersonaChange) onPersonaChange(targetPersona);
  };

  const handleSelectPersona = (p, e) => {
    e.stopPropagation();
    setSelectedPersonaKey(p.id);
    setShowPersonaMenu(false);
    if (onPersonaChange) onPersonaChange(p);
  };

  const containerHeight = isExpanded ? 360 : Math.max(size, 220);

  // Dynamic Theme Styling based on Voice & Gender
  const theme = useMemo(() => {
    if (isFemale) {
      return {
        genderLabel: 'Female Voice',
        genderBadge: 'bg-rose-950/80 text-rose-300 border-rose-800',
        orbGradient: isSpeaking
          ? 'bg-gradient-to-br from-rose-300 via-fuchsia-500 to-indigo-700 shadow-[0_0_55px_rgba(244,63,94,0.95)] ring-4 ring-rose-300/70'
          : isListening
          ? 'bg-gradient-to-br from-rose-400 via-pink-600 to-purple-800 shadow-[0_0_55px_rgba(244,63,94,0.95)] ring-4 ring-rose-400/80'
          : isThinking
          ? 'bg-gradient-to-br from-indigo-400 via-purple-600 to-slate-800 shadow-[0_0_40px_rgba(168,85,247,0.85)] ring-2 ring-purple-400/60'
          : 'bg-gradient-to-br from-fuchsia-400 via-indigo-600 to-slate-900 shadow-[0_0_35px_rgba(217,70,239,0.6)] ring-2 ring-fuchsia-400/40',
        haloGradient: 'from-fuchsia-500/25 via-indigo-500/20 to-transparent',
        bgCorona: isSpeaking
          ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-fuchsia-600/30 via-indigo-900/15 to-transparent'
          : isListening
          ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-600/35 via-purple-950/20 to-transparent'
          : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950/10 to-transparent',
        borderAccent: isSpeaking
          ? 'border-fuchsia-500/80 shadow-[0_0_30px_rgba(217,70,239,0.35)] ring-2 ring-fuchsia-400/40'
          : isListening
          ? 'border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.35)] ring-2 ring-rose-400/40'
          : 'border-purple-900/50 shadow-xl'
      };
    }

    // Male theme (Marcus / Hank)
    return {
      genderLabel: 'Male Voice',
      genderBadge: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
      orbGradient: isSpeaking
        ? currentPersona.accentColor === 'cyan'
          ? 'bg-gradient-to-br from-cyan-300 via-cyan-500 to-indigo-700 shadow-[0_0_55px_rgba(6,182,212,0.95)] ring-4 ring-cyan-300/70'
          : 'bg-gradient-to-br from-amber-300 via-amber-500 to-orange-700 shadow-[0_0_55px_rgba(245,158,11,0.95)] ring-4 ring-amber-300/70'
        : isListening
        ? 'bg-gradient-to-br from-rose-400 via-rose-600 to-red-800 shadow-[0_0_55px_rgba(244,63,94,0.95)] ring-4 ring-rose-400/80'
        : isThinking
        ? 'bg-gradient-to-br from-indigo-400 via-purple-600 to-slate-800 shadow-[0_0_40px_rgba(99,102,241,0.85)] ring-2 ring-indigo-400/60'
        : 'bg-gradient-to-br from-cyan-400 via-blue-600 to-slate-900 shadow-[0_0_35px_rgba(6,182,212,0.6)] ring-2 ring-cyan-400/40',
      haloGradient: 'from-cyan-500/25 via-indigo-500/20 to-transparent',
      bgCorona: isSpeaking
        ? currentPersona.accentColor === 'cyan'
          ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-600/30 via-indigo-900/15 to-transparent'
          : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-600/30 via-orange-950/15 to-transparent'
        : isListening
        ? 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-600/35 via-red-950/20 to-transparent'
        : 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950/10 to-transparent',
      borderAccent: isSpeaking
        ? currentPersona.accentColor === 'cyan'
          ? 'border-cyan-500/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] ring-2 ring-cyan-400/40'
          : 'border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/40'
        : isListening
        ? 'border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.35)] ring-2 ring-rose-400/40'
        : 'border-slate-800 shadow-xl'
    };
  }, [isFemale, isSpeaking, isListening, isThinking, currentPersona.accentColor]);

  return (
    <div className="flex flex-col items-center w-full max-w-sm select-none relative" ref={menuRef}>
      
      {/* Main Orb Container Card */}
      <div 
        className={`relative w-full rounded-3xl overflow-hidden border-2 transition-all duration-300 bg-[#090b12] ${theme.borderAccent}`}
        style={{ height: containerHeight }}
      >
        
        {/* Top Studio HUD Bar */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/90 via-black/60 to-transparent pointer-events-auto">
          
          {/* Hat / Live Status Badge */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : isListening ? 'bg-rose-400 animate-ping' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-white/90">
              {hat === 'coach' ? 'AI COACH' : 'PROSPECT'}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono font-medium">
              ORB
            </span>
          </div>

          {/* Right Header Controls: 1-Tap Gender Toggle, Persona Dropdown, Expand */}
          <div className="flex items-center gap-1.5">
            
            {/* Quick 1-Tap Male / Female Voice Toggle */}
            <button
              type="button"
              onClick={handleToggleGender}
              className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full border transition shadow-sm font-semibold cursor-pointer ${
                isFemale
                  ? 'bg-rose-950/90 hover:bg-rose-900 border-rose-700/80 text-rose-200'
                  : 'bg-cyan-950/90 hover:bg-cyan-900 border-cyan-700/80 text-cyan-200'
              }`}
              title={`Currently ${isFemale ? 'Female' : 'Male'} Voice. Tap to switch to ${isFemale ? 'Male (Marcus)' : 'Female (Elena)'}`}
            >
              <span>{isFemale ? '♀ Female' : '♂ Male'}</span>
            </button>

            {/* Persona Switcher Dropdown Toggle ("Marcus" Dropdown) */}
            {allowSwitching && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPersonaMenu(!showPersonaMenu);
                }}
                className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full border transition shadow-sm cursor-pointer ${
                  showPersonaMenu 
                    ? 'bg-cyan-900 border-cyan-400 text-white' 
                    : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-600/60'
                }`}
                title="Open Voice & Character Dropdown"
              >
                <span className="font-bold">{currentPersona.name.split(' ')[0]}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${showPersonaMenu ? 'rotate-180 text-cyan-300' : ''}`} />
              </button>
            )}

            {/* Expand / Minimize */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title={isExpanded ? "Collapse View" : "Expand Video Feed"}
            >
              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Persona Dropdown Menu (Positioned cleanly with high z-index and max-height scrolling) */}
        {showPersonaMenu && (
          <div className="absolute top-10 right-2 z-50 w-64 max-h-[175px] overflow-y-auto rounded-2xl bg-[#0d111d] border border-cyan-500/60 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 px-2 py-1 border-b border-slate-800 mb-1 flex items-center justify-between">
              <span>Choose Voice & Character:</span>
              <span className="text-[9px] text-slate-400 font-mono">Orb Live</span>
            </div>

            <div className="space-y-1">
              {Object.values(HUMAN_PERSONAS).map((p) => {
                const isSelected = selectedPersonaKey === p.id;
                const isPfem = p.gender === 'female';
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => handleSelectPersona(p, e)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-cyan-950 via-[#18263e] to-indigo-950 border border-cyan-400/80 text-white shadow-md' 
                        : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="text-xs font-bold truncate flex items-center gap-1.5">
                        <span className={isSelected ? 'text-cyan-300' : 'text-white'}>{p.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                          isPfem 
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/80' 
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800/80'
                        }`}>
                          {isPfem ? '♀ Female' : '♂ Male'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{p.tagline}</div>
                    </div>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-black stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Central Stage: MESMERIZING GLOWING NEURAL ORB */}
        <div 
          className="relative w-full h-full cursor-pointer overflow-hidden flex flex-col items-center justify-center bg-[#07090e] group"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onAvatarClick) onAvatarClick(e);
          }}
          title={isListening ? "Listening to you... Tap to finish" : isSpeaking ? "Tap to interrupt & speak" : `Tap ${currentPersona.name.split(' ')[0]} orb to speak directly`}
        >
          
          {/* Dynamic Background Corona Rays */}
          <div className={`absolute inset-0 pointer-events-none transition-all duration-700 ${theme.bgCorona}`} />

          {/* Breathing Halo Wave Rings */}
          <div className="relative flex items-center justify-center">
            
            {/* Outer Pulse Corona Ring */}
            <div 
              className={`absolute rounded-full transition-all duration-300 pointer-events-none ${
                isSpeaking
                  ? isFemale 
                    ? 'w-48 h-48 border border-fuchsia-400/40 animate-ping opacity-60' 
                    : 'w-48 h-48 border border-cyan-400/40 animate-ping opacity-60'
                  : isListening
                  ? 'w-48 h-48 border border-rose-400/50 animate-ping opacity-75'
                  : 'w-44 h-44 border border-cyan-500/15 animate-pulse opacity-40'
              }`}
            />

            {/* Secondary Orbital Halo */}
            <div 
              className={`absolute rounded-full transition-all duration-500 pointer-events-none bg-gradient-to-tr ${theme.haloGradient} blur-md ${
                isSpeaking
                  ? 'w-40 h-40 animate-spin'
                  : isListening
                  ? 'w-40 h-40 animate-pulse'
                  : isThinking
                  ? 'w-36 h-36 animate-spin'
                  : 'w-36 h-36 animate-pulse'
              }`}
              style={{ animationDuration: isThinking ? '2.5s' : '5s' }}
            />

            {/* Tertiary Glow Core Background */}
            <div 
              className={`absolute rounded-full transition-all duration-200 pointer-events-none filter blur-xl ${
                isSpeaking
                  ? isFemale ? 'w-32 h-32 bg-fuchsia-400/40' : 'w-32 h-32 bg-cyan-400/40'
                  : isListening
                  ? 'w-32 h-32 bg-rose-500/50'
                  : 'w-28 h-28 bg-cyan-500/25'
              }`}
            />

            {/* The Central Glowing Neural Orb Sphere */}
            <div 
              className={`relative w-28 h-28 rounded-full shadow-2xl flex items-center justify-center transition-all duration-150 transform group-hover:scale-105 cursor-pointer ${theme.orbGradient}`}
              style={{
                transform: isSpeaking 
                  ? `scale(${1 + (audioMeter[3] || 50) * 0.0018})` 
                  : isListening 
                  ? `scale(${1.03 + (audioMeter[2] || 40) * 0.0015})` 
                  : 'scale(1)'
              }}
            >
              {/* Specular 3D Glass Light Reflection Curve */}
              <div className="absolute top-2 left-3 w-8 h-4 rounded-full bg-white/60 blur-[1px] rotate-[-25deg] pointer-events-none" />

              {/* Dynamic Center Soundwave / Frequency EQ Visualizer */}
              <div className="flex items-center justify-center gap-1 z-10 pointer-events-none h-10 px-2">
                {audioMeter.slice(0, 6).map((h, idx) => (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all duration-75 shadow-sm ${
                      isSpeaking || isListening 
                        ? 'bg-white shadow-[0_0_8px_#fff]' 
                        : 'bg-white/60'
                    }`}
                    style={{
                      height: isSpeaking || isListening 
                        ? `${Math.max(6, Math.min(32, h * 0.35))}px` 
                        : '4px'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Floating Tap-to-Speak HUD Badge */}
          <div className="mt-4 z-20 pointer-events-none">
            {isListening ? (
              <span className="px-3.5 py-1 rounded-full bg-rose-600/90 border border-rose-300 text-white text-[11px] font-black tracking-wide flex items-center gap-1.5 shadow-xl shadow-rose-950/80 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Listening... Speak out loud
              </span>
            ) : isSpeaking ? (
              <span className={`px-3.5 py-1 rounded-full text-white text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-xl ${
                isFemale ? 'bg-fuchsia-950/95 border border-fuchsia-400' : 'bg-cyan-950/95 border border-cyan-400'
              }`}>
                <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                {currentPersona.name.split(' ')[0]} Speaking ({isFemale ? 'Female' : 'Male'})
              </span>
            ) : isThinking ? (
              <span className="px-3.5 py-1 rounded-full bg-indigo-950/95 border border-indigo-400 text-indigo-200 text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-xl shadow-indigo-950/80">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                Formulating Advice...
              </span>
            ) : (
              <span className="px-3.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-xl backdrop-blur-sm group-hover:border-cyan-400 transition">
                <Mic className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />
                Tap Orb to Speak ({currentPersona.name.split(' ')[0]} • {isFemale ? '♀' : '♂'})
              </span>
            )}
          </div>

          {/* Subtitle / Speech Bubble preview */}
          {currentSpeechText && isSpeaking && (
            <div className="absolute bottom-2 inset-x-3 z-20 pointer-events-none text-center">
              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-black/80 border border-slate-700 text-[10px] text-slate-200 font-medium truncate max-w-full backdrop-blur-sm">
                &ldquo;{currentSpeechText.slice(0, 60)}{currentSpeechText.length > 60 ? '...' : ''}&rdquo;
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Voice Status Sub-label */}
      <div className="mt-2 text-center flex items-center justify-center gap-2">
        <span className="text-[11px] font-bold text-slate-300">
          {currentPersona.name}
        </span>
        <span className="text-slate-500">•</span>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${theme.genderBadge}`}>
          {theme.genderLabel}
        </span>
        <span className="text-slate-500">•</span>
        <span className="text-[10px] text-cyan-400 font-mono">
          Neural Orb
        </span>
      </div>

    </div>
  );
}

GeminiLiveAvatar.propTypes = {
  isSpeaking: PropTypes.bool,
  isListening: PropTypes.bool,
  isThinking: PropTypes.bool,
  hat: PropTypes.string,
  speakerName: PropTypes.string,
  onAvatarClick: PropTypes.func,
  size: PropTypes.number,
  allowSwitching: PropTypes.bool,
  onPersonaChange: PropTypes.func,
  currentSpeechText: PropTypes.string,
  isAudioBlocked: PropTypes.bool,
  onUnlockAudio: PropTypes.func
};
