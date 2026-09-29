import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { 
  Bot, 
  Send, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  RotateCcw, 
  Zap, 
  ArrowRight, 
  Sparkles, 
  Monitor, 
  MonitorOff, 
  ExternalLink, 
  Eye, 
  Save, 
  Layers, 
  ShieldCheck, 
  Flame, 
  Trophy, 
  SlidersHorizontal,
  ChevronRight,
  UserCheck,
  Building2,
  HelpCircle,
  X
} from 'lucide-react';
import { playTelephoneRing, playPickupClick, playHangupClick } from '../lib/soundUtils';
import { 
  askGeminiCoach, 
  analyzeScreenWithGemini, 
  researchProspectWithGemini, 
  getGeminiTTSAudio,
  getDeepgramTTSAudio
} from '../lib/geminiClient';
import { supabase } from '../supabaseClient';
import GeminiLiveAvatar, { HUMAN_PERSONAS } from '../components/GeminiLiveAvatar';
import { 
  getCoachMemory, 
  saveCoachMemory, 
  extractMemoryFromInput, 
  generateMemoryAwareFallback 
} from '../lib/coachMemory';

export const AGENT_HATS = {
  COACH: 'coach',
  PROSPECT: 'prospect'
};

// Official Google Gemini Live Neural Prebuilt Voices
export const GEMINI_LIVE_VOICES = [
  { id: 'Fenrir', name: 'Fenrir', gender: 'male', tone: 'Authoritative & resonant sales coach', recommendedFor: 'Marcus Vance' },
  { id: 'Puck', name: 'Puck', gender: 'male', tone: 'Energetic, natural American peer', recommendedFor: 'Cold Call Rep' },
  { id: 'Charon', name: 'Charon', gender: 'male', tone: 'Deep, gruff, grounded contractor', recommendedFor: 'Hank Miller' },
  { id: 'Orus', name: 'Orus', gender: 'male', tone: 'Calm, measured, analytical executive', recommendedFor: 'Executive Buyer' },
  { id: 'Aoede', name: 'Aoede', gender: 'female', tone: 'Articulate, confident deal closer', recommendedFor: 'Elena Rostova' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'female', tone: 'Crisp, direct, commercial director', recommendedFor: 'Sarah Chen' },
  { id: 'Kore', name: 'Kore', gender: 'female', tone: 'Warm, conversational, balanced', recommendedFor: 'Discovery Specialist' },
  { id: 'Leda', name: 'Leda', gender: 'female', tone: 'Expressive, friendly, engaging', recommendedFor: 'Customer Success' }
];

// Deepgram Aura Ultra-Realistic Voice Fallback Engine
export const DEEPGRAM_AURA_VOICES = [
  { id: 'aura-orion-en', name: 'Aura Orion', gender: 'male', tone: 'Deep, natural American sales mentor', recommendedFor: 'Marcus Vance' },
  { id: 'aura-arcas-en', name: 'Aura Arcas', gender: 'male', tone: 'Grounded, authentic American contractor', recommendedFor: 'Hank Miller' },
  { id: 'aura-perseus-en', name: 'Aura Perseus', gender: 'male', tone: 'Energetic, fast-paced sales pro', recommendedFor: 'Cold Caller' },
  { id: 'aura-angus-en', name: 'Aura Angus', gender: 'male', tone: 'Rugged, seasoned commercial trade owner', recommendedFor: 'HVAC Owner' },
  { id: 'aura-stella-en', name: 'Aura Stella', gender: 'female', tone: 'Articulate, confident enterprise closer', recommendedFor: 'Elena Rostova' },
  { id: 'aura-asteria-en', name: 'Aura Asteria', gender: 'female', tone: 'Warm, polished, conversational director', recommendedFor: 'Sarah Chen' },
  { id: 'aura-luna-en', name: 'Aura Luna', gender: 'female', tone: 'Natural, expressive, engaging advisor', recommendedFor: 'Customer Success' }
];

export default function CoachPage({ setScript: setGlobalScript, setPracticeSettings }) {
  const navigate = useNavigate();

  // Active Agent Hat: 'coach' (Zero-BS Mentor) | 'prospect' (Target Buyer in character)
  const [currentHat, setCurrentHat] = useState(AGENT_HATS.COACH);

  // Active Persona Key: 'marcus' | 'elena' | 'hank' | 'sarah'
  const [currentPersonaKey, setCurrentPersonaKey] = useState('marcus');

  // Available browser speech voices & custom voice tuning state
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('scriptmaster_voice_settings');
      return saved ? JSON.parse(saved) : {
        marcusVoice: '',
        hankVoice: '',
        elenaVoice: '',
        sarahVoice: '',
        speed: 0.98,
        pitch: 1.0,
      };
    } catch {
      return { marcusVoice: '', hankVoice: '', elenaVoice: '', sarahVoice: '', speed: 0.98, pitch: 1.0 };
    }
  });

  const saveVoiceSetting = (key, val) => {
    setVoiceSettings(prev => {
      const next = { ...prev, [key]: val };
      localStorage.setItem('scriptmaster_voice_settings', JSON.stringify(next));
      return next;
    });
  };

  // Audio Modality Widgets (Single-click toggles as requested)
  // TTS is automatically ON by default; Mic starts off until clicked or requested
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);

  // Coach Conversational Memory & Live Speech Visual State
  const [coachMemory, setCoachMemory] = useState(() => getCoachMemory());
  const [currentSpeechBubble, setCurrentSpeechBubble] = useState('');
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  // Screen Sharing / Co-Browsing State
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [screenAnalyzing, setScreenAnalyzing] = useState(false);
  const [screenIntelReport, setScreenIntelReport] = useState(null);

  // Active Target Prospect (Researched or Baseline)
  const [currentProspect, setCurrentProspect] = useState({
    name: 'Miller HVAC Solutions',
    ownerName: 'Hank Miller',
    ownerRole: 'Owner & General Contractor',
    city: 'Austin, TX',
    industry: 'HVAC & Refrigeration Services',
    bleedingNeckPain: 'Losing $3,200/week from technicians handwriting extra copper and freon on paper slips that get lost under truck seats',
    personalizationMarkers: [
      'Local Austin / Central TX service area',
      'Mention of 12 service vans on the road',
      'Recent 5-star review praising their emergency weekend dispatch'
    ],
    friendshipAnalogy: 'Bonding over commonalities: Most people bond over similarities and feel connected to people who share the same likes, background, and beliefs (like recommending shared TV shows). Match their regional dialect, Austin references, and trade background.'
  });

  // Dynamic Branching Script State (Co-created with the Agent)
  const [activeBranchingScript, setActiveBranchingScript] = useState(null);
  const [activeBranchIndex, setActiveBranchIndex] = useState(0);

  // Onboarding & Baseline Diagnostic Progress State
  const [onboardingStage, setOnboardingStage] = useState(() => {
    const baselineDone = localStorage.getItem('scriptmaster_baseline_completed');
    if (baselineDone === 'true') return 'completed';
    const goalsSet = localStorage.getItem('scriptmaster_user_goals');
    if (goalsSet) return 'ready_for_baseline';
    return 'greeting_pending';
  });

  const [userGoals, setUserGoals] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('scriptmaster_user_goals') || 'null');
    } catch {
      return null;
    }
  });

  const [baselineScoreReport, setBaselineScoreReport] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('scriptmaster_baseline_report') || 'null');
    } catch {
      return null;
    }
  });

  // Call Simulation States
  const [isRinging, setIsRinging] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [liveCoachTip, setLiveCoachTip] = useState('Voice or text input ready. Agent text is always visible.');
  const [lastDebrief, setLastDebrief] = useState(null);

  // Research Input Bar State
  const [researchQuery, setResearchQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);

  // Unified Chat Message Stream
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [savedNotice, setSavedNotice] = useState(null);

  // DOM References
  const chatContainerRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const activeAudioRef = useRef(null);

  // Auto-scroll chat container ONLY (NEVER scroll the browser window/page down!)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Pre-load and sync available browser speech voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const updateVoices = () => {
        const vList = window.speechSynthesis.getVoices() || [];
        setAvailableVoices(vList);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Text pre-processing for natural, human cadence (removes mechanical speech artifacts)
  const prepareTextForSpeech = (rawText) => {
    if (!rawText) return '';
    return rawText
      // Strip markdown asterisks, hashes, backticks, pipes
      .replace(/[*_#`~|]/g, '')
      // Strip emojis so TTS engine doesn't read out emoji names
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Remove bracketed stage cues like (Chuckles), (Sighs), (Pause)
      .replace(/\([^)]*\)/g, '')
      // Remove leading bullets and dashes
      .replace(/^[\s•\-*]+/gm, '')
      // Conversational pronunciation of acronyms
      .replace(/\bHVAC\b/gi, 'H-VAC')
      .replace(/\bSaaS\b/gi, 'Sass')
      .replace(/\bB2B\b/gi, 'B to B')
      .replace(/\bB2C\b/gi, 'B to C')
      .replace(/\bCRM\b/gi, 'C-R-M')
      .replace(/\bROI\b/gi, 'R-O-I')
      .replace(/\be\.g\.,?\b/gi, 'for example,')
      .replace(/\bi\.e\.,?\b/gi, 'that is,')
      .replace(/\bvs\.?\b/gi, 'versus')
      .replace(/\b50%\b/g, '50 percent')
      .replace(/(\d+)%/g, '$1 percent')
      .replace(/\b(\d+)\s*sec\b/gi, '$1 seconds')
      .replace(/\b(\d+)\s*min\b/gi, '$1 minutes')
      // Smooth out linebreaks into breath pauses
      .replace(/\n+/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper: Find authentic American natural voice matching EXACT persona gender & character
  const getBestNaturalBrowserVoice = (personaKey) => {
    if (!window.speechSynthesis) return null;
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Check if user configured an explicit voice for this persona
    const savedVoiceName = voiceSettings[`${personaKey}Voice`];
    if (savedVoiceName) {
      const explicit = voices.find(v => v.name === savedVoiceName);
      if (explicit) return explicit;
    }

    const persona = HUMAN_PERSONAS[personaKey] || HUMAN_PERSONAS.marcus;
    const isMale = persona.gender === 'male';

    // 2. Strictly isolate American English voices (en-US or en_US)
    // EXCLUDE all British English (en-GB), Australian (en-AU), Scottish, or foreign accents
    const isForeignAccent = (v) => 
      v.lang.includes('GB') ||
      v.lang.includes('AU') ||
      v.lang.includes('IN') ||
      v.lang.includes('IE') ||
      /uk|british|scotland|ireland|australia|india/i.test(v.name) ||
      /daniel|george|oliver|arthur|rishi|karen \(australia\)|fiona/i.test(v.name);

    const americanVoices = voices.filter(v => 
      (v.lang === 'en-US' || v.lang === 'en_US' || v.lang.startsWith('en-US')) &&
      !isForeignAccent(v)
    );

    const pool = americanVoices.length > 0 ? americanVoices : voices.filter(v => v.lang.startsWith('en') && !isForeignAccent(v));

    if (isMale) {
      // Find authentic American MALE voices (Marcus Vance or Hank Miller)
      // 1. Natural / Online / Google named male voices
      const naturalMale = pool.find(v => 
        /natural|online|google|neural|enhanced|premium/i.test(v.name) &&
        !/female|woman|girl|jenny|aria|samantha|zira|karen|ava|michelle/i.test(v.name) &&
        /guy|christopher|davis|jason|david|mark|alex|male/i.test(v.name)
      );
      if (naturalMale) return naturalMale;

      // 2. Specific American male voices
      const specificMale = pool.find(v => 
        !/female|woman|girl|jenny|aria|samantha|zira|karen|ava|michelle/i.test(v.name) &&
        /guy|christopher|davis|jason|david|mark|alex|fred/i.test(v.name)
      );
      if (specificMale) return specificMale;

      // 3. Any American voice not flagged as female or legacy desktop
      const genericNonFemale = pool.find(v => 
        !/female|woman|girl|jenny|aria|samantha|zira|karen|ava|michelle|desktop|espeak/i.test(v.name)
      );
      if (genericNonFemale) return genericNonFemale;

      const anyNonFemale = pool.find(v => !/female|woman|girl|jenny|aria|samantha|zira/i.test(v.name));
      if (anyNonFemale) return anyNonFemale;
    } else {
      // Find authentic American FEMALE voices (Elena Rostova or Sarah Chen)
      // 1. Natural / Online / Google named female voices
      const naturalFemale = pool.find(v => 
        /natural|online|google|neural|enhanced|premium/i.test(v.name) &&
        !/male|guy|david|george|alex/i.test(v.name) &&
        /jenny|aria|ava|samantha|zira|michelle|female/i.test(v.name)
      );
      if (naturalFemale) return naturalFemale;

      // 2. Specific American female voices
      const specificFemale = pool.find(v => 
        !/male|guy|david|george|alex/i.test(v.name) &&
        /jenny|aria|ava|samantha|zira|michelle|female/i.test(v.name)
      );
      if (specificFemale) return specificFemale;

      // 3. Any American female
      const anyFemale = pool.find(v => /female|samantha|zira|aria/i.test(v.name));
      if (anyFemale) return anyFemale;
    }

    return pool[0] || voices[0];
  };

  // Fallback: Natural-filtered browser speech synthesis (calibrated for human rhythm and persona pitch)
  const fallbackNaturalBrowserSpeak = (text, personaKey = currentPersonaKey) => {
    if (!window.speechSynthesis) return;

    const persona = HUMAN_PERSONAS[personaKey] || HUMAN_PERSONAS.marcus;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      // Calibrated rate & pitch for warm, relaxed human cadence matched to character & user settings
      const baseRate = persona.rate || 0.98;
      const basePitch = persona.pitch || 1.0;
      utterance.rate = Math.max(0.7, Math.min(1.3, (voiceSettings.speed || 1.0) * baseRate));
      utterance.pitch = Math.max(0.7, Math.min(1.3, (voiceSettings.pitch || 1.0) * basePitch));

      window._activeSpeechUtterance = utterance;

      const bestVoice = getBestNaturalBrowserVoice(personaKey);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onstart = () => {
        setIsAgentSpeaking(true);
        setIsAudioBlocked(false);
      };
      utterance.onend = () => {
        setIsAgentSpeaking(false);
        window._activeSpeechUtterance = null;
      };
      utterance.onerror = (e) => {
        setIsAgentSpeaking(false);
        if (e.error === 'not-allowed') {
          setIsAudioBlocked(true);
        }
        try { window.speechSynthesis.resume(); } catch (_) {}
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Browser TTS fallback error:', err);
      setIsAgentSpeaking(false);
      setIsAudioBlocked(true);
    }
  };

  // Studio-Grade Voice Engine:
  // 1. Tries Gemini Neural Voice (if available) with exact character mapping
  // 2. Automatically uses persona-matched American English voice (Male for men, Female for women)
  const speakText = async (text, targetPersonaKey = null) => {
    if (!text) return;
    
    const effectivePersonaKey = targetPersonaKey || currentPersonaKey || (currentHat === AGENT_HATS.PROSPECT ? 'hank' : 'marcus');
    const persona = HUMAN_PERSONAS[effectivePersonaKey] || HUMAN_PERSONAS.marcus;

    // Clean text into natural spoken cadence
    const cleanSpeechText = prepareTextForSpeech(text);

    setCurrentSpeechBubble(cleanSpeechText);

    if (isAgentMuted) return;

    // Stop any existing playing audio
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      } catch (_) {}
    }
    window.speechSynthesis?.cancel();

    setIsAgentSpeaking(true);
    setIsAudioBlocked(false);

    // 1. Primary: Try Gemini Live Neural Audio (Stable, realistic voices: Fenrir, Puck, Charon, Aoede, Zephyr)
    try {
      const neuralVoice = voiceSettings[`${effectivePersonaKey}GeminiVoice`] || persona.geminiVoice || (persona.gender === 'male' ? 'Fenrir' : 'Aoede');
      const ttsResult = await getGeminiTTSAudio(cleanSpeechText, neuralVoice, persona.gender, effectivePersonaKey);
      if (ttsResult && ttsResult.audioBase64) {
        const audio = new Audio(`data:${ttsResult.mimeType || 'audio/wav'};base64,${ttsResult.audioBase64}`);
        activeAudioRef.current = audio;

        audio.onplay = () => {
          setIsAgentSpeaking(true);
          setIsAudioBlocked(false);
        };
        audio.onended = () => {
          setIsAgentSpeaking(false);
          activeAudioRef.current = null;
        };
        audio.onerror = () => {
          activeAudioRef.current = null;
          tryDeepgramFallback();
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            setIsAudioBlocked(true);
            tryDeepgramFallback();
          });
        }
        return;
      }
    } catch (_) {
      // Continue to Tier 2 Deepgram Fallback
    }

    // 2. Secondary Fallback: Deepgram Aura Ultra-Realistic Voice (Famous for human breath & realism)
    const tryDeepgramFallback = async () => {
      try {
        const defaultDeepgramModel = effectivePersonaKey === 'hank' ? 'aura-arcas-en' :
          effectivePersonaKey === 'marcus' ? 'aura-orion-en' :
          effectivePersonaKey === 'sarah' ? 'aura-asteria-en' : 'aura-stella-en';
        
        const deepgramModel = voiceSettings[`${effectivePersonaKey}DeepgramVoice`] || defaultDeepgramModel;
        const dgResult = await getDeepgramTTSAudio(cleanSpeechText, deepgramModel);
        
        if (dgResult && dgResult.audioBase64) {
          const audio = new Audio(`data:${dgResult.mimeType || 'audio/mp3'};base64,${dgResult.audioBase64}`);
          activeAudioRef.current = audio;

          audio.onplay = () => {
            setIsAgentSpeaking(true);
            setIsAudioBlocked(false);
          };
          audio.onended = () => {
            setIsAgentSpeaking(false);
            activeAudioRef.current = null;
          };
          audio.onerror = () => {
            activeAudioRef.current = null;
            fallbackNaturalBrowserSpeak(cleanSpeechText, effectivePersonaKey);
          };

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              fallbackNaturalBrowserSpeak(cleanSpeechText, effectivePersonaKey);
            });
          }
          return;
        }
      } catch (_) {}

      // 3. Tertiary Fallback: Client-side Natural American Device Voice
      fallbackNaturalBrowserSpeak(cleanSpeechText, effectivePersonaKey);
    };

    await tryDeepgramFallback();
  };

  // Audio Unlocker for browser autoplay policies
  const unlockAudio = () => {
    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.play().catch(() => {});
      }
      window.speechSynthesis?.resume();
      setIsAudioBlocked(false);
      if (currentSpeechBubble) {
        speakText(currentSpeechBubble);
      }
    } catch (_) {}
  };

  // 1-Click Hearing Widget Toggle
  const toggleHearingWidget = () => {
    const newMuted = !isAgentMuted;
    setIsAgentMuted(newMuted);
    if (newMuted) {
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
          activeAudioRef.current = null;
        } catch (_) {}
      }
      window.speechSynthesis?.cancel();
      setIsAgentSpeaking(false);
      showToast('Agent Voice Muted (Text Only)');
    } else {
      showToast('Agent Voice Enabled');
      speakText('Voice audio is on. I am ready to coach you.');
    }
  };

  // 1-Click Mic Widget Toggle: Starts/stops voice recognition to talk directly with Coach
  const toggleMicWidget = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser. Please type below.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
      showToast('Microphone Off');
      return;
    }

    // If agent was speaking, interrupt agent first so user can speak immediately!
    if (isAgentSpeaking) {
      window.speechSynthesis?.cancel();
      setIsAgentSpeaking(false);
      setCurrentSpeechBubble('');
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('🎙️ Coach is Listening... Speak your pitch or question now!');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          handleUserSend(transcript);
        }
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  const showToast = (msg) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  // GREETING ON OPENING APP:
  // When opening up the app, user is immediately greeted aloud and visually by the Human Avatar Coach!
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    const memory = getCoachMemory();
    const userName = memory.userName || (user.name && user.name !== 'Sales Rep' ? user.name.split(' ')[0] : 'there');

    const greetingText = `Hey ${userName}! I'm Marcus, your AI Sales Coach. Welcome to ScriptMaster! Let's get straight to work with zero fluff.\n\nTap my avatar or mic anytime to speak to me directly! Tell me: **what are you selling**, **what are your main sales goals**, and **what objections or roadblocks do you struggle with the most?**\n\nSpeak out loud or type below, and I'll calibrate your personalized game plan!`;
    const spokenGreeting = `Hey ${userName}! I'm Marcus, your AI Sales Coach. Welcome to ScriptMaster! Tap my avatar to speak with me out loud. What are you selling, and what sales challenges do you want to master today?`;

    const initGreeting = {
      id: `init-${Date.now()}`,
      hat: AGENT_HATS.COACH,
      speaker: 'Coach',
      name: 'AI Sales Coach',
      text: greetingText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([initGreeting]);
    setCurrentSpeechBubble(spokenGreeting);

    // Speak greeting aloud immediately using Marcus's authentic male voice
    const timer = setTimeout(() => {
      speakText(spokenGreeting, 'marcus');
    }, 400);

    // Global one-time gesture unlock for browsers with strict audio autoplay policies
    const handleFirstGesture = () => {
      try {
        window.speechSynthesis?.resume();
      } catch (_) {}
      // If audio was blocked on initial load, trigger greeting speech on first tap/click!
      speakText(spokenGreeting, 'marcus');
    };
    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, []);

  // SCREEN SHARING & CO-BROWSING TOOL:
  // Allows the Coach to see user's active screen/browser tab in real time!
  const startScreenShare = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        showToast('Screen sharing is not supported in this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      setScreenStream(stream);
      setIsSharingScreen(true);
      showToast('Screen sharing connected! The Coach can now see your screen.');

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      // Handle user stopping stream via browser native stop button
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Coach speaks acknowledgment
      speakText("I can see your screen now. Open any prospect's website, LinkedIn, or CRM entry and click 'Analyze Screen' so we can extract key personalization markers together!");

      const coachNotice = {
        id: `screen-share-${Date.now()}`,
        hat: AGENT_HATS.COACH,
        speaker: 'Coach',
        name: 'AI Sales Coach',
        text: `🖥️ **Live Screen Co-Pilot Connected!**\n\nI can now see your active screen in real-time. Navigate to your target prospect's website, Google reviews, or LinkedIn profile. When ready, click **"🔍 Analyze Screen with Coach"** and I will extract personalization hooks and explain how to apply the Friendship & Commonalities principle!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, coachNotice]);

    } catch (err) {
      console.warn('Screen share error or cancelled:', err);
      showToast('Screen share was not started.');
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    setScreenStream(null);
    setIsSharingScreen(false);
    showToast('Screen sharing disconnected.');
  };

  // Analyze active screen frame with Gemini Vision
  const handleAnalyzeScreen = async () => {
    if (!videoPreviewRef.current || !screenStream) {
      showToast('Please start screen sharing first.');
      return;
    }

    setScreenAnalyzing(true);
    showToast('Coach is analyzing your screen...');

    try {
      const video = videoPreviewRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

      const result = await analyzeScreenWithGemini({
        imageBase64,
        currentBusiness: currentProspect
      });

      setScreenAnalyzing(false);

      if (result && result.analysis) {
        setScreenIntelReport(result.analysis);

        const screenAnalysisMsg = {
          id: `screen-res-${Date.now()}`,
          hat: AGENT_HATS.COACH,
          speaker: 'Coach',
          name: 'AI Sales Coach (Screen Vision)',
          text: result.analysis,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, screenAnalysisMsg]);
        speakText("I've analyzed what's on your screen. Check the personalization markers and the friendship bonding angle I broke down in our chat!");
      } else {
        // Fallback intelligent extraction
        const fallbackAnalysis = `### 🔍 Screen Intel Detected:\n• Identified target prospect company and regional service footprint.\n• Located key decision maker profile and public customer feedback.\n\n### 🤝 Personalization & Commonalities Principle:\nRemember: **People bond over similarities and feel connected to people who share the same likes and beliefs** (just like recommending TV shows to close friends). When you call, reference their specific city, trade nuances, and regional cues.\n\n### 🎯 Recommended Opening Line:\n*"Hey Hank, Alex here. I noticed you guys have been covering the Austin north sector since 1998. Give me 20 seconds before you head into your next job site: if this isn't directly relevant to stopping unbilled change orders on your vans, tell me to jump in a lake. Fair?"*`;
        
        const fallbackMsg = {
          id: `screen-res-${Date.now()}`,
          hat: AGENT_HATS.COACH,
          speaker: 'Coach',
          name: 'AI Sales Coach (Screen Vision)',
          text: fallbackAnalysis,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, fallbackMsg]);
        speakText("I analyzed your screen. Check the key personalization markers and opening line in the chat.");
      }
    } catch (err) {
      console.error('Screen capture analysis error:', err);
      setScreenAnalyzing(false);
      showToast('Could not analyze screen frame.');
    }
  };

  // PROSPECT RESEARCH & INTEL TOOL
  const handleResearchProspect = async (e) => {
    e?.preventDefault();
    if (!researchQuery.trim() || isResearching) return;

    setIsResearching(true);
    showToast(`Researching ${researchQuery}...`);

    try {
      const intel = await researchProspectWithGemini({
        query: researchQuery,
        companyName: researchQuery
      });

      setIsResearching(false);

      if (intel && (intel.companyName || intel.decisionMaker)) {
        const updatedProspect = {
          name: intel.companyName || researchQuery,
          ownerName: intel.decisionMaker || 'Target Owner',
          ownerRole: intel.role || 'Managing Director',
          city: intel.city || 'Regional Area',
          industry: intel.trade || 'Commercial Services',
          bleedingNeckPain: intel.bleedingNeckPain || 'Losing thousands weekly on field technician unbilled materials and paperwork delays',
          personalizationMarkers: intel.personalizationMarkers || [
            'Regional market presence',
            'Customer satisfaction focus',
            'High-velocity service dispatch'
          ],
          friendshipAnalogy: intel.friendshipAnalogy || 'Bonding over commonalities: Most people bond over similarities and feel connected to people who share the same likes and beliefs.',
          dumbVsTechnical: intel.dumbVsTechnicalComparison || {
            dumb: 'Do you guys want more leads or software?',
            overlyTechnical: 'We orchestrate multi-tenant event-driven webhook microservices for dispatch.',
            sweetSpot: 'Hank, are your techs handwriting extra copper and freon on paper slips that get lost under truck seats?'
          }
        };

        setCurrentProspect(updatedProspect);
        setResearchQuery('');

        // Generate dynamic branching script for this prospect
        const branchingScript = buildDynamicBranchingScript(updatedProspect);
        setActiveBranchingScript(branchingScript);

        const researchMsg = {
          id: `intel-${Date.now()}`,
          hat: AGENT_HATS.COACH,
          speaker: 'Coach',
          name: 'AI Sales Coach',
          text: `🎯 **Intel Gathered for ${updatedProspect.name}!**\n\n• **Decision Maker:** ${updatedProspect.ownerName} (${updatedProspect.ownerRole})\n• **Bleeding Neck Pain:** ${updatedProspect.bleedingNeckPain}\n\n**🤝 Commonalities & Friendship Bonding Strategy:**\n${updatedProspect.friendshipAnalogy}\n\n**⚖️ Tone Calibration (Avoiding Dumb vs. Overly Technical):**\n• ❌ **Sounds Dumb/Amateur:** "${updatedProspect.dumbVsTechnical?.dumb || 'Are you the guy who signs checks?'}"\n• ❌ **Overly Technical/Robotic:** "${updatedProspect.dumbVsTechnical?.overlyTechnical || 'We leverage automated cloud telemetry.'}"\n• ✅ **The Sweet Spot:** "${updatedProspect.dumbVsTechnical?.sweetSpot || 'Hank, how are your guys capturing extra parts on emergency calls?'}"\n\nI also drafted a **Dynamic Branching Script** below that breaks off into each objection direction. Review the branches and let's practice with it!`,
          script: branchingScript,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, researchMsg]);
        speakText(`Intel gathered for ${updatedProspect.name}. I built a dynamic branching script covering multiple objection paths. Review the branches or let's practice!`);
      } else {
        // Fallback local intelligence
        const fallbackProspect = {
          ...currentProspect,
          name: researchQuery,
          ownerName: 'Frank Davis'
        };
        setCurrentProspect(fallbackProspect);
        const script = buildDynamicBranchingScript(fallbackProspect);
        setActiveBranchingScript(script);

        const fallbackMsg = {
          id: `intel-${Date.now()}`,
          hat: AGENT_HATS.COACH,
          speaker: 'Coach',
          name: 'AI Sales Coach',
          text: `🎯 **Custom Intel Configured for ${researchQuery}:**\n\nI have configured the prospect persona and generated a dynamic branching script with personalized commonalities. Check the branch navigator below!`,
          script,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, fallbackMsg]);
        speakText(`Configured intel for ${researchQuery}. Check the dynamic script branches!`);
      }
    } catch (err) {
      console.error('Research error:', err);
      setIsResearching(false);
      showToast('Could not complete research.');
    }
  };

  // Helper to build a Dynamic Branching Script
  const buildDynamicBranchingScript = (prospect) => {
    const firstName = prospect.ownerName ? prospect.ownerName.split(' ')[0] : 'Hank';
    return {
      id: `script-${Date.now()}`,
      name: `${prospect.name} - Dynamic Branching Closer Script`,
      targetProspect: prospect.ownerName,
      company: prospect.name,
      steps: [
        {
          id: 'step-1',
          name: 'Step 1: Commonalities & Pattern Interrupt',
          scriptLine: `Hey ${firstName}, Alex here. I know you weren't expecting my call and you're probably in your truck heading down Lamar Blvd, but give me literally 20 seconds: if this isn't relevant to how your vans operate, tell me to jump in a lake. Fair?`,
          peerExplanation: 'Disarms natural defense in 5 seconds by mentioning their specific location and giving them control.'
        },
        {
          id: 'step-2',
          name: 'Step 2: Bleeding Neck Pain Hook',
          scriptLine: `When your technicians finish an emergency dispatch on-site, how do you guarantee all extra copper, freon, and labor hours get billed before they drive off?`,
          peerExplanation: 'Directly addresses the $3,000/week leak without sounding academic or salesy.'
        },
        {
          id: 'step-3',
          name: 'Step 3: High-Value Contrast (Zero Jargon)',
          scriptLine: `Most contractors tell me they hate tools like BuilderTrend or Jobber because it costs $400/month and field crews refuse to touch it. Ours has only 2 buttons: snap photo, tap approval, invoices go out in 48 hours.`,
          peerExplanation: 'Contrasts against bloated software using the contractor\'s own language.'
        }
      ],
      branches: [
        {
          id: 'branch-1',
          condition: 'If Prospect Says: "I\'m busy in my truck right now"',
          responseLine: `${firstName}, I respect that you're running calls right now. I'll take 15 seconds: Are your technicians handwriting extra parts on paper tickets that get lost under truck seats? If not, I'll hang up right now.`,
          whyItWorks: 'Validates their immediate time constraint while anchoring to a dollar loss.'
        },
        {
          id: 'branch-2',
          condition: 'If Prospect Says: "Just send me an email / brochure"',
          responseLine: `${firstName}, I could send an email, but honestly your inbox is probably slammed with 50 vendor pitches a day. Give me literally 20 seconds right now: if this doesn't plug unbilled change orders, tell me to jump in a lake and I won't call again. Fair enough?`,
          whyItWorks: 'The 20-second contract disarms the automatic brush-off.'
        },
        {
          id: 'branch-3',
          condition: 'If Prospect Pushes Back on 50% Upfront Deposit: "I don\'t pay upfront"',
          responseLine: `${firstName}, I completely get why you ask—plenty of agencies take a deposit, disappear for three weeks, and deliver broken software. The 50% deposit locks in your dedicated sprint exclusively on our calendar. And we milestone-stage it: you test the staging portal and approve Milestone 1 before the second 50% is released. Equal risk on both sides.`,
          whyItWorks: 'Addresses fear without discounting, anchoring to milestone escrow.'
        },
        {
          id: 'branch-4',
          condition: 'If Prospect Shows Interest: "What\'s the next step?"',
          responseLine: `Let's do 10 minutes tomorrow morning at 8:30 AM before your guys roll out. I'll walk you through the live mobile screen. What's your direct cell?`,
          whyItWorks: 'Locks in a concrete morning time before field crews roll out.'
        }
      ]
    };
  };

  // START CALL (Switch to Prospect Hat)
  const handleStartCall = (isBaselineCall = false) => {
    setIsRinging(true);
    setCallDuration(0);
    playTelephoneRing();

    setTimeout(() => {
      setIsRinging(false);
      setIsCallActive(true);
      setCurrentHat(AGENT_HATS.PROSPECT);
      playPickupClick();

      let greeting = '';
      if (isBaselineCall) {
        greeting = `Miller HVAC, Hank speaking. Make it quick, I'm pulling up to a supply house. What's this regarding?`;
      } else {
        const firstName = currentProspect.ownerName.split(' ')[0];
        greeting = `${currentProspect.name}, ${firstName} speaking. What's going on?`;
      }

      const prospectMsg = {
        id: `call-start-${Date.now()}`,
        hat: AGENT_HATS.PROSPECT,
        speaker: 'Prospect',
        name: `${currentProspect.ownerName} (${currentProspect.name})`,
        text: greeting,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, prospectMsg]);
      speakText(greeting);

      if (isBaselineCall) {
        setLiveCoachTip('🎯 BASELINE TEST: Deliver your natural 5-second Pattern Interrupt. Do NOT ask "How are you today?"');
      } else {
        setLiveCoachTip(`📞 IN CHARACTER: Pitching ${currentProspect.ownerName}. Test your dynamic branches!`);
      }
    }, 1800);
  };

  // END CALL & DEBRIEF (Switch back to Coach Hat)
  const handleEndCall = () => {
    window.speechSynthesis?.cancel();
    playHangupClick();
    setIsCallActive(false);
    setIsAgentSpeaking(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setIsListening(false);
    setCurrentHat(AGENT_HATS.COACH);

    const isBaseline = onboardingStage === 'ready_for_baseline' || onboardingStage === 'greeting_pending';

    // Calculate score & debrief
    const userUtterances = messages.filter(m => m.speaker === 'You');
    const userWordsCount = userUtterances.reduce((acc, m) => acc + m.text.split(' ').length, 0);

    const calculatedScore = Math.min(94, Math.max(65, 68 + Math.floor(userWordsCount / 10)));

    const report = {
      score: calculatedScore,
      duration: formatTime(callDuration),
      level: calculatedScore > 85 ? 'Closer Elite (Advanced)' : calculatedScore > 75 ? 'Hungry Hunter (Intermediate)' : 'Developing Prospector (Baseline)',
      strengths: [
        'Assertive call pace and willingness to engage',
        'Directness—avoided passive apologies for calling',
        'Clear delivery of value contrast'
      ],
      weaknesses: [
        'Risk of sounding slightly robotic or overly technical if reading a script line by line',
        'Needs sharper execution of the 5-second pattern interrupt to bypass automatic brush-offs',
        'Hesitation when counter-proposing the 50% deposit with milestone escrow'
      ],
      tips: [
        'Remember the Commonalities Principle: Mention a local landmark or shared trade reality early to establish peer credibility.',
        'Never say "Are you the decision maker who buys software?" Instead ask: "Who handles unbilled field tickets on your vans?"',
        'When they hesitate on price, offer Milestone Escrow immediately: "You test Milestone 1 before releasing the final half."'
      ],
      toneCalibration: {
        dumb: '"Hey, do you guys want to buy my software tool?"',
        overlyTechnical: '"We deploy API-driven relational schemas to optimize technician telemetry."',
        sweetSpot: '"Hank, are your techs handwriting extra copper on paper slips that get lost under truck seats?"'
      }
    };

    setLastDebrief(report);

    if (isBaseline) {
      localStorage.setItem('scriptmaster_baseline_completed', 'true');
      localStorage.setItem('scriptmaster_baseline_report', JSON.stringify(report));
      setOnboardingStage('completed');
      setBaselineScoreReport(report);

      const debriefMsg = {
        id: `debrief-baseline-${Date.now()}`,
        hat: AGENT_HATS.COACH,
        speaker: 'Coach',
        name: 'AI Sales Coach',
        text: `🏁 **Baseline Diagnostic Completed! (${report.score}/100)**\n\n• **Your Starting Level:** ${report.level}\n• **Duration:** ${report.duration}\n\n**💪 Your Natural Strengths:**\n${report.strengths.map(s => `• ${s}`).join('\n')}\n\n**⚠️ Target Areas We Need to Tackle:**\n${report.weaknesses.map(w => `• ${w}`).join('\n')}\n\n**💡 Coach's Actionable Tips:**\n${report.tips.map(t => `• ${t}`).join('\n')}\n\n**⚖️ Tone Calibration:**\n• ❌ **Amateur:** ${report.toneCalibration.dumb}\n• ❌ **Too Technical:** ${report.toneCalibration.overlyTechnical}\n• ✅ **The Sweet Spot:** ${report.toneCalibration.sweetSpot}\n\nOur baseline is locked in! Now me and you will build our scripts ourselves. Share your screen or search a prospect below to start gathering intel and building our dynamic branching script!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, debriefMsg]);
      speakText(`Baseline completed! Your starting score is ${report.score}. I've outlined your strengths, weaknesses, and key tips in the chat. Now let's build our personalized scripts together.`);
    } else {
      const practiceDebriefMsg = {
        id: `debrief-practice-${Date.now()}`,
        hat: AGENT_HATS.COACH,
        speaker: 'Coach',
        name: 'AI Sales Coach',
        text: `👔 **Practice Call Debrief (${report.score}/100)**\n\n• **Duration:** ${report.duration}\n• **Strengths:** ${report.strengths.join(' | ')}\n• **Weaknesses:** ${report.weaknesses.join(' | ')}\n\n**Actionable Tips:**\n${report.tips.map(t => `• ${t}`).join('\n')}\n\nReview the feedback above and let's run another practice or tweak our dynamic script branches!`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, practiceDebriefMsg]);
      speakText(`Practice call finished! Your score is ${report.score}. Review the tips in our chat.`);
    }
  };

  // HANDLE USER MESSAGE (Voice or Typed) - Fully Memory-Aware
  const handleUserSend = async (userText) => {
    const text = (userText || inputText).trim();
    if (!text) return;

    // 1. Extract and update coach conversational memory from user input!
    const updatedMemory = extractMemoryFromInput(text, coachMemory);
    setCoachMemory(updatedMemory);

    const userName = updatedMemory.userName || 'You';
    const userMsg = {
      id: `usr-${Date.now()}`,
      speaker: 'You',
      name: updatedMemory.userName ? `You (${updatedMemory.userName})` : 'You (Sales Rep)',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');
    setIsThinking(true);

    // If call is active: Agent responds in PROSPECT character
    if (isCallActive) {
      try {
        const geminiRes = await askGeminiCoach({
          systemPrompt: `You are roleplaying in character as ${currentProspect.ownerName}, owner of ${currentProspect.name} in ${currentProspect.city}. You are a busy contractor, skeptical of vendor sales pitches, but willing to listen if they offer direct value and respect your time. Respond in character with realistic dialogue (1-2 sentences).`,
          messages: nextMessages,
          userMessage: text,
          currentBusiness: currentProspect,
          stage: 'call_active',
          userMemory: updatedMemory
        });

        setIsThinking(false);

        let replyText = geminiRes?.text || '';
        if (!replyText) {
          replyText = generateMemoryAwareFallback({
            userMessage: text,
            memory: updatedMemory,
            currentProspect,
            isCallActive: true,
            agentHat: 'prospect'
          });
        }

        const prospectMsg = {
          id: `prosp-${Date.now()}`,
          hat: AGENT_HATS.PROSPECT,
          speaker: 'Prospect',
          name: `${currentProspect.ownerName} (${currentProspect.name})`,
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, prospectMsg]);
        speakText(replyText);

      } catch (err) {
        console.error('Call response error:', err);
        setIsThinking(false);
      }
      return;
    }

    // GENERAL COACHING & CO-BUILDING DIALOGUE (Memory-Aware)
    try {
      const geminiRes = await askGeminiCoach({
        systemPrompt: `You are the ultimate cut-the-BS AI Sales Coach. You guide the user on cold calling, finding prospect commonalities (the friendship principle: bonding over similarities like language, region, shared background), avoiding sounding dumb or overly technical, and building dynamic branching scripts with rebuttals.
CRITICAL: You MUST remember and explicitly reference what the user said, including their name, their specific product/service, and their challenges. Keep responses punchy, direct, and actionable.`,
        messages: nextMessages,
        userMessage: text,
        currentBusiness: currentProspect,
        stage: 'coach_dialogue',
        userMemory: updatedMemory
      });

      setIsThinking(false);

      let coachReply = geminiRes?.text || '';
      if (!coachReply) {
        coachReply = generateMemoryAwareFallback({
          userMessage: text,
          memory: updatedMemory,
          currentProspect,
          isCallActive: false,
          agentHat: 'coach'
        });
      }

      // If user asked to build a script, generate dynamic branching script
      let generatedScript = null;
      if (text.toLowerCase().includes('script') || text.toLowerCase().includes('build') || text.toLowerCase().includes('branch')) {
        generatedScript = buildDynamicBranchingScript(currentProspect);
        setActiveBranchingScript(generatedScript);
      }

      const coachMsg = {
        id: `coach-${Date.now()}`,
        hat: AGENT_HATS.COACH,
        speaker: 'Coach',
        name: 'AI Sales Coach',
        text: coachReply,
        script: generatedScript,
        showBaselineCallButton: onboardingStage !== 'completed',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, coachMsg]);
      speakText(coachReply);

    } catch (err) {
      console.error('Coach reply error:', err);
      setIsThinking(false);
    }
  };

  // Save co-built script to local storage
  const handleSaveScript = (script) => {
    try {
      const existing = JSON.parse(localStorage.getItem('scriptmaster_saved_scripts') || '[]');
      const filtered = existing.filter(s => s.id !== script.id);
      filtered.unshift(script);
      localStorage.setItem('scriptmaster_saved_scripts', JSON.stringify(filtered));
      if (setGlobalScript) setGlobalScript(script);
      showToast(`Saved "${script.name}" to My Scripts!`);
    } catch (err) {
      console.error('Save script error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col font-sans select-none antialiased">
      <Navbar />

      {/* Floating Notice Toast */}
      {savedNotice && (
        <div className="fixed top-18 right-6 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400/40 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 flex flex-col">
        
        {/* Top Control Bar: Active Hat, 1-Click Hearing Widget, 1-Click Mic Widget, Screen Share */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          
          {/* Hat Status & Persona */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md border ${
              currentHat === AGENT_HATS.COACH
                ? 'bg-indigo-950/90 text-indigo-300 border-indigo-700/70 shadow-indigo-950/50'
                : 'bg-amber-950/90 text-amber-300 border-amber-600/70 shadow-amber-950/50 animate-pulse'
            }`}>
              {currentHat === AGENT_HATS.COACH ? (
                <>👔 Coach Hat: AI Sales Mentor</>
              ) : (
                <>🎭 Prospect Hat: {currentProspect.ownerName} ({currentProspect.name})</>
              )}
            </span>

            {baselineScoreReport && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Baseline: {baselineScoreReport.score} pts
              </span>
            )}

            {isAgentSpeaking && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-700/60 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                Coach Speaking...
              </span>
            )}

            {coachMemory && (coachMemory.userName || coachMemory.productOrService || coachMemory.objectionsToMaster?.length > 0) && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  🧠 Coach Memory: {coachMemory.userName || 'Rep'}
                  {coachMemory.productOrService ? ` • Sells: ${coachMemory.productOrService}` : ''}
                  {coachMemory.objectionsToMaster?.[0] ? ` • Focus: ${coachMemory.objectionsToMaster[0]}` : ''}
                </span>
              </span>
            )}
          </div>

          {/* Action Widgets: 1-Click Hearing, 1-Click Mic, Screen Share */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* 1-Click Hearing Widget (Speaker on/off) */}
            <button
              onClick={toggleHearingWidget}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isAgentMuted
                  ? 'bg-rose-950/80 border-rose-700 text-rose-300 hover:bg-rose-900/80'
                  : 'bg-slate-900 border-slate-700 text-cyan-300 hover:bg-slate-800'
              }`}
              title={isAgentMuted ? "Click to turn TTS speech ON" : "Click to turn TTS speech OFF"}
            >
              {isAgentMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              <span>{isAgentMuted ? "Agent Voice: MUTED" : "Hearing: ON"}</span>
            </button>

            {/* Test Natural Voice Button */}
            <button
              onClick={() => {
                const persona = HUMAN_PERSONAS[currentPersonaKey] || HUMAN_PERSONAS.marcus;
                speakText(persona.greeting || `Hey, I am ${persona.name}. Ready to get to work?`, currentPersonaKey);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Test American voice matched to current avatar"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Voice ({HUMAN_PERSONAS[currentPersonaKey]?.gender === 'male' ? 'US Male' : 'US Female'})</span>
            </button>

            {/* Voice Tuning & Calibration Drawer Toggle */}
            <button
              onClick={() => setIsVoicePanelOpen(!isVoicePanelOpen)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isVoicePanelOpen
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300 ring-1 ring-cyan-400/50'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title="Tune voice, accent, pitch, and pacing"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Voice Tuning</span>
            </button>

            {/* 1-Click Mic Widget (Microphone on/off) */}
            <button
              onClick={toggleMicWidget}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isListening
                  ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={isListening ? "Click to turn Microphone OFF" : "Click to turn Microphone ON"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-slate-400" />}
              <span>{isListening ? "Listening... (Click to stop)" : "Mic: OFF"}</span>
            </button>

            {/* Screen Share / Co-Browsing Widget */}
            {!isSharingScreen ? (
              <button
                onClick={startScreenShare}
                className="px-3 py-1.5 rounded-xl bg-[#12141f] hover:bg-[#181b29] border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Share your browser tab or screen so the Coach can analyze prospects with you"
              >
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span>Share Screen with Coach</span>
              </button>
            ) : (
              <button
                onClick={stopScreenShare}
                className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-600 text-amber-200 text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <MonitorOff className="w-4 h-4 text-amber-400" />
                <span>Stop Screen Share</span>
              </button>
            )}

            {/* Re-Calibrate / Reset Baseline Button */}
            <button
              onClick={() => {
                localStorage.removeItem('scriptmaster_baseline_completed');
                localStorage.removeItem('scriptmaster_user_goals');
                setOnboardingStage('greeting_pending');
                setBaselineScoreReport(null);
                setMessages([{
                  id: `recalibrate-${Date.now()}`,
                  hat: AGENT_HATS.COACH,
                  speaker: 'Coach',
                  name: 'AI Sales Coach',
                  text: `Let's recalibrate your baseline from scratch!\n\nFirst, tell me: **what are your personal sales goals**, **what are you hoping to get out of our coaching**, and **what areas do you feel you need to work on?**`,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }]);
                speakText("Let's recalibrate your goals and baseline from scratch. What are your personal sales goals?");
              }}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Reset Goals & Run New Baseline"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

          </div>
        </div>

        {/* Voice Tuning & Character Calibration Drawer */}
        {isVoicePanelOpen && (
          <div className="mt-3 p-4 rounded-2xl bg-[#0f121d] border border-cyan-500/40 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Voice Engine & Accent Calibration
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {HUMAN_PERSONAS[currentPersonaKey]?.name}: {HUMAN_PERSONAS[currentPersonaKey]?.gender === 'male' ? 'American Male' : 'American Female'}
                </span>
              </div>
              <button
                onClick={() => setIsVoicePanelOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
              Avatars are locked to authentic <strong>American English</strong> voices matched to each character&apos;s gender. Legacy robotic desktop synthesizers (eSpeak / Microsoft David Desktop) and British/foreign accents are excluded.
            </p>

            {/* 1. Gemini Live Neural Voice Options (Studio Grade) */}
            <div className="mt-4 p-3.5 rounded-xl bg-[#141827] border border-indigo-500/40 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Gemini Live Voice Options
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-700 font-mono">
                    Studio Neural
                  </span>
                </div>
                <span className="text-[11px] text-cyan-300 font-mono">
                  Current: <strong className="text-white underline">{voiceSettings[`${currentPersonaKey}GeminiVoice`] || HUMAN_PERSONAS[currentPersonaKey]?.geminiVoice}</strong> ({HUMAN_PERSONAS[currentPersonaKey]?.name})
                </span>
              </div>
              
              <p className="text-[11px] text-slate-300 mb-3">
                Official Google Gemini Live prebuilt voices with human breath, natural pacing, and zero robotic artifacts:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GEMINI_LIVE_VOICES.map((gv) => {
                  const isSelected = (voiceSettings[`${currentPersonaKey}GeminiVoice`] || HUMAN_PERSONAS[currentPersonaKey]?.geminiVoice) === gv.id;
                  const isMatchingGender = gv.gender === HUMAN_PERSONAS[currentPersonaKey]?.gender;
                  return (
                    <button
                      key={gv.id}
                      type="button"
                      onClick={() => {
                        saveVoiceSetting(`${currentPersonaKey}GeminiVoice`, gv.id);
                        speakText(HUMAN_PERSONAS[currentPersonaKey]?.greeting, currentPersonaKey);
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-950 via-[#18233c] to-indigo-950 border-cyan-400 shadow-md ring-1 ring-cyan-400/60'
                          : isMatchingGender
                          ? 'bg-[#181c2b] border-slate-700/80 hover:border-slate-500 hover:bg-[#1f2438]'
                          : 'bg-[#10131e] border-slate-800/80 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white">{gv.name}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${gv.gender === 'male' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                          {gv.gender === 'male' ? 'Male' : 'Female'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-300 leading-tight">
                        {gv.tone}
                      </span>
                      {isSelected ? (
                        <span className="text-[9px] font-bold text-cyan-300 mt-1 flex items-center gap-1">
                          ✓ Active for {HUMAN_PERSONAS[currentPersonaKey]?.name.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 mt-1">
                          Click to select & test
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Deepgram Aura Fallback Engine (Ultra-Realistic Natural Voice) */}
            <div className="mt-3 p-3.5 rounded-xl bg-[#111927] border border-emerald-500/40 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Deepgram Aura Fallback Voice
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                    Tier 2 Fallback
                  </span>
                </div>
                <span className="text-[11px] text-emerald-300 font-mono">
                  Selected: <strong className="text-white underline">{voiceSettings[`${currentPersonaKey}DeepgramVoice`] || (currentPersonaKey === 'hank' ? 'aura-arcas-en' : currentPersonaKey === 'marcus' ? 'aura-orion-en' : currentPersonaKey === 'sarah' ? 'aura-asteria-en' : 'aura-stella-en')}</strong>
                </span>
              </div>
              
              <p className="text-[11px] text-slate-300 mb-3">
                Deepgram Aura models provide human breath cadence and conversational flow whenever Gemini Live API is buffering or recovering:
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEEPGRAM_AURA_VOICES.map((dg) => {
                  const defaultModel = currentPersonaKey === 'hank' ? 'aura-arcas-en' :
                    currentPersonaKey === 'marcus' ? 'aura-orion-en' :
                    currentPersonaKey === 'sarah' ? 'aura-asteria-en' : 'aura-stella-en';
                  const isSelected = (voiceSettings[`${currentPersonaKey}DeepgramVoice`] || defaultModel) === dg.id;
                  const isMatchingGender = dg.gender === HUMAN_PERSONAS[currentPersonaKey]?.gender;
                  return (
                    <button
                      key={dg.id}
                      type="button"
                      onClick={async () => {
                        saveVoiceSetting(`${currentPersonaKey}DeepgramVoice`, dg.id);
                        showToast(`Deepgram fallback voice set to ${dg.name}`);
                        // Preview Deepgram audio
                        const greeting = prepareTextForSpeech(HUMAN_PERSONAS[currentPersonaKey]?.greeting);
                        const result = await getDeepgramTTSAudio(greeting, dg.id);
                        if (result && result.audioBase64) {
                          const audio = new Audio(`data:${result.mimeType || 'audio/mp3'};base64,${result.audioBase64}`);
                          audio.play().catch(() => {});
                        } else {
                          speakText(greeting, currentPersonaKey);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-emerald-950 via-[#132720] to-cyan-950 border-emerald-400 shadow-md ring-1 ring-emerald-400/60'
                          : isMatchingGender
                          ? 'bg-[#181c2b] border-slate-700/80 hover:border-slate-500 hover:bg-[#1f2438]'
                          : 'bg-[#10131e] border-slate-800/80 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-white">{dg.name}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${dg.gender === 'male' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
                          {dg.gender === 'male' ? 'Male' : 'Female'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-300 leading-tight">
                        {dg.tone}
                      </span>
                      {isSelected ? (
                        <span className="text-[9px] font-bold text-emerald-300 mt-1 flex items-center gap-1">
                          ✓ Fallback Active
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-400 mt-1">
                          Click to select & test
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Device Speech Synthesis & Pacing Tuning */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-800/80">
              
              {/* Voice Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Voice Engine for {HUMAN_PERSONAS[currentPersonaKey]?.name}
                </label>
                <select
                  value={voiceSettings[`${currentPersonaKey}Voice`] || ''}
                  onChange={(e) => saveVoiceSetting(`${currentPersonaKey}Voice`, e.target.value)}
                  className="w-full bg-[#181c2b] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="">Auto-Detect Best Natural American Voice (Recommended)</option>
                  {availableVoices
                    .filter(v => v.lang.startsWith('en'))
                    .map((v) => {
                      const isUS = v.lang.includes('US') || v.lang.includes('en-US') || v.lang.includes('en_US');
                      const isFemale = /female|samantha|jenny|aria|karen|ava|zira/i.test(v.name);
                      return (
                        <option key={v.name} value={v.name}>
                          {v.name} ({isUS ? 'US' : v.lang}) {isFemale ? '♀' : '♂'}
                        </option>
                      );
                    })}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Active voice: {getBestNaturalBrowserVoice(currentPersonaKey)?.name || 'Default Natural US'}
                </span>
              </div>

              {/* Speed Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pacing / Speed
                  </label>
                  <span className="text-[11px] font-mono text-cyan-300">
                    {Math.round((voiceSettings.speed || 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.20"
                  step="0.02"
                  value={voiceSettings.speed || 1.0}
                  onChange={(e) => saveVoiceSetting('speed', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Relaxed (0.8x)</span>
                  <span>Natural (1.0x)</span>
                  <span>Brisk (1.2x)</span>
                </div>
              </div>

              {/* Pitch Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Pitch / Resonance
                  </label>
                  <span className="text-[11px] font-mono text-cyan-300">
                    {Math.round((voiceSettings.pitch || 1.0) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.20"
                  step="0.02"
                  value={voiceSettings.pitch || 1.0}
                  onChange={(e) => saveVoiceSetting('pitch', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Deeper (0.8x)</span>
                  <span>Natural (1.0x)</span>
                  <span>Higher (1.2x)</span>
                </div>
              </div>

            </div>

            {/* Test & Reset Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const persona = HUMAN_PERSONAS[currentPersonaKey] || HUMAN_PERSONAS.marcus;
                    speakText(persona.greeting, currentPersonaKey);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Test Voice Now</span>
                </button>

                <button
                  onClick={() => {
                    const def = { marcusVoice: '', hankVoice: '', elenaVoice: '', sarahVoice: '', speed: 0.98, pitch: 1.0 };
                    setVoiceSettings(def);
                    localStorage.setItem('scriptmaster_voice_settings', JSON.stringify(def));
                    showToast('Voice settings reset to auto-calibrated defaults');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                >
                  Reset Defaults
                </button>
              </div>

              <button
                onClick={() => setIsVoicePanelOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Close Settings
              </button>
            </div>
          </div>
        )}

        {/* Live Screen Sharing HUD (When Active) */}
        {isSharingScreen && (
          <div className="mt-3 p-3 rounded-2xl bg-[#0e111a] border border-indigo-500/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="relative w-32 h-20 bg-black rounded-lg overflow-hidden border border-slate-700 shrink-0">
                <video 
                  ref={videoPreviewRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                  LIVE
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                  Coach Screen Co-Pilot Active
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                  Navigate to any prospect site, LinkedIn profile, or CRM entry.
                </p>
              </div>
            </div>

            <button
              onClick={handleAnalyzeScreen}
              disabled={screenAnalyzing}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Search className="w-4 h-4" />
              {screenAnalyzing ? 'Analyzing Screen Frame...' : '🔍 Coach: Analyze Screen Now'}
            </button>
          </div>
        )}

        {/* Main 2-Column Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-5 pt-3 items-start">
          
          {/* Left Column: Gemini Live Avatar (Sticky), Prospect Dossier, Commonalities & Intel Tool, Call Launcher */}
          <div className="lg:sticky lg:top-20 self-start bg-[#0b0d14]/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl">
            <div>
              
              {/* Gemini Live Human Avatar Feed */}
              <div className="mb-4">
                <GeminiLiveAvatar
                  isSpeaking={isAgentSpeaking}
                  isListening={isListening}
                  isThinking={isThinking}
                  hat={currentHat}
                  speakerName={currentHat === AGENT_HATS.COACH ? 'AI Sales Coach' : currentProspect.ownerName}
                  size={210}
                  allowSwitching={true}
                  currentSpeechText={currentSpeechBubble}
                  isAudioBlocked={isAudioBlocked}
                  onUnlockAudio={unlockAudio}
                  onPersonaChange={(persona) => {
                    setCurrentPersonaKey(persona.id);
                    if (persona.hat === 'coach') {
                      setCurrentHat(AGENT_HATS.COACH);
                    } else {
                      setCurrentHat(AGENT_HATS.PROSPECT);
                      setCurrentProspect(prev => ({
                        ...prev,
                        ownerName: persona.name,
                        ownerRole: persona.role,
                        name: persona.id === 'hank' ? 'Miller HVAC Solutions' : 'Premier Commercial Services'
                      }));
                    }
                  }}
                  onAvatarClick={(e) => {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();

                    // If audio was blocked by autoplay, unblock it
                    if (isAudioBlocked) {
                      unlockAudio();
                    }

                    // If coach is speaking aloud, interrupt coach so user can speak immediately
                    if (isAgentSpeaking) {
                      window.speechSynthesis?.cancel();
                      setIsAgentSpeaking(false);
                      setCurrentSpeechBubble('');
                      toggleMicWidget();
                      return;
                    }

                    // User clicked avatar TO SPEAK: activate listening mode without scrolling!
                    toggleMicWidget();
                  }}
                />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  Target Prospect Intel:
                </span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800 font-bold">
                  {currentProspect.city}
                </span>
              </div>

              {/* Prospect Card */}
              <div className="p-3.5 rounded-2xl bg-[#11131c] border border-slate-800 mb-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-sm font-black text-white">{currentProspect.name}</h3>
                  <span className="text-[10px] text-indigo-300 font-medium">{currentProspect.industry}</span>
                </div>
                <div className="text-xs text-slate-300 mb-2">
                  Decision Maker: <strong className="text-white font-semibold">{currentProspect.ownerName}</strong> ({currentProspect.ownerRole})
                </div>

                <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Bleeding Neck Pain:</span>
                  <p className="text-amber-300 font-medium leading-relaxed">
                    {currentProspect.bleedingNeckPain}
                  </p>
                </div>
              </div>

              {/* Research Any Prospect Search Bar */}
              <form onSubmit={handleResearchProspect} className="mb-3.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Search className="w-3.5 h-3.5 text-cyan-400" />
                  Research Online Prospect & Commonalities:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    placeholder="e.g. Apex Mechanical Dallas, or company URL..."
                    className="flex-1 px-3 py-2 bg-[#12141f] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
                  />
                  <button
                    type="submit"
                    disabled={isResearching || !researchQuery.trim()}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                  >
                    {isResearching ? '...' : 'Intel'}
                  </button>
                </div>
              </form>

              {/* Commonalities & Friendship Bonding Principle Box */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border border-indigo-800/40 text-xs mb-3.5">
                <div className="flex items-center gap-1.5 text-indigo-300 font-extrabold uppercase text-[10px] tracking-wider mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> The Friendship & Commonalities Principle:
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  People bond over similarities (like recommending favorite TV shows). When cold calling, weave in matching language, regional markers, or shared workplace attributes to disarm defenses instantly.
                </p>
              </div>

              {/* Live Cut-The-BS Pointer */}
              <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-xs">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase text-[10px] tracking-wider mb-0.5">
                  <Bot className="w-3.5 h-3.5" /> Coach Field Pointer:
                </div>
                <p className="text-slate-200 text-[11px] leading-snug">
                  {liveCoachTip}
                </p>
              </div>

            </div>

            {/* Call Action Button */}
            <div className="mt-4 pt-3.5 border-t border-slate-800">
              {!isCallActive && !isRinging ? (
                <button
                  onClick={() => handleStartCall(onboardingStage !== 'completed')}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-xl transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  {onboardingStage !== 'completed' 
                    ? `Dial Baseline Cold Call (Hank Miller)`
                    : `Dial Call • Roleplay as ${currentProspect.ownerName.split(' ')[0]}`
                  }
                </button>
              ) : isRinging ? (
                <div className="w-full py-3.5 px-4 bg-amber-600/30 border border-amber-500/50 text-amber-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 animate-pulse">
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                  Ringing {currentProspect.ownerName}... Answering soon...
                </div>
              ) : (
                <button
                  onClick={handleEndCall}
                  className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs sm:text-sm font-black shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call & Get Instant Feedback ({formatTime(callDuration)})
                </button>
              )}
            </div>

          </div>

          {/* Right Column: Clean Conversational Chat Stream (Text Always Visible) */}
          <div className="lg:col-span-2 bg-[#0b0d14]/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between shadow-xl min-h-[580px]">
            
            {/* Top Sub-Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="flex items-center gap-2 font-medium">
                {isCallActive ? (
                  <span className="text-emerald-400 flex items-center gap-2 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE COLD CALL: {currentProspect.ownerName.toUpperCase()} ({formatTime(callDuration)})
                  </span>
                ) : (
                  <span className="text-indigo-400 flex items-center gap-2 font-bold">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    AI SALES COACHING & FIELD SCRIPT ARENA (Chat Transcript Always Visible)
                  </span>
                )}
              </span>

              {lastDebrief && (
                <span className="text-cyan-400 font-bold text-[11px]">
                  Last Call: {lastDebrief.score}/100
                </span>
              )}
            </div>

            {/* Chat Stream (Text Always Visible) */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 py-4 pr-1 max-h-[440px] scroll-smooth">
              {messages.map((msg) => {
                const isUser = msg.speaker === 'You';
                const isProspect = msg.hat === AGENT_HATS.PROSPECT || msg.speaker === 'Prospect';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400 font-medium">
                      <span>{msg.name}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                      {!isUser && (
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isProspect ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}>
                          {isProspect ? 'Prospect Hat' : 'Coach Hat'}
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-none shadow-indigo-950/50'
                          : isProspect
                          ? 'bg-[#141724] border border-amber-500/30 text-amber-100 rounded-bl-none shadow-inner'
                          : 'bg-[#11131c] border border-slate-800 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.text}</div>

                      {/* Direct Baseline Practice Call Launcher Button inside Chat */}
                      {msg.showBaselineCallButton && !isCallActive && (
                        <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center gap-2">
                          <button
                            onClick={() => handleStartCall(true)}
                            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            📞 Start 60-Second Baseline Call (Hank Miller)
                          </button>
                        </div>
                      )}

                      {/* Dynamic Branching Script Card inside Chat */}
                      {msg.script && (
                        <div className="mt-3.5 p-4 rounded-2xl bg-[#090b12] border border-cyan-500/40 space-y-3 shadow-lg">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-cyan-400" />
                              {msg.script.name}
                            </span>
                            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded font-bold border border-cyan-800">
                              Dynamic Branching Flow
                            </span>
                          </div>

                          {/* Core Script Steps */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                              Core Opener & Pain Hook:
                            </span>
                            {msg.script.steps.map((st) => (
                              <div key={st.id} className="text-xs bg-[#12141f] p-2.5 rounded-xl border border-slate-800">
                                <span className="font-semibold text-cyan-300 block text-[11px] mb-0.5">
                                  {st.name}
                                </span>
                                <p className="text-slate-200 italic font-medium">"{st.scriptLine}"</p>
                                <p className="text-[10px] text-slate-400 mt-1">💡 {st.peerExplanation}</p>
                              </div>
                            ))}
                          </div>

                          {/* Dynamic Objection Branches */}
                          <div className="space-y-2 pt-2 border-t border-slate-800">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 block">
                              Dynamic Objection Branches (Where Scripts Break Off):
                            </span>
                            <div className="grid grid-cols-1 gap-2">
                              {msg.script.branches.map((br) => (
                                <div key={br.id} className="text-xs bg-[#141724] p-2.5 rounded-xl border border-amber-600/30">
                                  <span className="font-bold text-amber-300 block text-[11px] mb-0.5">
                                    {br.condition}
                                  </span>
                                  <p className="text-amber-100 italic">"{br.responseLine}"</p>
                                  <p className="text-[10px] text-slate-400 mt-1">🎯 {br.whyItWorks}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                            <button
                              onClick={() => handleSaveScript(msg.script)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" /> Save Script
                            </button>
                            <button
                              onClick={() => handleStartCall(false)}
                              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <PhoneCall className="w-3.5 h-3.5" /> Practice With This Script
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

              {isThinking && (
                <div className="flex items-center gap-2 text-xs text-indigo-400 p-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span>Coach is analyzing and composing guidance...</span>
                </div>
              )}
            </div>

            {/* Input Bar with 1-Click Mic & Hearing Toggles */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              
              {/* 1-Click Mic Widget right in input */}
              <button
                onClick={toggleMicWidget}
                className={`p-3 rounded-2xl border transition cursor-pointer shrink-0 ${
                  isListening
                    ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                    : 'bg-[#11131c] text-slate-400 hover:text-white border-slate-700/80 hover:bg-slate-800'
                }`}
                title={isListening ? "Stop listening" : "Click to speak with microphone"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* 1-Click Hearing Widget right in input */}
              <button
                onClick={toggleHearingWidget}
                className={`p-3 rounded-2xl border transition cursor-pointer shrink-0 ${
                  isAgentMuted
                    ? 'bg-rose-950/80 text-rose-400 border-rose-800 hover:bg-rose-900/80'
                    : 'bg-[#11131c] text-cyan-400 border-slate-700/80 hover:bg-slate-800'
                }`}
                title={isAgentMuted ? "Unmute Coach Audio" : "Mute Coach Audio"}
              >
                {isAgentMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUserSend();
                }}
                placeholder={isCallActive ? "Deliver your line to the prospect (or speak with mic)..." : "Ask Coach, answer goals, or type what you want to practice..."}
                className="flex-1 px-4 py-3 bg-[#11131c] border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
              />

              {/* Send Button */}
              <button
                onClick={() => handleUserSend()}
                disabled={!inputText.trim()}
                className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-2xl transition cursor-pointer shrink-0"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
}

CoachPage.propTypes = {
  setScript: PropTypes.func,
  setPracticeSettings: PropTypes.func
};
