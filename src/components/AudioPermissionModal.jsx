import React, { useState, useEffect } from 'react';
import { Mic, Volume2, CheckCircle2, AlertTriangle, Play, Sparkles } from 'lucide-react';

export default function AudioPermissionModal({ onAudioReady }) {
  const [isOpen, setIsOpen] = useState(false);
  const [micStatus, setMicStatus] = useState('pending'); // 'pending' | 'granted' | 'denied'
  const [audioTested, setAudioTested] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Check if permission was already granted previously
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          setMicStatus('granted');
        } else if (permissionStatus.state === 'denied') {
          setMicStatus('denied');
          setIsOpen(true);
        } else {
          setIsOpen(true);
        }
      }).catch(() => {
        setIsOpen(true);
      });
    } else {
      setIsOpen(true);
    }
  }, []);

  const handleActivateAudioAndMic = async () => {
    setErrorMessage('');

    // 1. Force SpeechSynthesis wake up (Chrome bug workaround)
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      }
    } catch (_) {}

    // 2. Play Web Audio tone to unlock browser autoplay policy
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (_) {}

    // 3. Request Microphone Access via standard getUserMedia
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone input. Please type instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Keep stream tracks active or stop them after getting permission
      stream.getTracks().forEach(t => t.stop());
      setMicStatus('granted');
      setAudioTested(true);

      // 4. Test Speech Synthesis immediately with coach's welcome greeting
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
        const name = user.name ? user.name.split(' ')[0] : 'there';
        const greeting = `Hey ${name}! Welcome to ScriptMaster. I'm your Cut-the-BS Sales Coach, and I'm ready to get started with you. What are your personal goals, and what do you want to get out of this app? Let's calibrate your roadmap and run a couple test calls to gauge your baseline level coming in.`;
        const utter = new SpeechSynthesisUtterance(greeting);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        window._persistentUtterance = utter;
        window.speechSynthesis.speak(utter);
      }

      if (onAudioReady) onAudioReady();

      setTimeout(() => {
        setIsOpen(false);
      }, 1500);

    } catch (err) {
      console.warn('Microphone activation notice:', err);
      setMicStatus('denied');
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied by browser settings. Please click the lock/camera icon in your Chrome address bar to Allow microphone.'
          : `Audio Error: ${err.message || 'Unable to access microphone'}`
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0b0d14] border-2 border-indigo-500/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(99,102,241,0.35)] text-white space-y-5">
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Mic className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Enable Voice & Microphone</h2>
            <p className="text-xs text-slate-400">Required to speak & hear the AI prospect in calls</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-[#11131c] p-3.5 rounded-2xl border border-slate-800">
          Chrome requires you to explicitly click <strong>"Allow"</strong> once so the web app can use your microphone and play the simulated prospect's voice out loud.
        </p>

        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {micStatus === 'granted' && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-700 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Microphone & Voice Audio Activated! Entering arena...</span>
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleActivateAudioAndMic}
            className="w-full py-4 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(16,185,129,0.5)] transition transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 text-slate-950 fill-current" />
            ALLOW MICROPHONE & ACTIVATE VOICE NOW
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full py-2.5 px-4 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            I'll use text input only (Skip for now)
          </button>
        </div>

      </div>
    </div>
  );
}
