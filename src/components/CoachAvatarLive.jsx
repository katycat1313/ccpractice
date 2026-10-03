import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  Search, 
  ShieldAlert, 
  ExternalLink, 
  Radio, 
  Send, 
  Zap, 
  Eye, 
  Cpu
} from 'lucide-react';
import { GeminiLiveSession } from '../lib/geminiLiveClient';

const STORAGE_KEY_AVATAR_ENABLED = 'scriptmaster_live_avatar_enabled';

/**
 * CoachAvatarLive: Multimodal Live Coach Marcus with Interactive Visual Canvas
 * & Explicit Low-Cost Audio-Only Mode Toggle.
 */
export default function CoachAvatarLive({
  onStateChange,
  onIframeMicBlocked,
  systemPrompt = "You are Coach Marcus Vance, an aggressive, practical, elite B2B Cold Calling Coach for blue-collar contractors. Be punchy, conversational, and direct.",
  voiceName = 'Fenrir',
  autoConnect = false,
  className = ''
}) {
  // Mode Toggle: true = "Gemini Live + Avatar" (Mode A), false = "Live Voice Only (Save Token Costs)" (Mode B)
  const [isAvatarEnabled, setIsAvatarEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AVATAR_ENABLED);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return true;
  });

  const [sessionState, setSessionState] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'listening' | 'thinking' | 'speaking' | 'error'
  const [isMuted, setIsMuted] = useState(false);
  const [liveTokens, setLiveTokens] = useState('');
  const [groundingSearch, setGroundingSearch] = useState(null);
  const [typedMessage, setTypedMessage] = useState('');
  const [micBlockedInIframe, setMicBlockedInIframe] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const animFrameRef = useRef(null);
  const amplitudeRef = useRef({ output: 0, input: 0, active: 0 });
  const blinkStateRef = useRef({ isBlinking: false, nextBlinkTime: Date.now() + 3000 });

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Persist Avatar Mode Toggle Preference
  const handleToggleAvatarMode = (enable) => {
    setIsAvatarEnabled(enable);
    try {
      localStorage.setItem(STORAGE_KEY_AVATAR_ENABLED, JSON.stringify(enable));
    } catch {
      /* ignore */
    }
    if (sessionRef.current) {
      sessionRef.current.setLowCostMode(!enable);
    }
  };

  // Safe iFrame Mic Block Handler
  const handleMicBlocked = useCallback(() => {
    setMicBlockedInIframe(true);
    if (onIframeMicBlocked) {
      onIframeMicBlocked();
    }
  }, [onIframeMicBlocked]);

  // Initialize or teardown Gemini Live session
  const startLiveSession = useCallback(async () => {
    if (sessionRef.current) {
      sessionRef.current.stop();
    }

    setLiveTokens('');
    setGroundingSearch(null);

    const session = new GeminiLiveSession({
      voiceName,
      systemInstruction: systemPrompt,
      lowCostMode: !isAvatarEnabled,
      enableSearch: true,
      onStateChange: (state) => {
        setSessionState(state);
        if (onStateChange) onStateChange(state);
      },
      onAudioAmplitude: (amps) => {
        amplitudeRef.current = amps;
        setAudioLevel(amps.active);
      },
      onTextToken: (token, fullText) => {
        setLiveTokens(fullText);
      },
      onTurnComplete: () => {
        // Keep last statement visible
      },
      onInterrupted: () => {
        setLiveTokens((prev) => prev ? `${prev} [Interrupted]` : '');
      },
      onGrounding: (metadata) => {
        setGroundingSearch(metadata);
      },
      onIframeMicBlocked: handleMicBlocked,
      onError: (err) => {
        console.warn('Live session error:', err);
      }
    });

    sessionRef.current = session;
    await session.start();
  }, [voiceName, systemPrompt, isAvatarEnabled, onStateChange, handleMicBlocked]);

  const stopLiveSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.stop();
      sessionRef.current = null;
    }
    setSessionState('disconnected');
    amplitudeRef.current = { output: 0, input: 0, active: 0 };
    setAudioLevel(0);
  }, []);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (sessionRef.current) {
      sessionRef.current.setMuted(next);
    }
  };

  const handleSendTypedMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !sessionRef.current) return;
    sessionRef.current.sendTextMessage(typedMessage.trim());
    setTypedMessage('');
  };

  useEffect(() => {
    if (autoConnect) {
      startLiveSession();
    }
    return () => {
      stopLiveSession();
    };
  }, [autoConnect, startLiveSession, stopLiveSession]);

  // =========================================================================
  // INTERACTIVE COACH MARCUS VISUAL CANVAS ENGINE
  // =========================================================================
  useEffect(() => {
    // If low-cost / audio-only mode is active, completely pause canvas animation
    if (!isAvatarEnabled) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.035;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      const amp = amplitudeRef.current.output;
      const micAmp = amplitudeRef.current.input;
      const activeAmp = Math.max(amp, micAmp);

      ctx.clearRect(0, 0, width, height);

      // 1. Dynamic Ambient Aura & Color Field
      const auraGrad = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, 130);
      if (sessionState === 'speaking') {
        auraGrad.addColorStop(0, `rgba(99, 102, 241, ${0.35 + amp * 0.4})`);
        auraGrad.addColorStop(0.6, `rgba(168, 85, 247, ${0.15 + amp * 0.25})`);
        auraGrad.addColorStop(1, 'rgba(11, 15, 25, 0)');
      } else if (sessionState === 'listening') {
        auraGrad.addColorStop(0, `rgba(16, 185, 129, ${0.3 + micAmp * 0.45})`);
        auraGrad.addColorStop(0.6, `rgba(6, 182, 212, ${0.15 + micAmp * 0.2})`);
        auraGrad.addColorStop(1, 'rgba(11, 15, 25, 0)');
      } else if (sessionState === 'thinking') {
        auraGrad.addColorStop(0, `rgba(245, 158, 11, ${0.3 + Math.sin(time * 3) * 0.15})`);
        auraGrad.addColorStop(0.6, 'rgba(217, 119, 6, 0.15)');
        auraGrad.addColorStop(1, 'rgba(11, 15, 25, 0)');
      } else {
        // Idle breathing
        const breathe = Math.sin(time * 1.2) * 0.08;
        auraGrad.addColorStop(0, `rgba(99, 102, 241, ${0.18 + breathe})`);
        auraGrad.addColorStop(0.7, 'rgba(30, 41, 59, 0.15)');
        auraGrad.addColorStop(1, 'rgba(11, 15, 25, 0)');
      }

      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 130, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric Sound Rings / Neural Energy Arcs
      const ringCount = 3;
      for (let i = 1; i <= ringCount; i++) {
        const baseRadius = 65 + i * 22;
        const wave = Math.sin(time * 2 + i) * (3 + activeAmp * 15);
        const radius = Math.max(10, baseRadius + wave);

        ctx.strokeStyle = sessionState === 'speaking'
          ? `rgba(129, 140, 248, ${0.25 + amp * 0.4})`
          : sessionState === 'listening'
          ? `rgba(52, 211, 153, ${0.25 + micAmp * 0.5})`
          : sessionState === 'thinking'
          ? `rgba(251, 191, 36, ${0.3 + (i % 2 === 0 ? 0.2 : 0)})`
          : `rgba(99, 102, 241, 0.12)`;

        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (sessionState === 'thinking') {
          // Segmented orbital arcs rotating in opposite directions
          const startAngle = (time * (i % 2 === 0 ? 1.5 : -1.5) + i);
          ctx.arc(centerX, centerY, radius, startAngle, startAngle + Math.PI * 1.2);
        } else {
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        }
        ctx.stroke();
      }

      // 3. Central Marcus Face Base (Warm charcoal sculpted silhouette)
      ctx.save();
      ctx.translate(centerX, centerY + 6);

      // Shoulders & Collar
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 58, 48, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Collar trim
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-20, 48);
      ctx.lineTo(0, 58);
      ctx.lineTo(20, 48);
      ctx.stroke();

      // Jaw and Head Base
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Hairline / Brow Ridge
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(0, -18, 32, Math.PI, 0, false);
      ctx.fill();

      // Headset band across top
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -4, 38, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // Headset Earpiece & Illuminated Mic Boom
      ctx.fillStyle = '#4f46e5';
      ctx.beginPath();
      ctx.ellipse(36, 2, 7, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mic Boom arm extending toward mouth
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(36, 6);
      ctx.lineTo(16, 22);
      ctx.stroke();

      // Mic Capsule LED (pulses when speech/listening occurs)
      ctx.fillStyle = sessionState === 'speaking' 
        ? '#60a5fa' 
        : sessionState === 'listening' 
        ? '#34d399' 
        : '#818cf8';
      ctx.beginPath();
      ctx.arc(16, 22, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Blinking Logic
      const now = Date.now();
      if (!blinkStateRef.current.isBlinking && now > blinkStateRef.current.nextBlinkTime) {
        blinkStateRef.current.isBlinking = true;
        setTimeout(() => {
          blinkStateRef.current.isBlinking = false;
          blinkStateRef.current.nextBlinkTime = Date.now() + 2500 + Math.random() * 3000;
        }, 140);
      }

      // Eyes
      const eyeY = -4;
      const leftEyeX = -13;
      const rightEyeX = 13;

      if (blinkStateRef.current.isBlinking) {
        // Closed eyelid slit
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftEyeX - 6, eyeY);
        ctx.lineTo(leftEyeX + 6, eyeY);
        ctx.moveTo(rightEyeX - 6, eyeY);
        ctx.lineTo(rightEyeX + 6, eyeY);
        ctx.stroke();
      } else {
        // Open focused mentor eyes
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.ellipse(leftEyeX, eyeY, 6, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(rightEyeX, eyeY, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Iris & Pupil (Confident Cyan/Indigo gaze)
        ctx.fillStyle = sessionState === 'thinking' ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, 2.8, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Eye reflections
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(leftEyeX - 1, eyeY - 1, 1, 0, Math.PI * 2);
        ctx.arc(rightEyeX - 1, eyeY - 1, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Eyebrows (Sharply angled, mentor focus)
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (sessionState === 'speaking') {
        // Dynamic expressive brow movement
        const browShift = Math.sin(time * 3) * 1.5;
        ctx.moveTo(-20, -12 + browShift);
        ctx.lineTo(-7, -10 + browShift);
        ctx.moveTo(7, -10 - browShift);
        ctx.lineTo(20, -12 - browShift);
      } else {
        ctx.moveTo(-20, -12);
        ctx.lineTo(-7, -10);
        ctx.moveTo(7, -10);
        ctx.lineTo(20, -12);
      }
      ctx.stroke();

      // 4. Procedural Mouth & Real-time Lip-Sync (driven by amplitude)
      const mouthY = 18;
      const mouthOpenness = sessionState === 'speaking' 
        ? Math.min(14, 2 + amp * 22 + Math.sin(time * 8) * 3) 
        : 1.5;

      ctx.fillStyle = sessionState === 'speaking' ? '#450a0a' : '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(0, mouthY, 11, Math.max(1.5, mouthOpenness), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      // 5. Soundwave EQ Bars across bottom perimeter
      if (sessionState === 'speaking' || sessionState === 'listening') {
        const barCount = 18;
        const barWidth = 3;
        const totalW = barCount * 6;
        const startX = centerX - totalW / 2;
        ctx.fillStyle = sessionState === 'speaking' ? '#818cf8' : '#34d399';

        for (let b = 0; b < barCount; b++) {
          const barHeight = Math.max(3, activeAmp * 26 * Math.sin((b / barCount) * Math.PI) * (0.6 + Math.sin(time * 6 + b) * 0.4));
          const bx = startX + b * 6;
          const by = height - 26;
          ctx.beginPath();
          ctx.roundRect(bx, by - barHeight / 2, barWidth, barHeight, 2);
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isAvatarEnabled, sessionState]);

  return (
    <div className={`relative bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl p-5 overflow-hidden flex flex-col items-center gap-4 ${className}`}>
      
      {/* =========================================================================
          TOP CORNER EXPLICIT MODE TOGGLE SWITCH:
          Mode A: "Gemini Live + Avatar"
          Mode B: "Live Voice Only (Save Token Costs)"
         ========================================================================= */}
      <div className="w-full flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${sessionState === 'speaking' ? 'text-indigo-400 animate-pulse' : 'text-slate-400'}`} />
          <span className="text-xs font-black uppercase tracking-wider text-slate-200">
            Coach Marcus Live
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
            sessionState === 'speaking'
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse'
              : sessionState === 'listening'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
              : sessionState === 'thinking'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-spin'
              : sessionState === 'connected'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {sessionState}
          </span>
        </div>

        {/* The Explicit Mode Toggle Switch */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => handleToggleAvatarMode(true)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isAvatarEnabled
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Mode A: Full visual canvas animation + live voice"
          >
            <Eye className="w-3 h-3" />
            <span className="hidden sm:inline">Live + Avatar</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleAvatarMode(false)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer ${
              !isAvatarEnabled
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Mode B: Disables canvas rendering; purely low-bandwidth audio & text"
          >
            <Cpu className="w-3 h-3" />
            <span>Voice Only (Save Costs)</span>
          </button>
        </div>
      </div>

      {/* iFrame Microphone Permission Warning Alert */}
      {micBlockedInIframe && isInIframe && (
        <div className="w-full p-3 rounded-2xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Microphone restricted in embedded preview frame.</span>
          </div>
          <a
            href={typeof window !== 'undefined' ? window.location.href : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-1 shrink-0"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* =========================================================================
          AVATAR DISPLAY AREA:
          Mode A: Visual Canvas Render
          Mode B: Low-Cost HUD Display (Canvas Disabled)
         ========================================================================= */}
      <div className="relative flex items-center justify-center my-2">
        {isAvatarEnabled ? (
          <div className="relative flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={260}
              height={260}
              className="rounded-full shadow-2xl transition-all"
            />
            {/* Subtle Live Badge */}
            <div className="absolute bottom-2 px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-[10px] font-bold text-slate-300 backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Gemini 2.0 Flash Live</span>
            </div>
          </div>
        ) : (
          /* Mode B: Low-Cost Audio-Only Mode HUD */
          <div className="w-64 h-56 rounded-3xl bg-slate-950 border border-emerald-500/30 p-5 flex flex-col items-center justify-between text-center shadow-xl">
            <div className="w-full flex items-center justify-between text-[10px] font-bold text-emerald-400">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" /> LOW-COST MODE
              </span>
              <span className="text-slate-400">Canvas 0 Tokens</span>
            </div>

            <div className="my-auto flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full border flex items-center justify-center transition-all ${
                sessionState === 'speaking'
                  ? 'bg-indigo-600/20 border-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] scale-105'
                  : sessionState === 'listening'
                  ? 'bg-emerald-600/20 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-105'
                  : 'bg-slate-900 border-slate-700'
              }`}>
                {sessionState === 'speaking' ? (
                  <Volume2 className="w-9 h-9 text-indigo-400 animate-pulse" />
                ) : (
                  <Mic className="w-9 h-9 text-emerald-400 animate-pulse" />
                )}
              </div>
              <span className="text-xs font-black uppercase text-slate-200 mt-2.5">
                {sessionState === 'speaking' ? 'Coach Speaking (24kHz)' : sessionState === 'listening' ? 'Listening (16kHz PCM)' : 'Voice Connected'}
              </span>
            </div>

            {/* Low-cost acoustic level bar */}
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-75"
                style={{ width: `${Math.min(100, audioLevel * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Live Transcript / Speech Tokens Stream */}
      {liveTokens && (
        <div className="w-full max-w-md p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 leading-relaxed max-h-24 overflow-y-auto animate-fadeIn">
          <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider block mb-1">
            Coach Marcus (Live Tokens):
          </span>
          <p className="whitespace-pre-wrap">{liveTokens}</p>
        </div>
      )}

      {/* Grounding Search Indicator (when Gemini Live uses Google Search tool) */}
      {groundingSearch && (
        <div className="w-full max-w-md p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-[11px] text-cyan-200 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-spin" />
          <span>Market data referenced via Google Search grounding.</span>
        </div>
      )}

      {/* =========================================================================
          CONTROLS: Start/Stop Live Session, Mic Mute, & Simultaneous Chat Input
         ========================================================================= */}
      <div className="w-full max-w-md flex flex-col gap-2.5">
        <div className="flex items-center justify-center gap-3">
          {sessionState === 'disconnected' || sessionState === 'error' ? (
            <button
              type="button"
              onClick={startLiveSession}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Connect Gemini Live Session</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-3 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                  isMuted 
                    ? 'bg-rose-600/20 border-rose-500 text-rose-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white'
                }`}
                title={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={stopLiveSession}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Radio className="w-4 h-4" />
                <span>Disconnect Live Session</span>
              </button>
            </>
          )}
        </div>

        {/* Typed Chat Input into active Live Session */}
        {sessionState !== 'disconnected' && sessionState !== 'error' && (
          <form onSubmit={handleSendTypedMessage} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              placeholder="Type message directly to Marcus in live session..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!typedMessage.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

    </div>
  );
}

CoachAvatarLive.propTypes = {
  onStateChange: PropTypes.func,
  onIframeMicBlocked: PropTypes.func,
  systemPrompt: PropTypes.string,
  voiceName: PropTypes.string,
  autoConnect: PropTypes.bool,
  className: PropTypes.string
};
