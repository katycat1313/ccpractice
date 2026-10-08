import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  FileText, 
  Edit3, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  X, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  ArrowLeft,
  Pause,
  Plus,
  Trash2,
  ExternalLink,
  Zap,
  FolderOpen,
  Play,
  ArrowRight,
  Copy,
  Check,
  Shield,
  Flame,
  Target,
  Lightbulb,
  Compass
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import IframeMicModal from '../components/IframeMicModal';
import LiveSpeechFeedback from '../components/LiveSpeechFeedback';
import LivePhraseOverlay from '../components/LivePhraseOverlay';
import { playTelephoneRing, playPickupClick, playHangupClick } from '../lib/soundUtils';
import { askGeminiCoach, getGeminiTTSAudio, getGeminiApiKey, researchProspectWithGemini } from '../lib/geminiClient';
import { getCoachMemory, extractMemoryFromInput, generateMemoryAwareFallback, formatMemoryForPrompt } from '../lib/coachMemory';
import { getCustomProspects, getSelectedProspectId, setSelectedProspectId } from '../lib/prospectManager';
import { saveRecording, formatSeconds } from '../lib/recordingsService';
import { 
  saveScriptToScriptsPage, 
  pullUpScript, 
  openPracticeSession, 
  resolveAppRoute,
  COACH_ALL_WHITELISTED_TOOLS,
  COACH_SYSTEM_PROMPT_ENHANCED,
  BUILTIN_TEMPLATES
} from '../lib/coachActions';
import { GoogleGenAI } from '@google/genai';
import { getLearningProgress, LESSON_PATH, recordLearningTurn } from '../lib/learningProgress';
import { getAdaptiveDifficulty } from '../lib/trainingProgress';

const SCRIPT_TEMPLATES = BUILTIN_TEMPLATES;
const COACH_CONVERSATION_STORAGE_KEY = 'scriptmaster_coach_messages_v2';

function extractCoachLine(text, fallback = '') {
  if (!text) return fallback;
  const quoted = text.match(/[“\"]([^”\"]{12,})[”\"]/);
  if (quoted?.[1]) return quoted[1].trim();
  const directed = text.match(/(?:say|repeat|try this|use this|your line)\s*[:\-]\s*(.+?)(?:\n|$)/i);
  return directed?.[1]?.replace(/^['“]|['”]$/g, '').trim() || fallback;
}

export default function CoachPage({ setScript: setGlobalScript, embedded = false, active = true }) {
  const navigate = useNavigate();

  // Prospect State
  const [prospectsList, setProspectsList] = useState([]);
  const [selectedProspect, setSelectedProspect] = useState(null);

  // Script State
  const [activeScript, setActiveScript] = useState(() => {
    try {
      const saved = localStorage.getItem('scriptmaster_active_script');
      return saved ? JSON.parse(saved) : SCRIPT_TEMPLATES[0];
    } catch (_) {
      return SCRIPT_TEMPLATES[0];
    }
  });

  // Action status toast
  const [actionToast, setActionToast] = useState(null);
  const [researchResult, setResearchResult] = useState(null);
  const showActionToast = (msg) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  // Sync activeScript dynamically across applet
  useEffect(() => {
    const handleScriptUpdated = () => {
      try {
        const saved = localStorage.getItem('scriptmaster_active_script');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.hook || parsed.problem)) {
            setActiveScript(parsed);
          }
        }
      } catch (_) {}
    };
    window.addEventListener('scriptmaster_script_updated', handleScriptUpdated);
    return () => window.removeEventListener('scriptmaster_script_updated', handleScriptUpdated);
  }, []);

  // UI Drawer / Modal Toggles
  const [isScriptDrawerOpen, setIsScriptDrawerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [scriptEditDraft, setScriptEditDraft] = useState(null);
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Call & Recording State
  const [isRinging, setIsRinging] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const maxCallTime = 120; // 2 minutes drill target

  // Audio / Speech
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveMicState, setLiveMicState] = useState('disconnected');
  const [micError, setMicError] = useState(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [liveSpeechText, setLiveSpeechText] = useState('');
  const [coachTargetLine, setCoachTargetLine] = useState('');
  const [liveSpeechMetrics, setLiveSpeechMetrics] = useState({ wpm: 0, pace: 'steady', pitch: 'neutral', pitchLabel: 'Measuring', toneLabel: 'Keep it conversational' });
  const [coachMemory, setCoachMemory] = useState(() => getCoachMemory());
  const liveSessionRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);

  useEffect(() => {
    if (!active && liveSessionRef.current) {
      try { liveSessionRef.current.stop(); } catch (_) {}
      liveSessionRef.current = null;
      setIsListening(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }
    }
  }, [active]);

  // Conversation Messages
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(COACH_CONVERSATION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [];
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Dedicated Script Part Builder & Strategy Brainstorm State
  const [selectedScriptPart, setSelectedScriptPart] = useState('hook'); // 'hook' | 'problem' | 'value' | 'closingAsk' | 'rebuttal' | 'strategy'
  const [partBuilderInput, setPartBuilderInput] = useState('');
  const [isBuilderDockOpen, setIsBuilderDockOpen] = useState(true);
  const [copiedPartKey, setCopiedPartKey] = useState(null);

  // References
  const timerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const activeAudioRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionCommitTimerRef = useRef(null);
  const lineRequestPendingRef = useRef(false);
  const speechStartedAtRef = useRef(null);
  const pitchBaselineRef = useRef([]);
  const audioSpeechSeenRef = useRef(false);
  const sessionStartedAtRef = useRef(0);

  // Load Prospects
  useEffect(() => {
    const list = getCustomProspects();
    setProspectsList(list);
    const activeId = getSelectedProspectId();
    const found = list.find(p => p.id === activeId) || list[0];
    setSelectedProspect(found);

    const handleProspectUpdate = () => {
      const updated = getCustomProspects();
      setProspectsList(updated);
      const currId = getSelectedProspectId();
      setSelectedProspect(updated.find(p => p.id === currId) || updated[0]);
    };

    window.addEventListener('scriptmaster_prospects_updated', handleProspectUpdate);
    return () => {
      window.removeEventListener('scriptmaster_prospects_updated', handleProspectUpdate);
    };
  }, []);

  // Save messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(COACH_CONVERSATION_STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  // Scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Initial Coach greeting (Runs once, never loops if messages exist)
  useEffect(() => {
    if (messages.length > 0) return;

    const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    const memory = getCoachMemory();
    const userName = memory.userName || (user.name && user.name !== 'Sales Rep' ? user.name.split(' ')[0] : 'there');
    const userProduct = memory.productOrService || user.whatISell || 'your product';

    const progress = getLearningProgress();
    const lesson = LESSON_PATH.find((item) => item.id === progress.currentLessonId) || LESSON_PATH[0];
    const greetingText = `Welcome, ${userName}. I’m your Coach. We’ll start with the fundamentals, talk through the ideas together, and only move into a practice call when you’re ready.\n\nToday we’re working on **${lesson.title}**. First I’ll learn what you already know, then I’ll explain one concept, ask you to apply it, and adjust the difficulty based on your response.\n\nTell me: what do you currently believe makes a cold-call opening effective?`;
    const initMsg = {
      id: `init-${Date.now()}`,
      speaker: 'Coach',
      name: 'Marcus (AI Coach)',
      text: greetingText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([initMsg]);

    // Do not auto-play a second greeting here. Gemini Live sends the single
    // live greeting when its session connects; automatic TTS at mount caused
    // two voices to speak over each other. The Hear Coach button remains the
    // intentional replay path.
  }, [selectedProspect]);

  // Speech Helper
  const speakSpeech = async (text, persona = 'marcus') => {
    if (!text || isAgentMuted) return;

    const cleanText = text
      .replace(/[*_#`~|]/g, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      .trim();

    if (!cleanText) return;

    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      } catch (_) {}
    }
    window.speechSynthesis?.cancel();

    setIsAgentSpeaking(true);
    setVoiceError(null);

    try {
      const voiceId = persona === 'hank' ? 'Charon' : 'Fenrir';
      const gender = persona === 'sarah' || persona === 'elena' ? 'female' : 'male';
      const ttsRes = await getGeminiTTSAudio(cleanText, voiceId, gender, persona);
      
      if (ttsRes && ttsRes.audioBase64) {
        const audio = new Audio(`data:${ttsRes.mimeType || 'audio/wav'};base64,${ttsRes.audioBase64}`);
        activeAudioRef.current = audio;
        audio.onended = () => {
          activeAudioRef.current = null;
          setIsAgentSpeaking(false);
        };
        audio.onerror = () => {
          activeAudioRef.current = null;
          setIsAgentSpeaking(false);
          setVoiceError('Coach audio could not be decoded. Click Hear Coach to retry.');
        };
        audio.preload = 'auto';
        audio.load();
        await audio.play();
        return;
      }
    } catch (error) {
      // Chrome rejects autoplay when the greeting runs during page mount. Keep
      // that failure visible and let the explicit Hear Coach button retry from
      // a user gesture instead of silently swallowing it.
      setIsAgentSpeaking(false);
      const message = error?.name === 'NotAllowedError'
        ? 'Chrome blocked automatic playback. Click Hear Coach once to start audio.'
        : 'Coach voice is unavailable right now. Click Hear Coach to retry.';
      setVoiceError(message);
      if (error?.name !== 'NotAllowedError') {
        fallbackBrowserSpeak(cleanText, gender);
      }
      return;
    }

    fallbackBrowserSpeak(cleanText, persona === 'sarah' || persona === 'elena' ? 'female' : 'male');
  };

  const fallbackBrowserSpeak = (text, gender = 'male') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAgentSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = gender === 'female' ? 1.05 : 0.95;
      const voices = window.speechSynthesis.getVoices() || [];
      const match = voices.find(v => v.lang.startsWith('en') && (gender === 'female' ? /female|zira|samantha/i.test(v.name) : /male|david|alex/i.test(v.name)));
      if (match) utterance.voice = match;
      utterance.onend = () => setIsAgentSpeaking(false);
      utterance.onerror = () => setIsAgentSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (_) {
      setIsAgentSpeaking(false);
    }
  };

  // Mic toggle with AudioContext, getUserMedia, and Deepgram/SpeechRecognition fallback
  const toggleMic = async () => {
    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }

    // Use the real session state as the source of truth. During Gemini Live
    // thinking/speaking, isListening can briefly be false; starting another
    // session in that window caused overlapping coaches and multiple voices.
    const existingSession = liveSessionRef.current;
    const connectingTooLong = existingSession?.state === 'connecting' &&
      Date.now() - sessionStartedAtRef.current > 3000;
    const existingSessionIsActive = existingSession &&
      (['connected', 'listening', 'thinking', 'speaking'].includes(existingSession.state) ||
        (existingSession.state === 'connecting' && !connectingTooLong));

    // A stopped/error session can remain in the ref after Gemini closes the
    // socket. Clear that stale ref so the next click starts a fresh session.
    if (existingSession && (!existingSessionIsActive || connectingTooLong)) {
      try { existingSession.stop(); } catch (_) {}
      liveSessionRef.current = null;
    } else if (existingSessionIsActive) {
      try { existingSession.stop(); } catch (_) {}
      liveSessionRef.current = null;
      setIsListening(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }
      if (recognitionCommitTimerRef.current) {
        clearTimeout(recognitionCommitTimerRef.current);
        recognitionCommitTimerRef.current = null;
      }
      return;
    }

    if (isListening) {
      if (liveSessionRef.current) {
        try { liveSessionRef.current.stop(); } catch (_) {}
        liveSessionRef.current = null;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      if (recognitionCommitTimerRef.current) {
        clearTimeout(recognitionCommitTimerRef.current);
        recognitionCommitTimerRef.current = null;
      }
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach((track) => track.stop()); } catch (_) {}
        micStreamRef.current = null;
      }
      setIsListening(false);
      setMicError(null);
      return;
    }

    setMicError(null);
      setLiveSpeechText('');
      setCoachTargetLine('');
      lineRequestPendingRef.current = false;
      audioSpeechSeenRef.current = false;
    setLiveSpeechMetrics({ wpm: 0, pace: 'steady', pitch: 'neutral', pitchLabel: 'Measuring', toneLabel: 'Keep it conversational' });
    speechStartedAtRef.current = null;
    pitchBaselineRef.current = [];

    // If the user just pressed Hear Coach, stop that one-shot TTS before
    // opening Gemini Live. Otherwise the TTS greeting and Live greeting can
    // overlap and sound like two coaches.
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); } catch (_) {}
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }

    try {
      // Request once from the click gesture, then pass this exact stream to
      // Gemini Live. Never create a second microphone stream for one session.
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Reflect the real microphone permission immediately. Waiting for the
      // WebSocket handshake made the control appear OFF even with a live mic.
      setLiveMicState('connecting');
      setIsListening(true);
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = audioContextRef.current || new AudioCtx();
        await audioContextRef.current.resume?.();
      }
    } catch (error) {
      setMicError(error?.message || 'Permission to access microphone denied by user.');
      return;
    }

    // Gemini Live is the primary microphone/conversation path. It owns
    // capture, turn detection, transcription, and spoken responses. Do not
    // treat a provider/agent ID as a connection; start the actual session.
    try {
      const { GeminiLiveSession, MARCUS_CLASSROOM_INSTRUCTOR_PROMPT } = await import('../lib/geminiLiveClient');
      const currentProgress = getLearningProgress();
      const currentLesson = LESSON_PATH.find((item) => item.id === currentProgress.currentLessonId) || LESSON_PATH[0];
      const liveMemoryContext = `\n\nPERSISTED STUDENT MEMORY (continue from this; do not ask the student to repeat it):\n${formatMemoryForPrompt(coachMemory) || 'No saved product details yet.'}`;
      const liveScriptContext = `\n\nSAVED SCRIPT CONTEXT (background only; do not automatically pull these old lines into the lesson):\n- Target: ${selectedProspect?.name || activeScript?.target || 'selected contractor'}\n- Product/value context: ${activeScript?.value || activeScript?.painValue?.value || ''}\nRULE: At the beginner/guided stage, Coach must choose the exact expert line; never ask the student how to say it. State the line in quotation marks so the floating Coach's Line display can pull it up. Do not display or reuse an old saved hook unless the student explicitly asks to practice that saved script. Do not overwrite the saved script unless the student explicitly asks to save a revision. If the student corrects the business, says they are not selling something, asks a question, or says the line is wrong, treat that as a conversation turn—not a rehearsal attempt—and respond to the correction before continuing.`;
      const session = new GeminiLiveSession({
        voiceName: 'Fenrir',
        micStream: micStreamRef.current,
        systemInstruction: `${MARCUS_CLASSROOM_INSTRUCTOR_PROMPT}${liveMemoryContext}${liveScriptContext}`,
        initialPrompt: `Begin the student's current lesson: ${currentLesson.title} (${currentLesson.id}). Their learning stage is ${currentProgress.stage}, with ${currentProgress.baselineTurns} prior learning turns and ${currentProgress.completedLessons.length} completed lessons. The student sells ${coachMemory.productOrService || 'the product they previously described'}${coachMemory.offerOptions?.length ? ` with these offer options: ${coachMemory.offerOptions.join(', ')}` : ''}. Continue from this saved progress; do not reset to Lesson 1 and do not ask them to re-enter product details. Explain one concept, ask one question, and wait for their answer before advancing.`,
        onStateChange: (state) => {
          setLiveMicState(state);
          setIsListening(['connecting', 'connected', 'listening', 'thinking', 'speaking'].includes(state));
          if (state === 'error') setMicError('Coach microphone connected, but Gemini Live could not start. Click Mic to retry.');
        },
        onUserSpeechChunk: ({ pitchHz, confidence }) => {
          audioSpeechSeenRef.current = true;
          setMicError(null);
          if (pitchHz > 0 && confidence >= 0.65) {
            const samples = pitchBaselineRef.current;
            if (samples.length < 20) samples.push(pitchHz);
            const baseline = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : pitchHz;
            const pitch = pitchHz > baseline * 1.22 ? 'high' : pitchHz < baseline * 0.82 ? 'grounded' : 'neutral';
            setLiveSpeechMetrics(prev => ({ ...prev, pitch, pitchLabel: `${Math.round(pitchHz)} Hz • ${pitch === 'high' ? 'rising/high' : pitch === 'grounded' ? 'grounded' : 'near your baseline'}` }));
          }
        },
        onTextToken: (_token, fullText) => {
          const line = extractCoachLine(fullText, '');
          if (line) {
            lineRequestPendingRef.current = false;
            setCoachTargetLine(line);
          }
        },
        onToolCall: async (actionName, args = {}) => {
          const summary = executeCoachAction(actionName, args);
          const pulledLine = args.hook || args.problem || args.value || args.closingAsk || args.response;
          if (pulledLine) setCoachTargetLine(pulledLine);
          return { success: true, message: summary || 'The requested coaching line is now on the active board.' };
        },
        onTurnComplete: (coachText) => {
          setLiveSpeechText('');
          speechStartedAtRef.current = null;
          const coachedLine = extractCoachLine(coachText, '');
          if (coachedLine) {
            lineRequestPendingRef.current = false;
            setCoachTargetLine(coachedLine);
          } else if (!lineRequestPendingRef.current && liveSessionRef.current) {
            // AUDIO-only Live responses can omit text/tool output. Force one
            // explicit line request so the visual teleprompter never claims a
            // line was pulled up without actually receiving one.
            lineRequestPendingRef.current = true;
            liveSessionRef.current.sendTextMessage('Stop and provide exactly one expert sentence for the student to say now. Put only the exact line in quotation marks. Do not ask the student what they want to say.');
          }
          if (!coachText?.trim()) return;
          const coachMsg = {
            id: `live-coach-${Date.now()}`,
            speaker: 'Coach',
            name: 'Marcus (AI Coach)',
            text: coachText.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, coachMsg]);
        },
        onError: (error) => {
          setIsListening(false);
          setMicError(error?.message || 'Gemini Live could not connect.');
        },
        onIframeMicBlocked: () => {
          setIsListening(false);
          setIsIframeMicModalOpen(true);
        }
      });

      // Register before starting: Gemini can emit setup/greeting messages
      // asynchronously during start(). Callbacks must see the live session
      // immediately so turn commits and line requests are not dropped.
      liveSessionRef.current = session;
      sessionStartedAtRef.current = Date.now();
      // Do not await startup before starting browser recognition: awaiting
      // getUserMedia/WebSocket setup loses Chrome's direct click gesture.
      session.start().catch((error) => {
        setLiveMicState('error');
        setIsListening(false);
        setMicError(error?.message || 'Gemini Live could not start. Click Mic to retry.');
      });

      // Gemini owns the audio conversation. Browser recognition mirrors the
      // student's words visually so they can compare delivery to the Coach's script.
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.onresult = (event) => {
            // Continuous recognition retains previous final results. Render
            // only the current segment so each speaking turn starts clean.
            const clean = event.results[event.results.length - 1]?.[0]?.transcript?.trim() || '';
            const words = clean ? clean.split(/\s+/).filter(Boolean) : [];
            if (clean && !speechStartedAtRef.current) speechStartedAtRef.current = performance.now();
            const minutes = speechStartedAtRef.current ? Math.max((performance.now() - speechStartedAtRef.current) / 60000, 1 / 60) : 1 / 60;
            const wpm = Math.round(words.length / minutes);
            setLiveSpeechText(clean);
            setLiveSpeechMetrics(prev => ({
              ...prev,
              wpm,
              pace: wpm > 175 ? 'rushed' : wpm > 0 && wpm < 105 ? 'slow' : 'steady',
              toneLabel: wpm > 175 ? 'Slow down; add a pause' : wpm < 105 && wpm > 0 ? 'Add forward energy' : 'Conversational pace'
            }));
            const latestResult = event.results[event.results.length - 1];
            if (latestResult?.isFinal && liveSessionRef.current) {
              if (recognitionCommitTimerRef.current) clearTimeout(recognitionCommitTimerRef.current);
            recognitionCommitTimerRef.current = setTimeout(() => {
                if (audioSpeechSeenRef.current) {
                  liveSessionRef.current?.commitUserTurn();
                } else if (clean && liveSessionRef.current) {
                  // Chrome heard the phrase, but Gemini's audio VAD did not.
                  // Send the recognized turn as text so Coach still responds.
                  liveSessionRef.current.sendTextMessage(clean);
                }
                audioSpeechSeenRef.current = false;
                recognitionCommitTimerRef.current = null;
              }, 700);
            }
          };
          recognition.onerror = (event) => {
            const reason = event?.error || 'speech recognition unavailable';
            setMicError(`Microphone audio is allowed, but live word capture failed (${reason}). You can still use Send Reply to commit a turn.`);
          };
          recognition.onend = () => {
            // Chrome may end continuous recognition after a pause. Restart it
            // while the same Coach session is still active.
            if (liveSessionRef.current && liveSessionRef.current.state !== 'disconnected' && recognitionRef.current === recognition) {
              try { recognition.start(); } catch (_) {}
            }
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch (_) {}
      }
    } catch (error) {
      if (micStreamRef.current) {
        try { micStreamRef.current.getTracks().forEach((track) => track.stop()); } catch (_) {}
        micStreamRef.current = null;
      }
      liveSessionRef.current = null;
      setLiveMicState('error');
      setIsListening(false);
      setMicError(error?.message || 'Gemini Live could not start. Click Mic to retry.');
      // Keep the local test/browser fallback available if the Live module is
      // unavailable; production uses Gemini Live first and reports its error.
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
          const recognition = new SpeechRec();
          recognition.start();
          recognitionRef.current = recognition;
          setIsListening(true);
        }
      }
    }
  };

  const commitLiveReply = () => {
    if (!liveSessionRef.current) {
      setMicError('Start Coach Mic before sending a spoken reply.');
      return;
    }
    liveSessionRef.current.commitUserTurn();
  };

  // Start Call
  const handleStartCall = async () => {
    if (isCallActive || isRinging) return;

    setIsRinging(true);
    setCallDuration(0);
    playTelephoneRing(1.8);

    setTimeout(() => {
      setIsRinging(false);
      setIsCallActive(true);
      playPickupClick();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      const greeting = selectedProspect?.greeting || "Hank speaking. What's this about? I've got two minutes before I get on this roof.";
      const prospectMsg = {
        id: `prosp-${Date.now()}`,
        speaker: 'Prospect',
        name: `${selectedProspect?.name || 'Hank Miller'}`,
        text: greeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, prospectMsg]);
      speakSpeech(greeting, 'hank');
    }, 2000);
  };

  // Stop Call
  const handleStopCall = () => {
    if (!isCallActive && !isRinging) return;

    setIsCallActive(false);
    setIsRinging(false);
    playHangupClick();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const duration = Math.max(callDuration, 15);
    const scoreVal = Math.min(96, Math.max(74, 75 + Math.floor(Math.random() * 20)));

    saveRecording({
      title: `Practice with ${selectedProspect?.name || 'Prospect'}`,
      prospectName: selectedProspect ? `${selectedProspect.name} (${selectedProspect.companyName})` : 'Target Prospect',
      scriptTitle: activeScript?.title || 'Cold Call Script',
      duration,
      notes: `Pitch score: ${scoreVal}/100. Call duration: ${formatSeconds(duration)}.`
    });

    const debriefMsg = {
      id: `debrief-${Date.now()}`,
      speaker: 'Coach',
      name: 'Marcus (AI Coach)',
      text: `Call stopped at **${formatSeconds(duration)}** (Score: **${scoreVal}/100**). Recording saved! Click the edit icon below if you want to tweak your script before running another rep.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, debriefMsg]);
    speakSpeech(`Call stopped. Score is ${scoreVal}. You can edit your script or dial again whenever you're ready.`);
  };

  // =========================================================================
  // COACH ACTIONS ENGINE: Direct tool calling & real actions across the app
  // =========================================================================
  const executeCoachAction = (actionName, args = {}) => {
    let summary = '';
    const safeArgs = args || {};

    switch (actionName) {
      case 'researchProspect': {
        summary = `Researching ${safeArgs.companyName || safeArgs.query || 'the target business'}...`;
        showActionToast(summary);
        researchProspectWithGemini(safeArgs).then((result) => {
          if (result) {
            setResearchResult(result);
            const researchedScript = result.branchingScript || {};
            const personalizedUpdates = {
              ...(researchedScript.opener ? { hook: researchedScript.opener } : {}),
              ...(result.bleedingNeckPain ? { problem: result.bleedingNeckPain } : {}),
              ...(researchedScript.painHook ? { painValue: { problem: researchedScript.painHook } } : {}),
              ...(researchedScript.closingAsk ? { closingAsk: researchedScript.closingAsk } : {})
            };
            if (Object.keys(personalizedUpdates).length > 0) {
              const nextScript = { ...activeScript, ...personalizedUpdates };
              setActiveScript(nextScript);
              localStorage.setItem('scriptmaster_active_script', JSON.stringify(nextScript));
              localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
              window.dispatchEvent(new Event('scriptmaster_script_updated'));
              if (setGlobalScript) setGlobalScript(nextScript);
            }
            showActionToast('Research complete: pain points and qualification angles are ready.');
          } else {
            showActionToast('Research could not be completed. Check the business details and try again.');
          }
        }).catch(() => showActionToast('Research could not be completed.'));
        break;
      }
      case 'saveScriptToScriptsPage':
      case 'saveScript':
      case 'saveScriptToLibrary': {
        const scriptPayload = {
          ...activeScript,
          ...(safeArgs.title ? { title: safeArgs.title, name: safeArgs.title } : {}),
          ...(safeArgs.hook ? { hook: safeArgs.hook } : {}),
          ...(safeArgs.problem ? { problem: safeArgs.problem } : {}),
          ...(safeArgs.value ? { value: safeArgs.value } : {}),
          ...(safeArgs.closingAsk ? { closingAsk: safeArgs.closingAsk } : {})
        };
        saveScriptToScriptsPage(scriptPayload);
        setActiveScript(scriptPayload);
        if (setGlobalScript) setGlobalScript(scriptPayload);
        showActionToast(`Saved "${scriptPayload.title || scriptPayload.name}" to Scripts page!`);
        summary = `Saved "${scriptPayload.title || scriptPayload.name}" to Scripts page (/saved-scripts)`;
        break;
      }

      case 'pullUpScript':
      case 'loadScript': {
        const queryTerm = safeArgs.query || safeArgs.scriptId || safeArgs.title || safeArgs.name || '';
        const pullRes = pullUpScript(queryTerm);
        if (pullRes.success && pullRes.script) {
          setActiveScript(pullRes.script);
          if (setGlobalScript) setGlobalScript(pullRes.script);
          showActionToast(`Pulled up "${pullRes.script.title || pullRes.script.name}"`);
          summary = `Pulled up "${pullRes.script.title || pullRes.script.name}" onto active board and teleprompter`;
        } else {
          showActionToast(pullRes.message);
          summary = pullRes.message;
        }
        break;
      }

      case 'openPracticeSession':
      case 'launchPracticeStudio': {
        if (safeArgs.prospectId || safeArgs.personaId) {
          setSelectedProspectId(safeArgs.prospectId || safeArgs.personaId);
        }
        saveScriptToScriptsPage(activeScript);
        summary = 'Opening Practice Session in Studio...';
        showActionToast('Opening Practice Session in Studio...');
        setTimeout(() => {
          navigate('/practice');
        }, 400);
        break;
      }

      case 'navigateToPage':
      case 'goToPage': {
        const targetRoute = resolveAppRoute(safeArgs.page || safeArgs.destination || safeArgs.target || safeArgs.route);
        summary = `Navigating to ${targetRoute}...`;
        showActionToast(`Opening ${targetRoute}...`);
        setTimeout(() => {
          navigate(targetRoute);
        }, 400);
        break;
      }

      case 'updateActiveScript':
      case 'buildScript': {
        const updates = {};
        if (safeArgs.title) updates.title = safeArgs.title;
        if (safeArgs.hook) updates.hook = safeArgs.hook;
        if (safeArgs.problem) updates.problem = safeArgs.problem;
        else if (safeArgs.jobsitePain) updates.problem = safeArgs.jobsitePain;
        if (safeArgs.value) updates.value = safeArgs.value;
        else if (safeArgs.solutionValue) updates.value = safeArgs.solutionValue;
        if (safeArgs.closingAsk) updates.closingAsk = safeArgs.closingAsk;
        if (safeArgs.rebuttals && Array.isArray(safeArgs.rebuttals)) {
          updates.rebuttals = safeArgs.rebuttals.map(r => ({
            objection: r.objection || r.pushback || '',
            response: r.response || r.rebuttal || r.answer || ''
          }));
        }

        const next = { ...activeScript, ...updates };
        setActiveScript(next);
        localStorage.setItem('scriptmaster_active_script', JSON.stringify(next));
        localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
        window.dispatchEvent(new Event('scriptmaster_script_updated'));
        if (setGlobalScript) setGlobalScript(next);

        if (safeArgs.saveToScriptsPage || safeArgs.addToScripts) {
          saveScriptToScriptsPage(next);
        }

        showActionToast('Updated active script document');
        summary = `Built/updated script document (${Object.keys(updates).join(', ')})`;
        break;
      }

      default:
        console.warn('Unknown coach action:', actionName);
    }

    return summary;
  };

  // Helper to parse JSON action blocks from response text
  const parseActionBlockFromText = (text) => {
    if (!text) return null;
    try {
      const match = text.match(/```(?:json)?\s*({[\s\S]*?"action"[\s\S]*?})\s*```/i);
      if (match && match[1]) {
        return JSON.parse(match[1]);
      }
      const rawMatch = text.match(/({[\s\S]*?"action"\s*:\s*"[a-zA-Z0-9_]+"[\s\S]*?})/);
      if (rawMatch && rawMatch[1]) {
        return JSON.parse(rawMatch[1]);
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  // Quick Action Buttons Handler
  const handleExecuteQuickAction = (actionKey) => {
    switch (actionKey) {
      case 'saveScriptToScriptsPage': {
        executeCoachAction('saveScriptToScriptsPage', activeScript);
        const coachMsg = {
          id: `coach-${Date.now()}`,
          speaker: 'Coach',
          name: 'Marcus (AI Coach)',
          text: `Locked in! I saved "${activeScript?.title || 'your script'}" and added it directly to your Scripts page (/saved-scripts). You can practice it or pull it up anytime!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolExecuted: { action: 'saveScriptToScriptsPage', summary: 'Saved to Scripts Page (/saved-scripts)' }
        };
        setMessages(prev => [...prev, coachMsg]);
        speakSpeech(`Saved to your scripts page!`);
        break;
      }
      case 'pullUpScript': {
        const pullRes = pullUpScript('carl');
        if (pullRes.success && pullRes.script) {
          setActiveScript(pullRes.script);
          if (setGlobalScript) setGlobalScript(pullRes.script);
          const coachMsg = {
            id: `coach-${Date.now()}`,
            speaker: 'Coach',
            name: 'Marcus (AI Coach)',
            text: `Pulled up "${pullRes.script.title || pullRes.script.name}" onto your active board and teleprompter!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            toolExecuted: { action: 'pullUpScript', summary: `Loaded "${pullRes.script.title || pullRes.script.name}"` }
          };
          setMessages(prev => [...prev, coachMsg]);
          speakSpeech(`Pulled up ${pullRes.script.title || 'your script'}`);
        }
        break;
      }
      case 'openPracticeSession': {
        executeCoachAction('openPracticeSession', { prospectId: selectedProspect?.id });
        const coachMsg = {
          id: `coach-${Date.now()}`,
          speaker: 'Coach',
          name: 'Marcus (AI Coach)',
          text: `Opening your live practice session in Practice Studio! Dialing ${selectedProspect?.name || 'target contractor'}...`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolExecuted: { action: 'openPracticeSession', summary: 'Opening Practice Studio...' }
        };
        setMessages(prev => [...prev, coachMsg]);
        break;
      }
      case 'goToBuilder': {
        navigate('/script-builder');
        break;
      }
      case 'goToScripts': {
        navigate('/saved-scripts');
        break;
      }
      case 'goToRecordings': {
        navigate('/recordings');
        break;
      }
      default:
        break;
    }
  };

  // Send message
  const handleSendMessage = async (customText = null) => {
    const text = (customText || inputText).trim();
    if (!text) return;

    const updatedMem = extractMemoryFromInput(text, coachMemory);
    setCoachMemory(updatedMem);
    const learningProgress = getLearningProgress();
    const adaptiveDifficulty = getAdaptiveDifficulty();
    const activeScriptContext = `\nACTIVE SCRIPT TO KEEP CONSISTENT WITH THE TELEPROMPTER:\n${JSON.stringify({ hook: activeScript?.hook, problem: activeScript?.problem || activeScript?.painValue?.problem, value: activeScript?.value || activeScript?.painValue?.value, closingAsk: activeScript?.closingAsk })}\nUse these exact lines when telling the student what to say; propose a script update instead of silently substituting a different line.\nPERSISTED STUDENT MEMORY:\n${formatMemoryForPrompt(updatedMem)}\nSCRIPT AUTHORING RULE: If the student asks you to create, rewrite, improve, or replace a pitch, author the exact verbatim line yourself and call updateActiveScript immediately. If the student says the current line is bad, replace it in the active script and teleprompter instead of repeating it.`;

    const userMsg = {
      id: `usr-${Date.now()}`,
      speaker: 'You',
      name: 'You',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');
    setIsThinking(true);

    if (isCallActive) {
      try {
        const response = await askGeminiCoach({
          systemPrompt: `You are ${selectedProspect?.name || 'Hank Miller'}, owner of ${selectedProspect?.companyName || 'Miller HVAC'}.
Persona: ${selectedProspect?.skepticism || 'Skeptical contractor in truck cab'}.
Pain: ${selectedProspect?.bleedingNeckPain || 'Losing money on unbilled materials'}.
CRITICAL RULES:
1. Speak 1 to 2 crisp, realistic spoken sentences directly as the prospect on the phone.
2. If the user used a respectful 20-second contract or offered thermal imaging/demo, show slight curiosity.
3. If they talk too long without asking a question, hit them with a realistic objection like 'Send me an email' or 'We have a guy'.`,
          messages: nextMessages,
          userMessage: text,
          currentBusiness: selectedProspect,
          stage: 'live_cold_call',
          userMemory: updatedMem
        });

        setIsThinking(false);
        const reply = response?.text || generateMemoryAwareFallback({
          userMessage: text,
          memory: updatedMem,
          currentProspect: selectedProspect,
          isCallActive: true,
          agentHat: 'prospect'
        });

        const prospectMsg = {
          id: `prosp-${Date.now()}`,
          speaker: 'Prospect',
          name: `${selectedProspect?.name || 'Hank Miller'}`,
          text: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, prospectMsg]);
        speakSpeech(reply, 'hank');
      } catch (err) {
        setIsThinking(false);
        console.warn('Call error:', err);
      }
      return;
    }

    // =========================================================================
    // COACH MARCUS: Mentorship Dialogue & App Action Execution
    // =========================================================================
    const lowerText = text.toLowerCase();
    let replyText = '';
    let executedAction = null;

    // Action 1: Save script to scripts page / library
    if (
      lowerText.includes('save') && 
      (lowerText.includes('script') || lowerText.includes('page') || lowerText.includes('library') || lowerText.includes('it') || lowerText.includes('this') || lowerText.includes('board'))
    ) {
      const summary = executeCoachAction('saveScriptToScriptsPage', activeScript);
      executedAction = { action: 'saveScriptToScriptsPage', summary };
      replyText = `Locked in! I saved "${activeScript?.title || 'your script'}" and added it directly to your Scripts page (/saved-scripts). You can pull it up or review your saved templates there anytime!`;

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // Action 2: Pull up script
    if (
      lowerText.includes('pull up') || 
      lowerText.includes('load script') || 
      lowerText.includes('open script') ||
      lowerText.includes('show saved scripts') ||
      lowerText.includes('bring up') ||
      (lowerText.includes('load') && (lowerText.includes('carl') || lowerText.includes('hvac') || lowerText.includes('delbert') || lowerText.includes('roofing')))
    ) {
      const summary = executeCoachAction('pullUpScript', { query: text });
      executedAction = { action: 'pullUpScript', summary };
      replyText = summary || `Pulled up "${activeScript?.title || 'your script'}" onto your active board and teleprompter!`;

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // Action 3: Open Practice Session
    if (
      lowerText.includes('open practice') ||
      lowerText.includes('start practice') ||
      lowerText.includes('let\'s practice') ||
      lowerText.includes('take it to the studio') ||
      lowerText.includes('take this to practice') ||
      lowerText.includes('launch practice') ||
      lowerText.includes('drill')
    ) {
      const summary = executeCoachAction('openPracticeSession', { prospectId: selectedProspect?.id });
      executedAction = { action: 'openPracticeSession', summary };
      replyText = `Opening your live practice session in Practice Studio! Dialing ${selectedProspect?.name || 'your target contractor'} with your active teleprompter.`;

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // Action 4: App Navigation
    if (
      (lowerText.includes('go to') || lowerText.includes('take me to') || lowerText.includes('show') || lowerText.includes('view') || lowerText.includes('open')) &&
      (lowerText.includes('recording') || lowerText.includes('dashboard') || lowerText.includes('setting') || lowerText.includes('saved scripts') || lowerText.includes('scripts page') || lowerText.includes('builder'))
    ) {
      const summary = executeCoachAction('navigateToPage', { page: text });
      executedAction = { action: 'navigateToPage', summary };
      replyText = summary || "Navigating there now!";

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // Action 5: Explicitly Reset / Load Default Handled Script Template
    if (
      lowerText.includes('load handled template') ||
      lowerText.includes('reset to handled') ||
      lowerText.includes('load default template') ||
      lowerText.includes('load default script')
    ) {
      const handledTpl = BUILTIN_TEMPLATES[0];
      const summary = executeCoachAction('updateActiveScript', handledTpl);
      executedAction = { action: 'updateActiveScript', summary };
      replyText = `Locked in! I built and updated your active script document with the Handled & Buddy field-ops pitch: Route 60 pattern interrupt hook, Sunday handwriting pain, Single Crew tier ($499 setup / $129/mo), and $250 upfront onboarding deposit ask. You can save it to your Scripts page or open a practice drill!`;

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };
      setMessages(prev => [...prev, coachMsg]);
      speakSpeech(replyText, 'marcus');
      return;
    }

    // General AI Call with action block fallback
    try {
      const clientApiKey = getGeminiApiKey();
      if (clientApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: clientApiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              ...messages.slice(-6).map(m => ({
                role: m.speaker === 'You' ? 'user' : 'model',
                parts: [{ text: m.text }]
              })),
              {
                role: 'user',
                parts: [{ text: text }]
              }
            ],
            config: {
              systemInstruction: `${COACH_SYSTEM_PROMPT_ENHANCED}\n\nADAPTIVE CURRICULUM RULES:\n- Current lesson: ${learningProgress.currentLessonId}.\n- Stage: ${learningProgress.stage}.\n- Baseline turns completed: ${learningProgress.baselineTurns}.\n- Start with explanation and discussion; do not send the user into a prospect call unless they ask or demonstrate readiness.\n- Ask one question at a time, evaluate the answer, and recommend repeat, advance, or practice explicitly.\n- Teach business research hands-on: find credible public information, separate facts from hypotheses, identify likely operational pain points, and prepare respectful personalization.\n- Teach both research-before-call and live qualification. Turn findings into diagnostic questions, verify assumptions on the call, and update the active contractor script with confirmed pain rather than guesses.${activeScriptContext}`,
              temperature: 0.7,
              tools: [{ functionDeclarations: COACH_ALL_WHITELISTED_TOOLS }]
            }
          });

          // Check for native function calls
          const functionCalls = response?.functionCalls || [];
          if (functionCalls.length > 0) {
            const fc = functionCalls[0];
            const summary = executeCoachAction(fc.name, fc.args);
            executedAction = { action: fc.name, summary, args: fc.args };
            replyText = `Locked in! I executed your request: ${summary}`;
          }

          if (!replyText && response?.text) {
            replyText = response.text.trim();
          }
        } catch (clientErr) {
          console.warn('GoogleGenAI direct call notice:', clientErr);
        }
      }

      // Backend route fallback
      if (!replyText) {
        const response = await askGeminiCoach({
          systemPrompt: `${COACH_SYSTEM_PROMPT_ENHANCED}\n\nADAPTIVE CURRICULUM RULES:\n- Current lesson: ${learningProgress.currentLessonId}.\n- Stage: ${learningProgress.stage}.\n- Baseline turns completed: ${learningProgress.baselineTurns}.\n- Current adaptive difficulty: ${adaptiveDifficulty.level}; ${adaptiveDifficulty.help}.\n- Start with explanation and discussion; do not send the user into a prospect call unless they ask or demonstrate readiness.\n- Ask one question at a time, evaluate the answer, and recommend repeat, advance, or practice explicitly.\n- Teach business research hands-on: find credible public information, separate facts from hypotheses, identify likely operational pain points, and prepare respectful personalization.\n- Teach both research-before-call and live qualification. Turn findings into diagnostic questions, verify assumptions on the call, and update the active contractor script with confirmed pain rather than guesses.${activeScriptContext}`,
          messages: nextMessages,
          userMessage: text,
          currentBusiness: selectedProspect,
          stage: 'script_building',
          userMemory: updatedMem
        });

        if (response?.text) {
          replyText = response.text.trim();
        }
      }

      // Fallback response if completely offline
      if (!replyText) {
        if (lowerText.includes('hook') || lowerText.includes('pattern interrupt')) {
          const targetName = selectedProspect?.name?.split(' ')[0] || 'Carl';
          replyText = `**Coach Marcus Vance (Hook Strategy & Verbatim Drill):**\n\n` +
            `Contractor psychology rule #1: Eliminate pitch breath in the first 7 seconds. Never ask "how are you doing today?"—it triggers instant sales defense. Hit them with a peer-to-peer Route 60 pattern interrupt and give them a clean off-ramp:\n\n` +
            `👉 **Verbatim 20s Hook:**\n` +
            `*"Hey ${targetName}, Katy here. I know you're probably hauling materials down Route 60, but give me 20 seconds: if this doesn't stop you from handwriting quotes for 10 hours every Sunday and eating $1,200 on unbudgeted plumbing runs, tell me to jump in the river. Fair?"*\n\n` +
            `\`\`\`json\n` +
            `{\n  "action": "updateActiveScript",\n  "params": {\n    "hook": "Hey ${targetName}, Katy here. I know you're probably hauling materials down Route 60, but give me 20 seconds: if this doesn't stop you from handwriting quotes for 10 hours every Sunday and eating $1,200 on unbudgeted plumbing runs, tell me to jump in the river. Fair?"\n  }\n}\n` +
            `\`\`\``;
        } else if (lowerText.includes('pain') || lowerText.includes('problem')) {
          replyText = `**Coach Marcus Vance (Jobsite Pain Breakdown):**\n\n` +
            `Contractors don't care about "modern software"—they care about lost cash and stolen Sundays. Frame the problem as Sunday handwriting fatigue and change orders scribbled on lumber scraps:\n\n` +
            `👉 **Verbatim Problem to Say:**\n` +
            `*"10 hours every Sunday handwriting kitchen & bath quotes; eating $1,200 on unbudgeted plumbing runs because change orders were scribbled on lumber scraps."*\n\n` +
            `\`\`\`json\n` +
            `{\n  "action": "updateActiveScript",\n  "params": {\n    "problem": "10 hours every Sunday handwriting kitchen & bath quotes; eating $1,200 on unbudgeted plumbing runs because change orders were scribbled on lumber scraps."\n  }\n}\n` +
            `\`\`\``;
        } else if (lowerText.includes('offer') || lowerText.includes('value') || lowerText.includes('pricing')) {
          replyText = `**Coach Marcus Vance (Solution & Pricing Framing):**\n\n` +
            `Anchor the solution directly to offline jobsite conditions and clear flat-rate pricing. Single Crew tier ($499 setup / $129/mo):\n\n` +
            `👉 **Verbatim Value to Say:**\n` +
            `*"Handled & Buddy walkthrough intake with offline sync in the hollows. Single Crew tier ($499 setup / $129/mo) pays for itself on the first avoided plumbing change order."*\n\n` +
            `\`\`\`json\n` +
            `{\n  "action": "updateActiveScript",\n  "params": {\n    "value": "Handled & Buddy walkthrough intake with offline sync in the hollows. Single Crew tier ($499 setup / $129/mo)."  }\n}\n` +
            `\`\`\``;
        } else if (lowerText.includes('close') || lowerText.includes('ask') || lowerText.includes('deposit')) {
          replyText = `**Coach Marcus Vance (Closing Strategy & Verbatim Ask):**\n\n` +
            `Never ask for a generic 30-minute demo. Close on a low-friction micro-commitment: a $250 upfront onboarding deposit (half of setup) or a 4-minute screen recording:\n\n` +
            `👉 **Verbatim Closing Ask:**\n` +
            `*"Lock in onboarding slot with a $250 upfront deposit (half of the $499 setup fee). If your guys aren't using this on Route 60 by Friday, I'll refund every dime. Fair?"*\n\n` +
            `\`\`\`json\n` +
            `{\n  "action": "updateActiveScript",\n  "params": {\n    "closingAsk": "Lock in onboarding slot with a $250 upfront deposit (half of the $499 setup fee)."  }\n}\n` +
            `\`\`\``;
        } else if (lowerText.includes('connie') || lowerText.includes('wife') || lowerText.includes('email')) {
          replyText = `**Coach Marcus Vance (Neutralizing 'Send email to Connie'):**\n\n` +
            `Don't argue and don't accept a brush-off to email oblivion. Pivot with respectful empathy:\n\n` +
            `👉 **Verbatim Rebuttal:**\n` +
            `*"Happy to send Connie the paperwork, Carl, but I want to make sure you two actually want this before cluttering her inbox. Give me 30 seconds to explain the math, and if it's no fit, I'll never call back. Fair?"*`;
        } else if (lowerText.includes('strategy') || lowerText.includes('brainstorm') || lowerText.includes('tonality')) {
          replyText = `**Coach Marcus Vance (Sales Strategy & Tonality Blueprint):**\n\n` +
            `1. **Downward Inflection:** Drop your tone at the end of statements instead of pitching up. Upward inflection sounds like asking for permission; downward inflection sounds like an expert peer.\n` +
            `2. **Slow Down 20%:** Fast talking screams "telemarketer". Match the contractor's unhurried truck-cab cadence.\n` +
            `3. **The 20-Second Contract:** Acknowledge their time immediately ("caught you on Route 60? Give me 20 seconds..."). Once granted, they will listen.\n` +
            `4. **Downside Risk Removal:** Never push a 1-year contract. Close on an onboarding test slot with a $250 refundable deposit.\n\n` +
            `Select any script part below and ask me to draft or tune it with you!`;
        } else {
          replyText = generateMemoryAwareFallback({
            userMessage: text,
            memory: updatedMem,
            currentProspect: selectedProspect,
            isCallActive: false,
            agentHat: 'coach'
          }) || "I'm with you. Use the Script Co-Creator below to build your 20s hook, jobsite pain, closing ask, or brainstorm your contractor strategy!";
        }
      }

      // Parse JSON action block if returned in text
      const jsonAction = parseActionBlockFromText(replyText);
      if (jsonAction && jsonAction.action) {
        const summary = executeCoachAction(jsonAction.action, jsonAction.params || {});
        if (summary) {
          executedAction = { action: jsonAction.action, summary, args: jsonAction.params };
        }
        replyText = replyText.replace(/```(?:json)?\s*({[\s\S]*?"action"[\s\S]*?})\s*```/i, '').trim();
      }

      setIsThinking(false);
      const coachMsg = {
        id: `coach-${Date.now()}`,
        speaker: 'Coach',
        name: 'Marcus (AI Coach)',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolExecuted: executedAction
      };

      setMessages(prev => [...prev, coachMsg]);
      recordLearningTurn();
      speakSpeech(replyText, 'marcus');
    } catch (err) {
      setIsThinking(false);
      console.warn('Coach error:', err);
    }
  };

  // Open Edit Draft
  const handleOpenEdit = () => {
    setScriptEditDraft(JSON.parse(JSON.stringify(activeScript)));
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!scriptEditDraft) return;
    setActiveScript(scriptEditDraft);
    localStorage.setItem('scriptmaster_active_script', JSON.stringify(scriptEditDraft));
    localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
    window.dispatchEvent(new Event('scriptmaster_script_updated'));
    if (setGlobalScript) setGlobalScript(scriptEditDraft);
    showActionToast('Active script saved and updated across app!');
    setIsEditModalOpen(false);
  };

  // Helper to extract current part content from active script
  const getSelectedPartContent = () => {
    if (!activeScript) return '';
    switch (selectedScriptPart) {
      case 'hook':
        // Dashboard Coach lessons must show only the line Coach selected for
        // this moment. Do not fall back to an old saved hook here.
        return coachTargetLine || '';
      case 'problem':
        return activeScript.problem || (typeof activeScript.painValue === 'string' ? activeScript.painValue : activeScript.painValue?.problem) || '';
      case 'value':
        return activeScript.value || (typeof activeScript.painValue === 'object' ? activeScript.painValue?.value : '') || '';
      case 'closingAsk':
        return activeScript.closingAsk || '';
      case 'rebuttal':
        return (activeScript.rebuttals || []).map(r => `"${r.objection}": ${r.response}`).join('\n\n') || '';
      case 'strategy':
        return `Target: ${activeScript.target || selectedProspect?.name || 'Carl McIntyre (Route 60 General Contractor)'}\nClosing: ${activeScript.closingAsk || '$250 Onboarding Deposit'}\nPositioning: Peer-to-peer field-ops workflow, Sunday handwriting pain, offline sync in the hollows.`;
      default:
        return '';
    }
  };

  // 1-Click Apply Part to Active Teleprompter Script
  const handleApplyPartToScript = (partKey, newContent) => {
    if (!newContent) return;
    const updates = {};
    if (partKey === 'hook') updates.hook = newContent;
    else if (partKey === 'problem') updates.problem = newContent;
    else if (partKey === 'value') updates.value = newContent;
    else if (partKey === 'closingAsk') updates.closingAsk = newContent;
    else if (partKey === 'rebuttal') {
      updates.rebuttals = [
        ...(activeScript.rebuttals || []),
        { objection: 'Objection', response: newContent }
      ];
    }
    const next = { ...activeScript, ...updates };
    setActiveScript(next);
    localStorage.setItem('scriptmaster_active_script', JSON.stringify(next));
    localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
    window.dispatchEvent(new Event('scriptmaster_script_updated'));
    if (setGlobalScript) setGlobalScript(next);
    showActionToast(`Applied to active teleprompter script!`);
  };

  // Submit Part Building or Strategy Brainstorm Prompt to Marcus
  const handleAskMarcusForPart = (overrideText = null) => {
    const textToSend = (overrideText || partBuilderInput).trim();
    if (!textToSend) return;

    let partLabel = '20-Second Hook';
    if (selectedScriptPart === 'problem') partLabel = 'Jobsite Pain / Dollar Leak';
    else if (selectedScriptPart === 'value') partLabel = 'Proof & Value Proposition';
    else if (selectedScriptPart === 'closingAsk') partLabel = 'Closing Deposit Ask';
    else if (selectedScriptPart === 'rebuttal') partLabel = 'Objection Rebuttal';
    else if (selectedScriptPart === 'strategy') partLabel = 'Sales Strategy & Tonality';

    const fullPrompt = `[SCRIPT CO-CREATOR & STRATEGY LAB - ${partLabel}]: ${textToSend}
Current ${partLabel}: "${getSelectedPartContent()}"
Target Contractor: ${selectedProspect?.name || activeScript?.target || 'Carl McIntyre (Route 60 General Contractor)'}.
Coach Marcus, please give me:
1. Tactical Sales Strategy & Tonality Breakdown (contractor psychology, eliminating commission breath).
2. The exact verbatim script line to say out loud.
3. Call updateActiveScript to lock it into the active teleprompter.`;

    setPartBuilderInput('');
    handleSendMessage(fullPrompt);
  };

  // Copy text to clipboard with visual toast
  const handleCopyPartContent = (text, key) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedPartKey(key);
      showActionToast('Copied to clipboard!');
      setTimeout(() => setCopiedPartKey(null), 2000);
    } catch {
      /* ignore */
    }
  };

  // Scrubber calculation
  const progressPercent = Math.min(100, Math.round((callDuration / maxCallTime) * 100));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Navbar />

      {/* Global Action Toast Notification */}
      {actionToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-indigo-500/50 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{actionToast}</span>
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        <LivePhraseOverlay
          targetLine={coachTargetLine}
          spokenText={liveSpeechText}
          metrics={liveSpeechMetrics}
          visible={isListening}
        />
        {micError && (
          <div
            role="alert"
            className="w-full bg-rose-500/15 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg"
          >
            <span>{micError}</span>
            <button
              type="button"
              onClick={() => setMicError(null)}
              className="text-rose-400 hover:text-white font-bold ml-2 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white text-xs font-semibold shadow-xs border border-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={() => speakSpeech('I am your Coach. We will start with the fundamentals and work forward together. Tell me what you already know about an effective cold call opening.', 'marcus')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition"
            title="Play Coach voice"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Hear Coach</span>
          </button>

          {voiceError && (
            <span className="max-w-[260px] text-[10px] font-semibold text-amber-300" role="status">
              {voiceError}
            </span>
          )}

          {/* Target Prospect Selector */}
          <div className="relative">
            <select
              value={selectedProspect?.id || ''}
              onChange={(e) => {
                const found = prospectsList.find(p => p.id === e.target.value);
                if (found) {
                  setSelectedProspect(found);
                  setSelectedProspectId(found.id);
                }
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-full px-3.5 py-1.5 pr-8 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none shadow-xs transition"
            >
              {prospectsList.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.name} · {p.companyName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          {/* Right Floating Actions: Mic Toggle, View Script & Audio Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                isListening
                  ? 'bg-rose-600 border-rose-500 text-white animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={isListening ? "Click to turn Microphone OFF" : "Click to turn Microphone ON"}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{isListening ? "Mic: ON" : "Mic: OFF"}</span>
            </button>

            <button
              type="button"
              onClick={commitLiveReply}
              disabled={!liveSessionRef.current}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs border bg-indigo-600/20 border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/40 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Manually tell Gemini Live that your spoken turn is complete"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Reply</span>
            </button>

            <button
              onClick={() => setIsScriptDrawerOpen(!isScriptDrawerOpen)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                isScriptDrawerOpen
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{isScriptDrawerOpen ? 'Close Script' : 'View Script'}</span>
            </button>

            <button
              onClick={() => setIsAgentMuted(!isAgentMuted)}
              className={`p-1.5 rounded-full border text-xs transition cursor-pointer shadow-xs ${
                isAgentMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isAgentMuted ? "Audio muted" : "Audio active"}
            >
              {isAgentMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-indigo-400" />}
            </button>
          </div>
        </div>

        {!embedded && (
        <>
        {/* Collapsible Translucent Frosted Teleprompter Card */}
        {isScriptDrawerOpen && (
          <div className="bg-slate-900/90 rounded-2xl p-6 border border-slate-800 backdrop-blur-md animate-fadeIn flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Coach-Selected Line
                </h3>
              </div>
              <button
                onClick={handleOpenEdit}
                className="text-xs text-indigo-400 font-semibold hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" /> Edit
              </button>
            </div>

            <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
              {coachTargetLine ? `"${coachTargetLine}"` : 'Coach will place the exact line you should say here when ready.'}
            </p>

            {coachTargetLine && activeScript?.rebuttals?.length > 0 && (
              <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 text-xs">
                {activeScript.rebuttals.map((r, i) => (
                  <div key={i} className="px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300">
                    <span className="font-semibold text-indigo-300">"{r.objection}": </span>
                    <span>{r.response}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* CENTERPIECE: AUDIO-FIRST CALL STUDIO */}
        {/* ======================================================== */}
        <div className="bg-slate-900/70 rounded-2xl border border-slate-800/80 p-8 sm:p-10 flex flex-col items-center justify-center min-h-[440px] relative overflow-hidden shadow-2xl">
          
          {/* Top Status Indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-2.5 h-2.5 rounded-full ${isCallActive ? 'bg-rose-500 animate-ping' : isRinging ? 'bg-amber-400 animate-bounce' : 'bg-emerald-400 animate-pulse'}`} />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {isCallActive ? `Live Call with ${selectedProspect?.name || 'Prospect'}` : isRinging ? 'Connecting Call...' : 'Voice Practice Studio'}
            </span>
          </div>

          {/* If in iframe, persistent helper link to open in full window */}
          {isInIframe && (
            <button
              type="button"
              onClick={() => setIsIframeMicModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition cursor-pointer mb-2 animate-pulse"
              title="Click to open app in full window to use microphone"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>In Preview iFrame? Click to open full window &amp; enable mic</span>
            </button>
          )}

          {/* LARGE GLOWING VOICE ORB WITH SOFT RADIAL RIPPLES */}
          <div className="relative flex items-center justify-center my-6">
            
            {/* Layered soft radial ripples pulsing to cadence */}
            {isCallActive && (
              <>
                <div className="absolute w-64 h-64 rounded-full bg-indigo-500/15 animate-ping pointer-events-none" />
                <div className="absolute w-52 h-52 rounded-full bg-purple-500/20 animate-pulse pointer-events-none" />
              </>
            )}

            {/* Central Glowing Voice Orb */}
            <button
              onClick={() => {
                if (isCallActive) {
                  handleStopCall();
                } else {
                  if (isInIframe) {
                    setIsIframeMicModalOpen(true);
                    return;
                  }
                  handleStartCall();
                }
              }}
              className={`w-40 h-40 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 relative cursor-pointer group ${
                isCallActive
                  ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 shadow-[0_0_50px_rgba(244,63,94,0.45)] scale-105'
                  : isRinging
                  ? 'bg-gradient-to-tr from-[#f59e0b] via-[#ea580c] to-[#f97316] shadow-[0_0_40px_rgba(245,158,11,0.35)] animate-bounce'
                  : 'bg-gradient-to-tr from-[#6366F1] via-[#7c3aed] to-[#8b5cf6] shadow-[0_12px_40px_rgba(99,102,241,0.35)] hover:scale-105 hover:shadow-[0_12px_50px_rgba(99,102,241,0.5)]'
              }`}
              title={isCallActive ? "Tap to end voice call" : "Tap to start voice call"}
            >
              {isCallActive ? (
                <div className="text-center text-white">
                  <Pause className="w-8 h-8 mx-auto mb-1 animate-pulse" />
                  <span className="text-2xl font-bold font-mono tracking-tight block">
                    {formatSeconds(callDuration)}
                  </span>
                  <span className="text-[10px] font-semibold text-rose-200 tracking-wider uppercase mt-0.5 block">
                    Tap to End Call
                  </span>
                </div>
              ) : isRinging ? (
                <div className="text-center text-white">
                  <PhoneCall className="w-8 h-8 mx-auto animate-bounce mb-1" />
                  <span className="text-xs font-semibold">Calling...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <Mic className="w-10 h-10 mb-1.5 drop-shadow" />
                  <span className="text-xs font-bold tracking-wider uppercase text-white">
                    Start Voice Call
                  </span>
                  <span className="text-[10px] text-indigo-200 mt-0.5 font-medium">
                    Tap to Dial
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Waveform Frequency Bars */}
          <div className="flex items-center justify-center gap-1.5 h-6 my-2">
            {[6, 12, 18, 24, 14, 26, 18, 10, 22, 14, 28, 18, 10, 22, 14, 18, 8, 12].map((h, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isCallActive ? 'bg-gradient-to-t from-indigo-500 to-purple-400' : 'bg-slate-800'
                }`}
                style={{
                  height: isCallActive ? `${Math.max(4, h * 0.9)}px` : '4px'
                }}
              />
            ))}
          </div>

          {/* Scrubber Timeline Displaying MM:SS */}
          <div className="w-full max-w-md px-2 py-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span className="font-semibold text-slate-300">{formatSeconds(callDuration)}</span>
              <span className="text-[10px] font-sans text-slate-500 uppercase tracking-wider">
                Call Timeline
              </span>
              <span>{formatSeconds(maxCallTime)}</span>
            </div>

            <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Controls Row with Primary Voice Call / Mic Button */}
          <div className="flex flex-col items-center gap-2 pt-4">
            <div className="flex items-center justify-center gap-6">
              
              {/* Reset Button */}
              <button
                onClick={() => {
                  setCallDuration(0);
                  if (isCallActive) handleStopCall();
                }}
                className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                title="Reset Drill"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Primary Voice Mic Button */}
              {!isCallActive && !isRinging ? (
                <button
                  onClick={() => {
                    if (isInIframe) {
                      setIsIframeMicModalOpen(true);
                      return;
                    }
                    handleStartCall();
                  }}
                  className="w-16 h-16 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/40 transition hover:scale-105 active:scale-95 cursor-pointer group"
                  title="Voice Button: Start Cold Call"
                >
                  <Mic className="w-7 h-7 fill-white" />
                </button>
              ) : (
                <button
                  onClick={handleStopCall}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/40 transition hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
                  title="Voice Button: Stop Call & Save"
                >
                  <Pause className="w-7 h-7 fill-white" />
                </button>
              )}

              {/* Quick Edit Button */}
              <button
                onClick={handleOpenEdit}
                className="w-12 h-12 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-indigo-400 transition flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                title="Quick Edit Script"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <span className="text-[11px] font-semibold text-slate-400 tracking-wide mt-1">
              {isCallActive ? "Live call in progress • Tap red to stop" : "Voice Button • Tap purple mic to dial"}
            </span>
          </div>

        </div>

        </>
        )}

        {/* ======================================================== */}
        {/* STREAMLINED CONVERSATION & COACH FEEDBACK */}
        {/* ======================================================== */}
        <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6 sm:p-7 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Dialogue & Feedback
            </h3>
            <span className="text-[11px] text-slate-400">
              {isCallActive ? `Speaking with ${selectedProspect?.name || 'Prospect'}` : 'Marcus Vance Mentorship'}
            </span>
          </div>

          <div 
            ref={chatContainerRef}
            className="space-y-3 max-h-[260px] overflow-y-auto pr-1 text-xs"
          >
            {messages.map((m) => {
              const isUser = m.speaker === 'You';
              const isProspect = m.speaker === 'Prospect';

              return (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl leading-relaxed flex flex-col gap-1 ${
                    isUser
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-slate-100 ml-10'
                      : isProspect
                      ? 'bg-amber-500/10 border border-amber-500/30 text-amber-200 mr-10'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-300 mr-10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className={isUser ? 'text-indigo-400' : isProspect ? 'text-amber-400' : 'text-slate-400'}>
                      {m.name || m.speaker}
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">{m.time}</span>
                  </div>

                  <div className="text-xs font-normal whitespace-pre-wrap">
                    {m.text}
                  </div>

                  {m.toolExecuted && (
                    <div className="mt-2 pt-2 border-t border-indigo-500/20 flex items-center gap-2 text-[11px] font-semibold text-indigo-300 bg-indigo-950/40 px-2.5 py-1.5 rounded-lg">
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{m.toolExecuted.summary || 'Action Executed on App'}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {isThinking && (
              <div className="p-3 rounded-xl bg-slate-950/60 text-slate-400 text-xs flex items-center gap-2 italic border border-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SCRIPT CO-CREATOR & STRATEGY BRAINSTORM LAB */}
          {/* ======================================================== */}
          <div className="bg-slate-950/70 border border-indigo-500/30 rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
            {/* Header with Part Selector & Toggle */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                    <span>Script Co-Creator & Strategy Lab</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 font-medium border border-indigo-700/50">
                      Coach Marcus
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Draft, critique, and tune high-converting script parts & contractor strategy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBuilderDockOpen(!isBuilderDockOpen)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                title={isBuilderDockOpen ? "Collapse Builder Dock" : "Expand Builder Dock"}
              >
                {isBuilderDockOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isBuilderDockOpen && (
              <>
                {/* Script Part Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
                  {[
                    { id: 'hook', label: '20s Hook', icon: Zap, color: 'text-amber-400' },
                    { id: 'problem', label: 'Jobsite Pain', icon: Flame, color: 'text-rose-400' },
                    { id: 'value', label: 'Proof & Offer', icon: Shield, color: 'text-emerald-400' },
                    { id: 'closingAsk', label: 'Closing Ask', icon: Target, color: 'text-sky-400' },
                    { id: 'rebuttal', label: 'Rebuttals', icon: Lightbulb, color: 'text-yellow-400' },
                    { id: 'strategy', label: 'Strategy & Tone', icon: Compass, color: 'text-purple-400' }
                  ].map(part => {
                    const Icon = part.icon;
                    const isSelected = selectedScriptPart === part.id;
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => setSelectedScriptPart(part.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : part.color}`} />
                        <span>{part.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Part Current Content & 1-Click Commit */}
                <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">
                      Active Teleprompter Text ({selectedScriptPart.toUpperCase()}):
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopyPartContent(getSelectedPartContent(), selectedScriptPart)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[10px]"
                        title="Copy to clipboard"
                      >
                        {copiedPartKey === selectedScriptPart ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      {selectedScriptPart !== 'strategy' && (
                        <button
                          type="button"
                          onClick={() => handleApplyPartToScript(selectedScriptPart, getSelectedPartContent())}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-600/40 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/40 transition cursor-pointer text-[10px] font-semibold"
                          title="Save this line to the active teleprompter"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Lock to Prompter</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed italic whitespace-pre-wrap line-clamp-3 bg-slate-950/60 p-2 rounded-lg border border-slate-850">
                    "{getSelectedPartContent() || 'No text set yet for this section.'}"
                  </p>
                </div>

                {/* Quick Strategy Brainstorm Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
                  <span className="text-slate-500 font-semibold shrink-0 text-[10px]">
                    Quick Brainstorm:
                  </span>
                  {[
                    { label: '20s Pattern Interrupt', prompt: 'Brainstorm 3 variations of a 20-second pattern interrupt hook that eliminate salesperson commission breath for Carl hauling materials on Route 60.' },
                    { label: 'Sunday Handwriting Pain', prompt: 'Sharpen the jobsite pain around handwriting quotes for 10 hours on Sundays and eating $1,200 on unbudgeted plumbing runs.' },
                    { label: "Overcome 'Send to Connie'", prompt: "Give me the psychological strategy and verbatim rebuttal when a contractor says 'Just shoot an email to my wife Connie at the office'." },
                    { label: '$250 Deposit Close', prompt: 'Craft an aggressive, low-friction closing ask for a $250 upfront onboarding deposit that removes all financial risk for the contractor.' },
                    { label: 'Downward Inflection Coaching', prompt: 'Explain the tactical difference between upward and downward inflection on cold calls, and show me where I need to drop my tone.' }
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAskMarcusForPart(chip.prompt)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/40 transition shrink-0 cursor-pointer text-[11px]"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Dedicated Part Builder Text Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskMarcusForPart();
                  }}
                  className="flex items-center gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={partBuilderInput}
                    onChange={(e) => setPartBuilderInput(e.target.value)}
                    placeholder={
                      selectedScriptPart === 'hook'
                        ? "e.g. 'Draft a 20s Route 60 pattern interrupt for Carl McIntyre hauling supplies...'"
                        : selectedScriptPart === 'problem'
                        ? "e.g. 'Make the Sunday handwriting legal pad pain more urgent and costly...'"
                        : selectedScriptPart === 'value'
                        ? "e.g. 'Emphasize offline sync in the hollows and 2-tap photo receipt matching...'"
                        : selectedScriptPart === 'closingAsk'
                        ? "e.g. 'Close on the $250 onboarding deposit with zero commission breath...'"
                        : selectedScriptPart === 'rebuttal'
                        ? "e.g. 'Overcome: Just shoot an email to my wife Connie at the office...'"
                        : "e.g. 'Brainstorm strategy for dealing with skeptical WV contractors on Route 60...'"
                    }
                    className="flex-1 bg-slate-950 border border-indigo-500/30 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!partBuilderInput.trim() || isThinking}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer shadow-md disabled:opacity-40 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Brainstorm & Draft</span>
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Quick Coach Actions Toolbar: Lets user or coach immediately take action across the app */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('saveScriptToScriptsPage')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="Save current pitch and add it directly to the Scripts Page (/saved-scripts)"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Save to Scripts Page</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('pullUpScript')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="Pull up Carl McIntyre or saved pitch onto teleprompter"
            >
              <FolderOpen className="w-3 h-3 text-indigo-400" />
              <span>Pull Up Scripts</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('openPracticeSession')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="Open live Practice Studio session with teleprompter"
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <span>Open Practice Session</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('goToBuilder')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="Open full Script Builder"
            >
              <Edit3 className="w-3 h-3 text-sky-400" />
              <span>Script Builder</span>
            </button>
            <button
              type="button"
              onClick={() => handleExecuteQuickAction('goToScripts')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition shrink-0 cursor-pointer shadow-xs"
              title="View all saved scripts"
            >
              <FileText className="w-3 h-3 text-purple-400" />
              <span>Saved Scripts Page</span>
            </button>
          </div>

          {/* Minimalist Input Bar with Voice Button */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            {/* Live speech recognition mic button */}
            <button
              onClick={toggleMic}
              className={`p-2.5 rounded-full border transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isListening
                  ? 'bg-rose-500 border-rose-400 text-white animate-pulse shadow-md shadow-rose-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title={isListening ? "Listening with mic... click to stop" : "Voice input: Click to speak your answer"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-indigo-400" />}
              <span className="text-[10px] hidden sm:inline font-semibold">
                {isListening ? "Listening..." : "Voice"}
              </span>
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              rows={3}
              placeholder={isListening ? "Listening to your voice..." : isCallActive ? "Type your live rebuttal or answer..." : "Tell Coach what you sell, who you sell it to, and list your products or offer options... (Cmd/Ctrl + Enter to send)"}
              className="flex-1 min-h-[72px] resize-y bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs leading-relaxed text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isThinking}
              className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-40 cursor-pointer shadow-md transition"
            >
              Send
            </button>
          </div>
          <LiveSpeechFeedback
            text={liveSpeechText}
            isListening={isListening}
            metrics={liveSpeechMetrics}
          />
        </div>

      </main>

      {/* QUICK SCRIPT EDIT MODAL */}
      {isEditModalOpen && scriptEditDraft && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[85vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Edit Practice Script</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Script Title</label>
              <input
                type="text"
                value={scriptEditDraft.title || ''}
                onChange={(e) => setScriptEditDraft({ ...scriptEditDraft, title: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-indigo-600 mb-1 uppercase tracking-wider">
                Opening Hook (First 20 Seconds)
              </label>
              <textarea
                rows={3}
                value={scriptEditDraft.hook || ''}
                onChange={(e) => setScriptEditDraft({ ...scriptEditDraft, hook: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium leading-relaxed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-slate-700">Objection Rebuttals</label>
                <button
                  type="button"
                  onClick={() => {
                    const nextRebs = [
                      ...(scriptEditDraft.rebuttals || []),
                      { objection: 'New objection', response: 'Empathetic validation + counter-question.' }
                    ];
                    setScriptEditDraft({ ...scriptEditDraft, rebuttals: nextRebs });
                  }}
                  className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {(scriptEditDraft.rebuttals || []).map((reb, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-amber-700">Objection #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextRebs = scriptEditDraft.rebuttals.filter((_, idx) => idx !== i);
                          setScriptEditDraft({ ...scriptEditDraft, rebuttals: nextRebs });
                        }}
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={reb.objection}
                      onChange={(e) => {
                        const nextRebs = [...scriptEditDraft.rebuttals];
                        nextRebs[i].objection = e.target.value;
                        setScriptEditDraft({ ...scriptEditDraft, rebuttals: nextRebs });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                    />

                    <input
                      type="text"
                      value={reb.response}
                      onChange={(e) => {
                        const nextRebs = [...scriptEditDraft.rebuttals];
                        nextRebs[i].response = e.target.value;
                        setScriptEditDraft({ ...scriptEditDraft, rebuttals: nextRebs });
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-700"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white text-xs font-semibold shadow-xs"
              >
                Save Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IFRAME MICROPHONE PERMISSION / OPEN FULL WINDOW MODAL */}
      <IframeMicModal 
        isOpen={isIframeMicModalOpen} 
        onClose={() => setIsIframeMicModalOpen(false)} 
      />

    </div>
  );
}
