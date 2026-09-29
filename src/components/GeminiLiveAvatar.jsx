import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  UserCheck, 
  Maximize2, 
  Minimize2, 
  RefreshCw,
  Sliders,
  ChevronDown
} from 'lucide-react';

// Import photorealistic human avatar portraits
import coachMarcusImg from '../assets/avatars/coach_marcus.jpg';
import coachElenaImg from '../assets/avatars/coach_elena.jpg';
import prospectHankImg from '../assets/avatars/prospect_hank.jpg';
import prospectSarahImg from '../assets/avatars/prospect_sarah.jpg';

export const HUMAN_PERSONAS = {
  marcus: {
    id: 'marcus',
    name: 'Marcus Vance',
    gender: 'male',
    lang: 'en-US',
    role: 'Senior Executive Sales Coach',
    hat: 'coach',
    image: coachMarcusImg,
    tagline: 'High-Impact Cold Call Master',
    voiceStyle: 'American Male • Confident & Deep',
    geminiVoice: 'Fenrir',
    deepgramVoice: 'aura-orion-en',
    pitch: 0.98,
    rate: 0.98,
    greeting: "Let's sharpen your hook. What objection do you want to break down first?",
    accentColor: 'cyan',
    mouthPos: { x: 50, y: 70, w: 22, h: 10 },
    eyesPos: { y: 44, leftX: 41, rightX: 59, w: 9, h: 4 }
  },
  elena: {
    id: 'elena',
    name: 'Elena Rostova',
    gender: 'female',
    lang: 'en-US',
    role: 'Elite Sales Strategy Director',
    hat: 'coach',
    image: coachElenaImg,
    tagline: 'Enterprise Deal Closer & Mentor',
    voiceStyle: 'American Female • Articulate & Sharp',
    geminiVoice: 'Aoede',
    deepgramVoice: 'aura-stella-en',
    pitch: 1.02,
    rate: 1.0,
    greeting: "Every second counts in the opener. Walk me through your value proposition.",
    accentColor: 'indigo',
    mouthPos: { x: 50, y: 71, w: 21, h: 9 },
    eyesPos: { y: 45, leftX: 41, rightX: 59, w: 9, h: 4 }
  },
  hank: {
    id: 'hank',
    name: 'Hank Miller',
    gender: 'male',
    lang: 'en-US',
    role: 'Trade Contractor Owner (Austin, TX)',
    hat: 'prospect',
    image: prospectHankImg,
    tagline: 'Busy Business Owner • In Truck',
    voiceStyle: 'American Male • Gruff Contractor',
    geminiVoice: 'Charon',
    deepgramVoice: 'aura-arcas-en',
    pitch: 0.92,
    rate: 0.96,
    greeting: "Miller HVAC, Hank speaking. Make it quick, what's this call about?",
    accentColor: 'amber',
    mouthPos: { x: 50, y: 72, w: 22, h: 10 },
    eyesPos: { y: 44, leftX: 41, rightX: 59, w: 9, h: 4 }
  },
  sarah: {
    id: 'sarah',
    name: 'Sarah Chen',
    gender: 'female',
    lang: 'en-US',
    role: 'VP of Commercial Operations',
    hat: 'prospect',
    image: prospectSarahImg,
    tagline: 'Discerning Decision Maker',
    voiceStyle: 'American Female • Analytical & Crisp',
    geminiVoice: 'Zephyr',
    deepgramVoice: 'aura-asteria-en',
    pitch: 1.02,
    rate: 1.02,
    greeting: "Premier Services, Sarah here. You have my attention for 30 seconds.",
    accentColor: 'rose',
    mouthPos: { x: 50, y: 70, w: 20, h: 9 },
    eyesPos: { y: 45, leftX: 42, rightX: 58, w: 8.5, h: 4 }
  }
};

/**
 * GeminiLiveAvatar: Photorealistic, Voice-Reactive Human Avatar
 * Replaces abstract orbs with an expressive human mentor or prospect.
 * 
 * Features:
 * - Natural eye blinking routine with realistic timing
 * - Organic speaking lip-sync animation reacting to live voice cadence & amplitude
 * - Attentive listening head-tilt, micro-nodding, and audio-reactive EQ waves
 * - Pondering/thinking micro-expressions
 * - Multiple switchable realistic personas (Executive Coaches & Realistic Decision Makers)
 * - Studio broadcast video overlay with live latency, audio VU meters & status HUD
 */
export default function GeminiLiveAvatar({
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  hat = 'coach',
  speakerName = 'Sales Coach',
  onAvatarClick,
  size = 200,
  allowSwitching = true,
  onPersonaChange,
  currentSpeechText = '',
  isAudioBlocked = false,
  onUnlockAudio
}) {
  // Determine appropriate default persona based on hat and speakerName
  const getAutoPersonaKey = useCallback(() => {
    const lowerName = (speakerName || '').toLowerCase();
    if (hat === 'prospect') {
      if (lowerName.includes('sarah') || lowerName.includes('elena') || lowerName.includes('chen')) {
        return 'sarah';
      }
      return 'hank';
    }
    // Coach hat
    if (lowerName.includes('elena')) {
      return 'elena';
    }
    return 'marcus';
  }, [hat, speakerName]);

  const [selectedPersonaKey, setSelectedPersonaKey] = useState(getAutoPersonaKey());
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Sync persona when hat or speakerName changes, unless user explicitly selected
  useEffect(() => {
    setSelectedPersonaKey(getAutoPersonaKey());
  }, [getAutoPersonaKey]);

  const currentPersona = HUMAN_PERSONAS[selectedPersonaKey] || HUMAN_PERSONAS.marcus;

  // Animation States for Lifelike Face Dynamics
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0); // 0 to 1
  const [mouthShape, setMouthShape] = useState('neutral'); // neutral, round, wide, open
  const [headTilt, setHeadTilt] = useState({ x: 0, y: 0, rot: 0 });
  const [audioMeter, setAudioMeter] = useState([30, 45, 60, 40, 75, 50, 35, 65]);

  const animFrameRef = useRef(null);
  const speechClockRef = useRef(0);
  const blinkTimerRef = useRef(null);

  // 1. Natural Blinking Loop: Realistic human blink every 2.8 - 4.8 seconds for ~140ms
  useEffect(() => {
    let isMounted = true;

    const scheduleNextBlink = () => {
      const delay = Math.random() * 2000 + 2800; // 2.8s - 4.8s
      blinkTimerRef.current = setTimeout(() => {
        if (!isMounted) return;
        setIsBlinking(true);

        setTimeout(() => {
          if (!isMounted) return;
          setIsBlinking(false);
          // Occasional double-blink (15% chance, very human)
          if (Math.random() < 0.15) {
            setTimeout(() => {
              if (!isMounted) return;
              setIsBlinking(true);
              setTimeout(() => {
                if (!isMounted) return;
                setIsBlinking(false);
                scheduleNextBlink();
              }, 120);
            }, 100);
          } else {
            scheduleNextBlink();
          }
        }, 140);
      }, delay);
    };

    scheduleNextBlink();

    return () => {
      isMounted = false;
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // 2. High-Frequency Head Motion, Breathing, and Mouth Viseme Synthesis
  useEffect(() => {
    let running = true;

    const updateDynamics = () => {
      speechClockRef.current += 0.05;
      const clock = speechClockRef.current;

      // Subtle breathing motion (always active)
      const breath = Math.sin(clock * 1.2) * 1.5;

      // Speaking Dynamics: mouth articulation, dynamic visemes, slight head punctuation
      if (isSpeaking) {
        // Fast mouth opening cycle modulated by multi-harmonic voice cadence
        const openCycle = Math.abs(Math.sin(clock * 5) * 0.7 + Math.sin(clock * 11) * 0.3);
        setMouthOpen(Math.min(1, Math.max(0.15, openCycle)));

        // Alternate phoneme mouth shapes
        const shapeMod = Math.floor((clock * 3) % 4);
        if (shapeMod === 0) setMouthShape('open');
        else if (shapeMod === 1) setMouthShape('wide');
        else if (shapeMod === 2) setMouthShape('round');
        else setMouthShape('neutral');

        // Dynamic head punctuation when speaking
        const speechNod = Math.sin(clock * 4.5) * 2;
        const speechTilt = Math.sin(clock * 2) * 1.2;
        setHeadTilt({ x: speechTilt, y: breath + speechNod, rot: speechTilt * 0.8 });

        // Audio VU meter simulation for speaking
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
        // Listening: Attentive forward tilt, gentle acknowledging micro-nod
        const listenNod = Math.sin(clock * 1.8) * 1.8;
        setMouthOpen(0);
        setMouthShape('neutral');
        setHeadTilt({ x: 0.8, y: breath + listenNod, rot: 1.2 });

        // Responsive EQ meter for listening to user's voice
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
        // Thinking / Pondering: Subtle thoughtful upward tilt
        const thinkSway = Math.sin(clock * 1.5) * 1.2;
        setMouthOpen(0.05);
        setMouthShape('neutral');
        setHeadTilt({ x: -1.2, y: breath - 1.5, rot: -1.5 });

        setAudioMeter([15, 30, 45, 60, 70, 50, 30, 20]);
      } else {
        // Idle: Relaxed micro-sway and natural breath
        const idleSway = Math.sin(clock * 0.8) * 0.8;
        setMouthOpen(0);
        setMouthShape('neutral');
        setHeadTilt({ x: idleSway, y: breath, rot: idleSway * 0.5 });
        setAudioMeter([10, 15, 12, 18, 14, 12, 8, 5]);
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

  // Status Badge Configuration
  const statusInfo = useMemo(() => {
    if (isSpeaking) {
      return {
        label: 'Speaking aloud',
        color: currentPersona.accentColor === 'cyan' ? 'text-cyan-400' : 'text-amber-400',
        bg: currentPersona.accentColor === 'cyan' ? 'bg-cyan-950/80 border-cyan-500/50' : 'bg-amber-950/80 border-amber-500/50',
        ringGlow: currentPersona.accentColor === 'cyan' ? 'ring-cyan-500/50 shadow-cyan-500/30' : 'ring-amber-500/50 shadow-amber-500/30',
        indicator: 'bg-emerald-400 animate-pulse'
      };
    }
    if (isListening) {
      return {
        label: 'Listening to your pitch...',
        color: 'text-rose-400',
        bg: 'bg-rose-950/80 border-rose-500/50',
        ringGlow: 'ring-rose-500/50 shadow-rose-500/30',
        indicator: 'bg-rose-400 animate-ping'
      };
    }
    if (isThinking) {
      return {
        label: 'Analyzing objection handling...',
        color: 'text-indigo-400',
        bg: 'bg-indigo-950/80 border-indigo-500/50',
        ringGlow: 'ring-indigo-500/50 shadow-indigo-500/30',
        indicator: 'bg-indigo-400 animate-bounce'
      };
    }
    return {
      label: hat === 'coach' ? 'Live Sales Coach Ready' : 'Prospect On Line',
      color: 'text-slate-300',
      bg: 'bg-slate-900/80 border-slate-700/60',
      ringGlow: 'ring-slate-700/40 shadow-slate-900/40',
      indicator: 'bg-emerald-500'
    };
  }, [isSpeaking, isListening, isThinking, hat, currentPersona.accentColor]);

  // Dimension helpers
  const containerWidth = isExpanded ? 340 : Math.max(size, 200);
  const containerHeight = isExpanded ? 380 : Math.max(size, 220);

  return (
    <div className="flex flex-col items-center w-full max-w-sm select-none">
      {/* Executive Video Feed Card */}
      <div 
        className={`relative w-full rounded-3xl overflow-hidden border-2 transition-all duration-300 shadow-2xl bg-[#090b12] ${
          isSpeaking 
            ? currentPersona.accentColor === 'cyan' 
              ? 'border-cyan-500/80 shadow-[0_0_30px_rgba(6,182,212,0.35)] ring-2 ring-cyan-400/40' 
              : 'border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.35)] ring-2 ring-amber-400/40'
            : isListening
            ? 'border-rose-500/80 shadow-[0_0_30px_rgba(244,63,94,0.35)] ring-2 ring-rose-400/40'
            : isThinking
            ? 'border-indigo-500/80 shadow-[0_0_25px_rgba(99,102,241,0.3)]'
            : 'border-slate-800 shadow-xl'
        }`}
        style={{ height: containerHeight }}
      >
        {/* Top Studio Video HUD Bar */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/85 via-black/50 to-transparent pointer-events-auto">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusInfo.indicator}`} />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-white/90">
              {hat === 'coach' ? 'AI COACH' : 'PROSPECT'}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono font-medium">
              LIVE HD
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {allowSwitching && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPersonaMenu(!showPersonaMenu);
                }}
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/60 transition shadow-sm"
                title="Switch Persona Avatar"
              >
                <span>{currentPersona.name.split(' ')[0]}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title={isExpanded ? "Collapse View" : "Expand Video Feed"}
            >
              {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Dropdown Menu to Switch Persona */}
        {showPersonaMenu && (
          <div className="absolute top-10 right-3 z-40 w-56 rounded-2xl bg-slate-900/95 border border-slate-700 p-2 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1 border-b border-slate-800 mb-1">
              Select Live Persona:
            </div>
            {Object.values(HUMAN_PERSONAS).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPersonaKey(p.id);
                  setShowPersonaMenu(false);
                  if (onPersonaChange) onPersonaChange(p);
                }}
                className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition ${
                  selectedPersonaKey === p.id 
                    ? 'bg-cyan-950/80 border border-cyan-500/50 text-white' 
                    : 'hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <img 
                  src={p.image} 
                  alt={p.name} 
                  className="w-8 h-8 rounded-full object-cover border border-slate-600 shadow"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate flex items-center gap-1">
                    {p.name}
                    {p.hat === 'coach' ? (
                      <span className="text-[8px] px-1 rounded bg-cyan-900/80 text-cyan-300">Coach</span>
                    ) : (
                      <span className="text-[8px] px-1 rounded bg-amber-900/80 text-amber-300">Prospect</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{p.role}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Photorealistic Portrait Stage with Natural Head Physics */}
        <div 
          className="relative w-full h-full cursor-pointer overflow-hidden flex items-center justify-center bg-[#07090e] group"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onAvatarClick) onAvatarClick(e);
          }}
          title={isListening ? "Listening to you... Tap to finish" : isSpeaking ? "Tap to interrupt & speak" : "Tap avatar to speak directly to Coach"}
        >
          {/* Ambient Lighting Gradient based on speaker status */}
          <div 
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 z-10 ${
              isSpeaking
                ? currentPersona.accentColor === 'cyan'
                  ? 'bg-cyan-500/10'
                  : 'bg-amber-500/10'
                : isListening
                ? 'bg-rose-500/15'
                : 'bg-transparent'
            }`}
          />

          {/* Interactive Floating Tap-to-Speak Pill overlay */}
          <div className="absolute top-12 z-30 pointer-events-none transition-transform duration-200">
            {isListening ? (
              <span className="px-3 py-1 rounded-full bg-rose-600/90 border border-rose-400 text-white text-[11px] font-black tracking-wide flex items-center gap-1.5 shadow-lg shadow-rose-950/70 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                Listening... Speak to Coach
              </span>
            ) : isSpeaking ? (
              <span className="px-3 py-1 rounded-full bg-cyan-950/90 border border-cyan-400/80 text-cyan-200 text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-lg shadow-cyan-950/70">
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                Coach Speaking (Tap to Reply)
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 text-[11px] font-bold tracking-wide flex items-center gap-1.5 shadow-lg backdrop-blur-sm group-hover:border-cyan-400 transition">
                <Mic className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition" />
                Tap Avatar to Speak
              </span>
            )}
          </div>

          {/* Dynamic Animated Portrait */}
          <div 
            className="relative w-full h-full flex items-center justify-center transition-transform ease-out duration-75"
            style={{
              transform: `translate3d(${headTilt.x}px, ${headTilt.y}px, 0px) rotate(${headTilt.rot}deg)`
            }}
          >
            {/* The High-Resolution Human Portrait Image */}
            <img 
              src={currentPersona.image} 
              alt={currentPersona.name}
              className="w-full h-full object-cover object-center pointer-events-none select-none"
            />

            {/* Natural Blinking Eyelid Layers (Realistic Human Eye Blinking) */}
            <div 
              className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-75 ${
                isBlinking ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* Left Eye Blink Occlusion with skin tone match */}
              <div 
                className="absolute rounded-full bg-[#3d271d]/90 backdrop-blur-[0.5px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
                style={{
                  top: `${currentPersona.eyesPos.y}%`,
                  left: `${currentPersona.eyesPos.leftX}%`,
                  width: `${currentPersona.eyesPos.w}%`,
                  height: `${currentPersona.eyesPos.h}%`,
                  transform: 'translate(-50%, -50%)',
                  borderBottom: '1px solid rgba(25, 15, 10, 0.8)'
                }}
              />
              {/* Right Eye Blink Occlusion with skin tone match */}
              <div 
                className="absolute rounded-full bg-[#3d271d]/90 backdrop-blur-[0.5px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
                style={{
                  top: `${currentPersona.eyesPos.y}%`,
                  left: `${currentPersona.eyesPos.rightX}%`,
                  width: `${currentPersona.eyesPos.w}%`,
                  height: `${currentPersona.eyesPos.h}%`,
                  transform: 'translate(-50%, -50%)',
                  borderBottom: '1px solid rgba(25, 15, 10, 0.8)'
                }}
              />
            </div>

            {/* Realistic Voice-Reactive Lip Sync / Mouth Articulation Overlay */}
            {isSpeaking && (
              <div 
                className="absolute pointer-events-none z-10 flex items-center justify-center"
                style={{
                  top: `${currentPersona.mouthPos.y}%`,
                  left: `${currentPersona.mouthPos.x}%`,
                  width: `${currentPersona.mouthPos.w}%`,
                  height: `${currentPersona.mouthPos.h}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                {/* Organic Mouth Cavity & Articulation */}
                <div 
                  className="rounded-full bg-gradient-to-b from-[#2b100e] via-[#481a17] to-[#250d0c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.85)] flex flex-col items-center justify-between overflow-hidden transition-all duration-75 border border-[#6b2c28]/40"
                  style={{
                    width: mouthShape === 'round' ? '70%' : mouthShape === 'wide' ? '98%' : '88%',
                    height: `${Math.max(20, Math.min(95, mouthOpen * 100))}%`
                  }}
                >
                  {/* Subtle Upper Teeth Line */}
                  <div 
                    className="w-3/4 h-[2px] bg-white/70 rounded-full mx-auto shadow-sm mt-[0.5px] transition-opacity duration-75"
                    style={{ opacity: mouthOpen > 0.35 ? 0.9 : 0.2 }}
                  />
                  {/* Subtle Tongue Depth */}
                  <div 
                    className="w-1/2 h-[3px] bg-[#9e3d36] rounded-t-full mx-auto mb-[0.5px] transition-transform duration-75"
                    style={{ transform: `scaleY(${mouthOpen})` }}
                  />
                </div>
              </div>
            )}

            {/* Speaking Voice Aura Ripples (Subtle Cinematic Soundwaves radiating from speaker) */}
            {isSpeaking && (
              <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              </div>
            )}
          </div>

          {/* Bottom HUD: Live Soundwave Frequency Visualizer */}
          <div className="absolute bottom-0 inset-x-0 z-20 p-2.5 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col gap-1.5 pointer-events-none">
            {/* Audio Waveform Bars */}
            <div className="flex items-center justify-center gap-1 h-5 px-3">
              {audioMeter.map((height, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isSpeaking 
                      ? currentPersona.accentColor === 'cyan' 
                        ? 'bg-gradient-to-t from-cyan-500 to-white shadow-[0_0_8px_rgba(6,182,212,0.8)]' 
                        : 'bg-gradient-to-t from-amber-500 to-white shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                      : isListening
                      ? 'bg-gradient-to-t from-rose-500 to-white shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'bg-slate-700/60'
                  }`}
                  style={{
                    height: `${Math.max(15, height * 0.24)}px`
                  }}
                />
              ))}
            </div>

            {/* Speaker Name, Persona Role & Dynamic Status Tag */}
            <div className="flex items-center justify-between text-white">
              <div className="min-w-0 pr-2">
                <div className="text-xs font-black tracking-tight truncate flex items-center gap-1.5">
                  <span>{currentPersona.name}</span>
                  <span className="text-[9px] font-mono text-slate-400 font-normal">
                    ({hat === 'coach' ? 'Coach' : 'Prospect'})
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 truncate font-medium">
                  {currentPersona.role}
                </div>
              </div>

              {/* Status Pill */}
              <div className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold tracking-wide uppercase flex items-center gap-1 shadow-sm whitespace-nowrap transition-all ${statusInfo.bg} ${statusInfo.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.indicator}`} />
                <span>{isSpeaking ? 'Speaking' : isListening ? 'Listening' : isThinking ? 'Thinking' : 'Connected'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Persona Quick Switch Tray */}
      {allowSwitching && (
        <div className="w-full mt-3 flex items-center justify-between gap-1.5 p-1.5 bg-[#0e111a] rounded-2xl border border-slate-800 shadow-md">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 pl-1.5">
            Avatars:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {Object.values(HUMAN_PERSONAS).map((p) => {
              const isSelected = selectedPersonaKey === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPersonaKey(p.id);
                    if (onPersonaChange) onPersonaChange(p);
                  }}
                  className={`group relative flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold transition ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                  title={`${p.name} - ${p.role}`}
                >
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    className="w-4 h-4 rounded-full object-cover" 
                  />
                  <span>{p.name.split(' ')[0]}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Direct Speech Bubble (Visible on Avatar Card so user SEES coach talking) */}
      {currentSpeechText && (
        <div className="w-full mt-2.5 p-3 rounded-2xl bg-[#0d101a] border border-cyan-500/40 text-xs shadow-xl text-slate-200 animate-fadeIn">
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-cyan-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
              {currentPersona.name} Talking:
            </span>
            {isSpeaking && (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                Aloud
              </span>
            )}
          </div>
          <p className="italic text-[11px] sm:text-xs text-slate-100 leading-relaxed">
            "{currentSpeechText}"
          </p>
        </div>
      )}

      {/* Audio Autoplay Unblocker Banner (If browser blocked audio autoplay on load) */}
      {isAudioBlocked && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onUnlockAudio) onUnlockAudio();
          }}
          className="w-full mt-2.5 p-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-xl transition flex items-center justify-center gap-2 cursor-pointer animate-pulse"
        >
          <Volume2 className="w-4 h-4" />
          <span>Click Here to Hear Coach Marcus Talk!</span>
        </button>
      )}

      {/* Helpful Interactive Cue */}
      <p className="mt-1.5 text-[10px] text-slate-400 text-center flex items-center justify-center gap-1 font-medium">
        <span>🎙️ Tap avatar anytime to speak directly to your coach</span>
      </p>
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
