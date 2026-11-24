import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

/**
 * Photorealistic Live Agent Video Stage
 *
 * Renders the authentic Ultra-Realistic Los Santos character portraits for
 * Charlie, Joey, and Katy with subtle, natural camera breathing, pointer
 * parallax, listening micro-nods, and Gemini Live audio-reactive presence
 * without distorting facial features or using geometric 3D primitives.
 */
export default function HumanAgent3DAvatar({
  agent,
  isSpeaking = false,
  isListening = false,
  isThinking = false,
  audioAmplitude = { output: 0, input: 0 },
  className = '',
}) {
  const stageRef = useRef(null);
  const portraitLayerRef = useRef(null);
  const voiceBarRefs = useRef([]);
  const [imgFailed, setImgFailed] = useState(false);
  const [framingMode, setFramingMode] = useState('closeup'); // 'closeup' | 'full'

  const liveRef = useRef({
    isSpeaking,
    isListening,
    isThinking,
    audioAmplitude,
    pointerX: 0,
    pointerY: 0,
  });

  liveRef.current.isSpeaking = isSpeaking;
  liveRef.current.isListening = isListening;
  liveRef.current.isThinking = isThinking;
  liveRef.current.audioAmplitude = audioAmplitude;

  useEffect(() => {
    setImgFailed(false);
  }, [agent?.id, agent?.portraitUrl]);

  useEffect(() => {
    let rafId = 0;
    let startTs = performance.now();
    let smoothX = 0;
    let smoothY = 0;
    let smoothScale = 1.03;
    let smoothRot = 0;
    let smoothAmp = 0;

    const tick = (now) => {
      const elapsed = (now - startTs) / 1000;
      const st = liveRef.current;
      const outAmp = st.audioAmplitude?.output || 0;
      const inAmp = st.audioAmplitude?.input || 0;

      smoothAmp += (outAmp - smoothAmp) * 0.24;

      // Subtle camera breathing + natural conversational micro-motion
      const breathY = Math.sin(elapsed * 1.65) * 2.2;
      const driftX = Math.sin(elapsed * 0.72) * 1.8 + st.pointerX * 6.0;
      let targetY = breathY + st.pointerY * 4.0;
      let targetScale = 1.035 + Math.sin(elapsed * 1.65) * 0.004;
      let targetRot = Math.sin(elapsed * 0.55) * 0.25;

      if (st.isSpeaking) {
        // Subtle natural vocal cadence lift without warping face proportions
        targetY += Math.sin(elapsed * 5.2) * (1.2 + smoothAmp * 3.8);
        targetScale += smoothAmp * 0.016;
        targetRot += Math.cos(elapsed * 2.8) * 0.35;
      } else if (st.isListening && inAmp > 0.04) {
        // Attentive listening micro-nod
        targetY += Math.sin(elapsed * 4.6) * 2.4;
      } else if (st.isThinking) {
        targetRot += 0.45;
      }

      smoothX += (driftX - smoothX) * 0.08;
      smoothY += (targetY - smoothY) * 0.08;
      smoothScale += (targetScale - smoothScale) * 0.08;
      smoothRot += (targetRot - smoothRot) * 0.08;

      if (portraitLayerRef.current) {
        portraitLayerRef.current.style.transform = `translate3d(${smoothX.toFixed(2)}px, ${smoothY.toFixed(2)}px, 0) scale(${smoothScale.toFixed(4)}) rotate(${smoothRot.toFixed(3)}deg)`;
      }

      // Update live voice equalizer bars when speaking/listening
      const activeLevel = st.isSpeaking ? Math.max(0.15, smoothAmp * 1.5) : st.isListening ? inAmp * 0.9 : 0.06;
      for (let i = 0; i < voiceBarRefs.current.length; i++) {
        const bar = voiceBarRefs.current[i];
        if (!bar) continue;
        const wave = 0.45 + 0.55 * Math.abs(Math.sin(elapsed * (7 + i * 2.3) + i));
        const scaleY = Math.min(1, Math.max(0.14, activeLevel * wave));
        bar.style.transform = `scaleY(${scaleY.toFixed(3)})`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePointerMove = (e) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    liveRef.current.pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    liveRef.current.pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  const handlePointerLeave = () => {
    liveRef.current.pointerX = 0;
    liveRef.current.pointerY = 0;
  };

  const activeImageSrc =
    framingMode === 'full' && agent?.fullRenderUrl
      ? agent.fullRenderUrl
      : agent?.portraitUrl;

  const hasDistinctFullRender =
    Boolean(agent?.fullRenderUrl) && agent.fullRenderUrl !== agent?.portraitUrl;

  return (
    <div
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`relative w-full h-full overflow-hidden bg-[#090d16] select-none ${className}`}
    >
      {!imgFailed && activeImageSrc ? (
        <>
          {/* Ambient Cinema Backdrop Derived From Character Render */}
          <img
            src={activeImageSrc}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover scale-110 opacity-35 blur-2xl pointer-events-none"
          />

          {/* Sharp Photorealistic Character Feed */}
          <div
            ref={portraitLayerRef}
            className="relative w-full h-full flex items-center justify-center will-change-transform"
          >
            <img
              src={activeImageSrc}
              alt={`${agent?.displayName || 'Agent'} live video feed`}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className={
                framingMode === 'full'
                  ? 'w-full h-full object-contain'
                  : 'w-full h-full max-w-[680px] object-cover object-[50%_18%] sm:rounded-xl shadow-2xl'
              }
            />
          </div>

          {/* Measured Contrast Scrim at Bottom for HUD Readability */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-[#090d16] p-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-bold text-white mb-3">
            {(agent?.displayName || 'A').charAt(0)}
          </div>
          <p className="text-sm font-semibold text-white">{agent?.displayName || 'Agent'}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {agent?.appearance?.appearanceNotes || 'Live voice & interview persona ready'}
          </p>
        </div>
      )}

      {/* Optional Close-Up vs Full Render Framing Toggle (e.g. Charlie's full street render) */}
      {hasDistinctFullRender && (
        <button
          type="button"
          onClick={() => setFramingMode((m) => (m === 'closeup' ? 'full' : 'closeup'))}
          className="absolute top-4 right-4 z-10 px-2.5 py-1.5 rounded-lg bg-[#090d16]/85 hover:bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          title="Switch camera framing"
        >
          {framingMode === 'closeup' ? (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Render</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Call Framing</span>
            </>
          )}
        </button>
      )}

      {/* Live Voice Activity Equalizer (Compositor scaleY only — no pulsing dots) */}
      <div className="absolute bottom-4 right-4 z-10 px-2.5 py-1.5 rounded-lg bg-[#090d16]/85 border border-slate-800 flex items-center gap-1 pointer-events-none">
        {[0, 1, 2, 3, 4].map((idx) => (
          <span
            key={idx}
            ref={(el) => {
              voiceBarRefs.current[idx] = el;
            }}
            className={`w-1 h-3.5 rounded-sm origin-bottom transition-colors ${
              isSpeaking
                ? 'bg-indigo-400'
                : isListening
                ? 'bg-emerald-400'
                : 'bg-slate-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
