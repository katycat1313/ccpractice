import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import HumanAgent3DAvatar from '../components/HumanAgent3DAvatar';
import DossierDrawerModal from '../components/DossierDrawerModal';
import IframeMicModal from '../components/IframeMicModal';
import { GeminiLiveSession } from '../lib/geminiLiveClient';
import {
  getAllInterviewAgents,
  buildAgentLiveSystemPrompt,
} from '../lib/agentsConfig';
import {
  getCareerDossier,
  formatDossierForPrompt,
} from '../lib/careerDossier';
import {
  getAdaptiveLearningState,
  recordDebriefToAdaptiveEngine,
  buildPressurePromptBlock,
  getPressureDirectivesForMode,
} from '../lib/adaptiveLearning';
import { syncAdaptiveStateToSupabase } from '../lib/supabaseSync';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';

function formatClock(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function VideoInterviewStudioPage() {
  const [mode, setMode] = useState('interview'); // 'interview' | 'agency-pitch'
  const [agents, setAgents] = useState(() => getAllInterviewAgents());
  const [selectedAgentId, setSelectedAgentId] = useState('agent_char_charlie_mwimrybr');
  const [dossier, setDossier] = useState(() => getCareerDossier());
  const [adaptiveState, setAdaptiveState] = useState(() => getAdaptiveLearningState());

  const [callState, setCallState] = useState('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isUserCamOn, setIsUserCamOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [everScreenShared, setEverScreenShared] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);

  const [audioAmplitude, setAudioAmplitude] = useState({ output: 0, input: 0 });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [bargeInCount, setBargeInCount] = useState(0);
  const [transcriptTurns, setTranscriptTurns] = useState([]);
  const [liveAgentCaption, setLiveAgentCaption] = useState('');
  const [liveUserCaption, setLiveUserCaption] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [debriefReport, setDebriefReport] = useState(null);

  const liveSessionRef = useRef(null);
  const userVideoRef = useRef(null);
  const userCamStreamRef = useRef(null);
  const screenVideoRef = useRef(null);
  const screenStreamRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const transcriptEndRef = useRef(null);
  const elapsedRef = useRef(0);
  const turnsRef = useRef([]);

  elapsedRef.current = elapsedSeconds;
  turnsRef.current = transcriptTurns;

  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) || agents[0];

  const activePressureTargets = getPressureDirectivesForMode(mode);
  const isCallActive = ['connecting', 'connected', 'listening', 'speaking', 'thinking'].includes(callState);

  useEffect(() => {
    const refreshAgents = () => setAgents(getAllInterviewAgents());
    window.addEventListener('scriptmaster_agents_updated', refreshAgents);
    return () => window.removeEventListener('scriptmaster_agents_updated', refreshAgents);
  }, []);

  useEffect(() => {
    if (!isCallActive) return undefined;
    const t = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isCallActive]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptTurns, liveAgentCaption, liveUserCaption]);

  useEffect(() => {
    return () => {
      liveSessionRef.current?.stop();
      stopScreenShareInternal();
      stopUserCamInternal();
    };
  }, []);

  function stopUserCamInternal() {
    if (userCamStreamRef.current) {
      userCamStreamRef.current.getTracks().forEach((t) => t.stop());
      userCamStreamRef.current = null;
    }
    if (userVideoRef.current) {
      userVideoRef.current.srcObject = null;
    }
    setIsUserCamOn(false);
  }

  async function toggleUserCam() {
    if (isUserCamOn) {
      stopUserCamInternal();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 320, facingMode: 'user' },
      });
      userCamStreamRef.current = stream;
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
      }
      setIsUserCamOn(true);
    } catch (err) {
      setErrorBanner(err?.message || 'Camera access unavailable in this browser frame.');
    }
  }

  function stopScreenShareInternal() {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
  }

  async function toggleScreenShare() {
    if (isScreenSharing) {
      stopScreenShareInternal();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setErrorBanner('Screen sharing requires opening this studio in a full browser tab.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 5, max: 10 } },
        audio: false,
      });
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      setEverScreenShared(true);
      setErrorBanner('');

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => stopScreenShareInternal();
      }

      if (!captureCanvasRef.current) {
        captureCanvasRef.current = document.createElement('canvas');
      }

      // Stream 1 FPS JPEG snapshots into Gemini Live so the agent sees the shared KRECHET Academy screen
      frameIntervalRef.current = setInterval(() => {
        const vid = screenVideoRef.current;
        const session = liveSessionRef.current;
        if (!vid || !session || vid.readyState < 2) return;
        const canvas = captureCanvasRef.current;
        const targetW = 960;
        const aspect = vid.videoHeight ? vid.videoWidth / vid.videoHeight : 16 / 9;
        canvas.width = targetW;
        canvas.height = Math.round(targetW / aspect);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.68);
        session.sendVideoFrame(jpegDataUrl);
      }, 1000);
    } catch (err) {
      if (err?.name !== 'NotAllowedError') {
        setErrorBanner(err?.message || 'Unable to start screen share. Try opening in a full browser tab.');
      }
    }
  }

  async function startLiveCall() {
    setErrorBanner('');
    setDebriefReport(null);
    setTranscriptTurns([]);
    setLiveAgentCaption('');
    setLiveUserCaption('');
    setElapsedSeconds(0);
    setBargeInCount(0);
    setEverScreenShared(isScreenSharing);

    const dossierPromptBlock = formatDossierForPrompt(dossier);
    const pressurePromptBlock = buildPressurePromptBlock(mode);
    const systemInstruction = buildAgentLiveSystemPrompt({
      agent: selectedAgent,
      mode,
      dossierPromptBlock,
      pressurePromptBlock,
    });

    const openingLine =
      mode === 'agency-pitch'
        ? selectedAgent.openingAgency
        : selectedAgent.openingInterview;

    let pendingUserText = '';

    const session = new GeminiLiveSession({
      voiceName: selectedAgent.voice?.geminiLiveVoice || 'Fenrir',
      systemInstruction,
      initialPrompt: `Start the video call right now by greeting the user naturally in 1–2 sentences along these lines: "${openingLine}"`,
      onStateChange: (st) => setCallState(st),
      onAudioAmplitude: (amp) => setAudioAmplitude(amp),
      onInputTranscript: (_chunk, fullUserText) => {
        pendingUserText = fullUserText;
        setLiveUserCaption(fullUserText);
      },
      onTextToken: (_chunk, fullAgentText) => {
        if (pendingUserText) {
          const captured = pendingUserText;
          pendingUserText = '';
          setLiveUserCaption('');
          setTranscriptTurns((prev) => [
            ...prev,
            { speaker: 'You', text: captured, time: formatClock(elapsedRef.current) },
          ]);
        }
        setLiveAgentCaption(fullAgentText);
      },
      onTurnComplete: (finalAgentText) => {
        if (pendingUserText) {
          const captured = pendingUserText;
          pendingUserText = '';
          setLiveUserCaption('');
          setTranscriptTurns((prev) => [
            ...prev,
            { speaker: 'You', text: captured, time: formatClock(elapsedRef.current) },
          ]);
        }
        if (finalAgentText) {
          setTranscriptTurns((prev) => [
            ...prev,
            {
              speaker: selectedAgent.displayName,
              text: finalAgentText,
              time: formatClock(elapsedRef.current),
            },
          ]);
        }
        setLiveAgentCaption('');
      },
      onInterrupted: ({ count }) => {
        setBargeInCount(count);
        setLiveAgentCaption('');
      },
      onIframeMicBlocked: () => {
        setIsIframeMicModalOpen(true);
      },
      onError: (err) => {
        setErrorBanner(err?.message || 'Gemini Live connection interrupted.');
      },
    });

    liveSessionRef.current = session;
    await session.start();
  }

  async function endCallAndEvaluate() {
    const finalTurns = [...turnsRef.current];
    if (liveUserCaption.trim()) {
      finalTurns.push({ speaker: 'You', text: liveUserCaption.trim(), time: formatClock(elapsedRef.current) });
    }
    if (liveAgentCaption.trim()) {
      finalTurns.push({
        speaker: selectedAgent.displayName,
        text: liveAgentCaption.trim(),
        time: formatClock(elapsedRef.current),
      });
    }

    liveSessionRef.current?.stop();
    liveSessionRef.current = null;
    stopScreenShareInternal();
    setCallState('disconnected');
    setLiveAgentCaption('');
    setLiveUserCaption('');
    setTranscriptTurns(finalTurns);

    const hasUserTurns = finalTurns.some((t) => t.speaker === 'You' && t.text.trim().length > 2);
    if (!hasUserTurns) return;

    setIsEvaluating(true);
    try {
      const res = await fetch('/api/gemini/video-call-debrief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          personaName: selectedAgent.displayName,
          personaRole: selectedAgent.roleTitle,
          durationSeconds: elapsedRef.current,
          transcriptTurns: finalTurns,
          screenShared: everScreenShared,
          bargeInCount,
          careerDossier: dossier,
          previousWeakAreas: activePressureTargets,
        }),
      });
      const debrief = await res.json();
      if (res.ok && debrief) {
        setDebriefReport(debrief);
        const updatedAdaptive = recordDebriefToAdaptiveEngine({
          mode,
          personaName: selectedAgent.displayName,
          durationSeconds: elapsedRef.current,
          debrief,
        });
        setAdaptiveState(updatedAdaptive);
        await syncAdaptiveStateToSupabase(updatedAdaptive, updatedAdaptive.sessions?.[0], debrief);
      }
    } catch (err) {
      setErrorBanner(err?.message || 'Could not generate post-call debrief.');
    } finally {
      setIsEvaluating(false);
    }
  }

  function handleToggleMute() {
    const next = !isMuted;
    setIsMuted(next);
    liveSessionRef.current?.setMuted(next);
  }

  function handleSendChat(e) {
    e.preventDefault();
    const text = chatDraft.trim();
    if (!text || !liveSessionRef.current || !isCallActive) return;
    setTranscriptTurns((prev) => [
      ...prev,
      { speaker: 'You', text, time: formatClock(elapsedSeconds) },
    ]);
    liveSessionRef.current.sendTextMessage(text);
    setChatDraft('');
  }

  return (
    <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col">
      <Navbar />

      <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* Top Studio Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Live Agent Interview &amp; Screen-Share Studio
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
              <span>Gemini 3.8 Live Bidirectional Audio</span>
              <span aria-hidden="true">·</span>
              <span>Instant Barge-In</span>
              <span aria-hidden="true">·</span>
              <span>1 FPS Live Screen-Share Vision</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Mode Segmented Control */}
            <div className="flex items-center gap-1 p-1 bg-[#0d121c] border border-slate-800 rounded-xl">
              <button
                type="button"
                disabled={isCallActive}
                onClick={() => setMode('interview')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'interview'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white disabled:opacity-50'
                }`}
              >
                Tech Interview (Project Proof)
              </button>
              <button
                type="button"
                disabled={isCallActive}
                onClick={() => setMode('agency-pitch')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  mode === 'agency-pitch'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white disabled:opacity-50'
                }`}
              >
                KRECHET Pitch + Screen Share
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsDossierOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0d121c] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>JD, Resume &amp; URLs</span>
            </button>
          </div>
        </div>

        {errorBanner && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/30 text-xs text-rose-200 flex items-center justify-between gap-4">
            <span>{errorBanner}</span>
            <button
              type="button"
              onClick={() => setErrorBanner('')}
              className="text-rose-300 hover:text-white font-medium whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Agent Selector Strip (Charlie, Joey, Katy + Executive Panel) */}
        <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {agents.map((ag) => {
            const selected = ag.id === selectedAgent.id;
            return (
              <button
                key={ag.id}
                type="button"
                disabled={isCallActive}
                onClick={() => setSelectedAgentId(ag.id)}
                className={`text-left p-3 rounded-xl border transition-colors flex items-center gap-3 ${
                  selected
                    ? 'bg-[#111827] border-indigo-500 text-white'
                    : 'bg-[#0d121c] border-slate-800/90 text-slate-300 hover:border-slate-700 disabled:opacity-55'
                }`}
              >
                <div className="w-12 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                  <img
                    src={ag.portraitUrl}
                    alt={ag.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-[50%_18%]"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-sm font-semibold text-white truncate">{ag.displayName}</span>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {ag.voice?.geminiLiveVoice}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{ag.roleTitle}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                    {ag.appearance?.appearanceNotes}
                  </p>
                </div>
              </button>
            );
          })}
        </section>

        {/* Main Studio Grid: 8-Col 3D Video Stage + 4-Col Live Transcript & Adaptive Pressure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: 3D Human Avatar Viewport + Screen Share Split */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="relative w-full aspect-[16/10] min-h-[420px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0b101b]">
              <div className={`w-full h-full grid ${isScreenSharing ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {/* 3D Human Avatar Stage */}
                <div className="relative w-full h-full">
                  <HumanAgent3DAvatar
                    agent={selectedAgent}
                    isSpeaking={callState === 'speaking'}
                    isListening={callState === 'listening'}
                    isThinking={callState === 'thinking' || callState === 'connecting'}
                    audioAmplitude={audioAmplitude}
                  />
                </div>

                {/* Live Shared Screen Preview (KRECHET Academy / Architecture Diagram) */}
                <div className={`${isScreenSharing ? 'block' : 'hidden'} relative w-full h-full bg-black border-l border-slate-800`}>
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-slate-950/90 border border-slate-800 text-[11px] text-slate-200">
                    Screen Share Streaming (1 FPS to {selectedAgent.displayName})
                  </div>
                </div>
              </div>

              {/* Minimal Top-Left Identity Overlay (Solid RGBA — Zero backdrop-blur over WebGL) */}
              <div className="absolute top-4 left-4 z-10 px-3.5 py-2 rounded-xl bg-[#090d16]/90 border border-slate-800/90 pointer-events-none">
                <div className="text-sm font-semibold text-white">
                  {selectedAgent.displayName}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono tabular-nums">
                  <span>{selectedAgent.companyName}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {isCallActive
                      ? `${callState.charAt(0).toUpperCase() + callState.slice(1)} · ${formatClock(elapsedSeconds)}`
                      : 'Ready for video call'}
                  </span>
                </div>
              </div>

              {/* User Webcam Self-View PiP (Bottom-Left when enabled so top-right stays clear) */}
              <div className={`${isUserCamOn ? 'block' : 'hidden'} absolute bottom-20 left-4 z-10 w-36 aspect-video rounded-xl overflow-hidden border border-slate-700 bg-slate-950 shadow-lg`}>
                <video
                  ref={userVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>

              {/* Live Spoken Subtitles Above Bottom Dock */}
              {(liveAgentCaption || liveUserCaption) && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 w-[min(640px,90%)] px-4 py-2.5 rounded-xl bg-[#090d16]/92 border border-slate-800 text-xs text-slate-100 text-center pointer-events-none">
                  <span className="font-semibold text-indigo-300 mr-1.5">
                    {liveAgentCaption ? `${selectedAgent.displayName}:` : 'You:'}
                  </span>
                  <span>{liveAgentCaption || liveUserCaption}</span>
                </div>
              )}

              {/* Collapsible Unified Bottom Control Dock (Zero backdrop-filter over WebGL) */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[94vw]">
                <button
                  type="button"
                  onClick={() => setIsDockCollapsed((c) => !c)}
                  className="mb-1.5 px-2.5 py-1 rounded-md bg-[#090d16]/90 border border-slate-800 text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors whitespace-nowrap"
                >
                  {isDockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{isDockCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
                </button>

                {!isDockCollapsed && (
                  <div className="px-3.5 py-2.5 rounded-2xl bg-[#090d16]/95 border border-slate-800 flex items-center gap-2.5 shadow-2xl">
                    {!isCallActive ? (
                      <button
                        type="button"
                        onClick={startLiveCall}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                      >
                        Start Live Video Call
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={endCallAndEvaluate}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                        <span>End &amp; Debrief</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleToggleMute}
                      disabled={!isCallActive}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                        isMuted
                          ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 disabled:opacity-45'
                      }`}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      <span>{isMuted ? 'Muted' : 'Mic On'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleScreenShare}
                      className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                        isScreenSharing
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <MonitorUp className="w-3.5 h-3.5" />
                      <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleUserCam}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                    >
                      {isUserCamOn ? <Video className="w-3.5 h-3.5 text-indigo-400" /> : <VideoOff className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{isUserCamOn ? 'Cam On' : 'Self Cam'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Adaptive Pressure Focus + Live Transcript & Text Input */}
          <div className="lg:col-span-4 flex flex-col rounded-2xl bg-[#0d121c] border border-slate-800 overflow-hidden min-h-[420px]">
            <div className="p-4 border-b border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Adaptive Weak-Area Pressure</span>
                <span className="text-slate-400 font-mono tabular-nums">
                  Barge-ins: {bargeInCount}
                </span>
              </div>
              {activePressureTargets.length > 0 ? (
                <div className="space-y-1.5">
                  {activePressureTargets.slice(0, 2).map((w) => (
                    <div key={w.key} className="text-xs text-slate-300 flex items-baseline justify-between gap-2">
                      <span className="truncate">{w.label}</span>
                      <span className="font-mono tabular-nums text-amber-300 shrink-0">
                        {w.score}/100
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Baseline session: {selectedAgent.displayName} will probe concrete project metrics and tradeoffs, then adapt to your weak spots on future calls.
                </p>
              )}
            </div>

            {/* Transcript Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[300px] lg:max-h-none">
              {transcriptTurns.length === 0 ? (
                <div className="text-xs text-slate-500 leading-relaxed py-6 text-center">
                  Start the live video call to speak with {selectedAgent.displayName}. Interrupt naturally at any time—or share your screen to walk through KRECHET Academy or an architecture diagram.
                </div>
              ) : (
                transcriptTurns.map((turn, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                      <span className={turn.speaker === 'You' ? 'text-emerald-300 font-sans font-semibold' : 'text-indigo-300 font-sans font-semibold'}>
                        {turn.speaker}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{turn.time}</span>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{turn.text}</p>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Text Message Input Into Live Call */}
            <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                disabled={!isCallActive}
                placeholder={isCallActive ? `Type a note or URL to ${selectedAgent.displayName}...` : 'Start call to speak or type...'}
                className="flex-1 rounded-lg bg-[#080b11] border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isCallActive || !chatDraft.trim()}
                className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Post-Call Adaptive Debrief & Weak-Area Scorecard */}
        {(isEvaluating || debriefReport) && (
          <section className="p-6 rounded-2xl bg-[#0d121c] border border-slate-800 space-y-6">
            {isEvaluating ? (
              <div className="text-sm text-slate-300">
                Evaluating your live transcript with {selectedAgent.displayName} and updating adaptive pressure directives...
              </div>
            ) : debriefReport ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Post-Call Performance &amp; Adaptive Debrief
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-3xl">{debriefReport.summary}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-2xl font-bold text-white">
                        {debriefReport.overallScore}/100
                      </div>
                      <div className="text-xs text-slate-400">Grade {debriefReport.grade}</div>
                    </div>
                    <button
                      type="button"
                      onClick={startLiveCall}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Run Follow-Up Call</span>
                    </button>
                  </div>
                </div>

                {debriefReport.competencies?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {debriefReport.competencies.map((c) => (
                      <div key={c.key} className="p-4 rounded-xl bg-[#080b11] border border-slate-800/90 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-white">{c.label}</span>
                          <span className="font-mono tabular-nums text-indigo-300">{c.score}/100</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{c.feedback}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Learned Weak Areas + Pressure Directives */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white">
                      Weak Areas Queued for Next Session Pressure
                    </h3>
                    {(debriefReport.weakAreas || []).map((w, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#080b11] border border-slate-800/90 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-amber-300">{w.label}</span>
                          <span className="font-mono tabular-nums text-slate-400">{w.score}/100</span>
                        </div>
                        <p className="text-xs text-slate-300">{w.evidence}</p>
                        <p className="text-[11px] text-slate-400">
                          Next Call Pressure: {w.pressureDirective}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Concrete Rewrites */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-white">
                      Stronger Answer &amp; Pitch Rewrites
                    </h3>
                    {(debriefReport.rewrites || []).map((rw, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-[#080b11] border border-slate-800/90 space-y-1.5">
                        <p className="text-xs text-slate-400">Moment: {rw.moment}</p>
                        <p className="text-xs text-emerald-200 leading-relaxed">
                          Stronger framing: {rw.strongerVersion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </section>
        )}

        {/* Recent Adaptive Session History */}
        {adaptiveState.sessions?.length > 0 && (
          <section className="pt-2 space-y-3">
            <h2 className="text-sm font-semibold text-slate-300">
              Recent Video Sessions ({adaptiveState.sessions.length})
            </h2>
            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#0d121c]">
              {adaptiveState.sessions.slice(0, 5).map((s) => (
                <div key={s.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-slate-300">
                    <span className="font-semibold text-white">{s.personaName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{s.mode === 'agency-pitch' ? 'KRECHET Pitch' : 'Tech Interview'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-400 truncate max-w-md">{s.summary}</span>
                  </div>
                  <div className="font-mono tabular-nums text-slate-300 shrink-0">
                    {s.overallScore}/100 · Grade {s.grade}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <DossierDrawerModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        dossier={dossier}
        onDossierChange={(next) => setDossier(next)}
        onAgentsImported={() => setAgents(getAllInterviewAgents())}
      />

      <IframeMicModal
        isOpen={isIframeMicModalOpen}
        onClose={() => setIsIframeMicModalOpen(false)}
      />
    </div>
  );
}
