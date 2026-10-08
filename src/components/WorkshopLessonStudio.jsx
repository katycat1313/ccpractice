import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Play, 
  ShieldAlert, 
  ChevronRight, 
  Clock, 
  FileText, 
  ArrowLeft,
  X,
  Award,
  Layers,
  Flame,
  Check,
  BookOpen,
  Radio,
  PhoneCall,
  PhoneOff,
  ExternalLink,
  Wand2,
  Sliders,
  Activity
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey, askGeminiCoach, getGeminiTTSAudio, researchProspectWithGemini } from '../lib/geminiClient';
import { GeminiLiveSession } from '../lib/geminiLiveClient';
import { saveScriptToScriptsPage, getActiveScript, pullUpScript, openPracticeSession } from '../lib/coachActions';
import { playPickupClick, playHangupClick } from '../lib/soundUtils';
import IframeMicModal from './IframeMicModal';
import PracticeTeleprompter from './PracticeTeleprompter';

export const FOUNDATIONS_LESSONS = [
  {
    id: 'lesson-architecture',
    number: 1,
    title: 'Cold Call Architecture: What to Say vs. What NEVER to Say',
    tag: 'Architecture & Psychology',
    subtitle: 'Eliminating commission breath, timid openers, and corporate pitch slaps',
    description: 'Learn the exact psychological triggers that make blue-collar contractors slam down the phone, and master the 20-second contract that earns instant peer-to-peer respect.',
    estimatedMinutes: '6 min',
    lethalMistakes: [
      {
        phrase: '"Did I catch you at a bad time?"',
        trigger: 'Timid Qualifier',
        explanation: 'Instantly invites them to say "Yes, I am busy" and hang up. They are ALWAYS at a bad time on a jobsite.'
      },
      {
        phrase: '"How are you doing today?"',
        trigger: 'Telemarketer Flag',
        explanation: 'Takes 1.5 seconds to register as unsolicited corporate spam. Contractors immediately raise defense shields.'
      },
      {
        phrase: '"I\'m calling to see who handles your software..."',
        trigger: 'Corporate Pitch Slap',
        explanation: 'Self-serving and salesy. Gives zero context on their burning pain and earns immediate resistance.'
      },
      {
        phrase: '"I just wanted to follow up and touch base..."',
        trigger: 'Passive & Low Status',
        explanation: 'Signals you have nothing valuable to say and are begging for their truck cab time.'
      }
    ],
    highLeverageReplacements: [
      {
        phrase: '"Hey Carl, Katy here. I know you\'re hauling materials down Route 60, but give me 20 seconds..."',
        trigger: '20-Second Contract',
        whyItWorks: 'Acknowledges their chaotic physical reality in the first 7 seconds and sets a strict, low-risk time boundary.'
      },
      {
        phrase: '"...if this doesn\'t stop you from handwriting quotes for 10 hours every Sunday and eating $1,200 on plumbing runs, tell me to jump in the river. Fair?"',
        trigger: 'Negative Reverse Close',
        whyItWorks: 'Gives the contractor 100% of the control. When you invite them to tell you to jump in the river, resistance evaporates.'
      },
      {
        phrase: '"I\'ll be upfront: I have no idea if this fits your crew or not, but give me 30 seconds..."',
        trigger: 'Disarming Honesty',
        whyItWorks: 'Strips away commission breath and establishes honest, contractor-to-contractor rapport.'
      }
    ],
    scenarios: [
      {
        id: 'scen-1',
        title: 'Scenario 1: Windy Rooftop Pattern Interrupt',
        context: 'Dave answers his cell phone on a commercial metal rooftop in Kanawha Valley. Wind is blowing, tools are rattling.',
        contractorLine: 'Dave speaking, make it fast. I\'m on a roof in the middle of a tear-off.',
        challenge: 'Deliver an opening hook that respects his immediate hazard and earns 20 seconds without sounding like a telemarketer.'
      },
      {
        id: 'scen-2',
        title: 'Scenario 2: The "Send Me an Email" Deflection',
        context: 'Hank is pulling up to a Ferguson supply counter and reflexively fires off his standard brush-off.',
        contractorLine: 'Look, I\'m slammed today running service calls. Just shoot an email to my office.',
        challenge: 'Politely decline the polite "no", explain why his inbox is useless, and secure a 20-second window right now.'
      },
      {
        id: 'scen-3',
        title: 'Scenario 3: The 20-Second Permission Bridge',
        context: 'Travis Pauley is sitting in his HVAC van between dispatch calls on Route 119.',
        contractorLine: 'Alright, you got 20 seconds. What\'s this about?',
        challenge: 'Hit the bleeding-neck pain ($3,500 lost in van fittings under truck seats) and secure the follow-up ask.'
      }
    ]
  },
  {
    id: 'lesson-blueprint',
    number: 2,
    title: 'The 4-Part Script Blueprint: Hook, Bleeding-Neck Pain, Proof, and Low-Friction Ask',
    tag: '20-Sec Script Construction',
    subtitle: 'Constructing custom 20-second scripts step-by-step for any blue-collar trade',
    description: 'Work with Coach Marcus to assemble a high-converting cold call pitch line by line. Marcus rewires weak phrasing and outputs the finished script directly into your active script board.',
    estimatedMinutes: '8 min',
    lethalMistakes: [
      {
        phrase: '"We help trade contractors optimize digital workflows and increase overall productivity."',
        trigger: 'Fluffy Corporate Jargon',
        explanation: 'Contractors don\'t care about "workflows" or "productivity." They care about lost Sunday hours and eaten cash.'
      },
      {
        phrase: '"Can we schedule a 45-minute comprehensive demo next Tuesday at 2 PM?"',
        trigger: 'High-Friction Ask',
        explanation: 'Blue-collar trade owners never sit down for 45-minute software demos during business hours.'
      },
      {
        phrase: '"Our cutting-edge cloud platform automates your entire enterprise."',
        trigger: 'Unbelievable Hype',
        explanation: 'Trigger words like "enterprise" and "cutting-edge" create immediate skepticism in West Virginia hollows.'
      }
    ],
    highLeverageReplacements: [
      {
        phrase: 'Part 1 - The 20-Second Hook: "Hey [Name], [Your Name] here. I know you\'re on a jobsite, but give me 20 seconds: if this doesn\'t stop you from [Specific Pain], tell me to jump in the river. Fair?"',
        trigger: 'Pattern Interrupt Hook',
        whyItWorks: 'Bypasses the reptilian brain filter and earns a clean 20-second runway.'
      },
      {
        phrase: 'Part 2 - Bleeding-Neck Pain: "Spending 10 hours every Sunday handwriting kitchen & bath quotes and eating $1,200 on unbudgeted plumbing runs because notes were lost on scrap lumber."',
        trigger: 'Concrete Dollar & Time Pain',
        whyItWorks: 'Names specific physical objects (legal pads, scrap lumber, brass fittings) and exact dollar figures.'
      },
      {
        phrase: 'Part 3 - Differentiated Proof: "Handled & Buddy field walkthrough intake with 100% offline sync in the hollows. Single Crew tier ($499 setup / $129/mo)."',
        trigger: 'Offline Hollow Proof',
        whyItWorks: 'Addresses the #1 objection (no cell service in hollows) before they can even voice it.'
      },
      {
        phrase: 'Part 4 - Low-Friction Ask: "Let\'s put down the $250 upfront onboarding deposit right now to lock your implementation slot before next week\'s schedule fills up."',
        trigger: '50% Deposit Closer',
        whyItWorks: 'Cuts through tire-kickers and locks commercial commitment with low upfront risk.'
      }
    ],
    scenarios: [
      {
        id: 'scen-blue-1',
        title: 'Step 1: Crafting Your 20-Second Hook',
        context: 'Choose your target contractor (General Contractor, Excavator, HVAC, or Roofer) and build the opening pattern interrupt.',
        contractorLine: 'Carl answers: "Yeah, McIntyre Construction. What\'s going on?"',
        challenge: 'Draft your opening 20-second hook naming his Route 60 route and the negative reverse close ("tell me to jump in the river. Fair?").'
      },
      {
        id: 'scen-blue-2',
        title: 'Step 2: Naming the Bleeding-Neck Jobsite Pain',
        context: 'Moving past general software pitch to pinpoint the exact dollar leak.',
        contractorLine: 'Carl pauses: "Alright, what do you mean by losing money?"',
        challenge: 'Name the Sunday legal pad hours and $1,200 in unbudgeted plumbing runs noted on scrap lumber.'
      },
      {
        id: 'scen-blue-3',
        title: 'Step 3 & 4: Offline Proof & The $250 Deposit Close',
        context: 'Carl is listening, but skeptical about apps working without cell towers.',
        contractorLine: 'Carl grunts: "Half our jobs are up in the hollows where Verizon doesn\'t even work. What\'s this gonna cost me?"',
        challenge: 'Explain the 100% offline sync and ask for the $250 upfront onboarding deposit to lock his slot.'
      }
    ]
  },
  {
    id: 'lesson-frame-control',
    number: 3,
    title: 'Tone, Pace & Frame Control: Talking Contractor-to-Contractor',
    tag: 'Frame Control & Voice Pace',
    subtitle: 'Developing an authentic peer-to-peer tone and commanding respect on the phone',
    description: 'Master downward vocal inflection, calm deliberate pacing, and tactical silence. Learn why the first person who speaks after asking the closing question loses the frame.',
    estimatedMinutes: '5 min',
    lethalMistakes: [
      {
        phrase: 'Upward vocal inflection at sentence ends (? cadence)',
        trigger: 'Seeking Approval',
        explanation: 'Sounds like you are asking permission to exist. Contractors smell fear and hang up immediately.'
      },
      {
        phrase: 'Rushing speech at 180+ words per minute',
        trigger: 'Panic & Scarcity',
        explanation: 'Signals you are desperate to vomit your pitch before they disconnect. Low-status indicator.'
      },
      {
        phrase: '"Sorry to bother you while you\'re working..."',
        trigger: 'Apologetic Demeanor',
        explanation: 'Immediately confirms that your call is an unwanted nuisance rather than a $1,200 solution.'
      },
      {
        phrase: 'Filling silence with nervous chatter after asking a question',
        trigger: 'Caving Under Tension',
        explanation: 'If you speak before the contractor answers, you relieve their psychological tension and lose the deal.'
      }
    ],
    highLeverageReplacements: [
      {
        phrase: 'Downward vocal inflection (. cadence)',
        trigger: 'Commanding Certainty',
        whyItWorks: 'Statements and questions land flat and grounded, conveying senior authority and peer status.'
      },
      {
        phrase: 'Deliberate, relaxed tempo (110-130 words per minute)',
        trigger: 'Unflappable Presence',
        whyItWorks: 'Forces the contractor to slow down their breathing and actually process your value proposition.'
      },
      {
        phrase: 'Tactical Silence (3-4 second hard pause after "Fair?")',
        trigger: 'Holding the Frame',
        whyItWorks: 'Creates constructive tension. Let the contractor think and break the silence first.'
      },
      {
        phrase: '"Look Carl, you and I both know Sunday paperwork is the worst part of your week."',
        trigger: 'Peer-to-Peer Directness',
        whyItWorks: 'Down-home West Virginia directness connects faster than any polished Silicon Valley script.'
      }
    ],
    scenarios: [
      {
        id: 'scen-tone-1',
        title: 'Challenge 1: The Abrupt Shut-Down Attempt',
        context: 'Delbert Workman is in a noisy trackhoe cab along the Elk River and tries to bulldoze you with raw bluntness.',
        contractorLine: 'Look lady/pal, I don\'t buy shit over the phone. Why shouldn\'t I just hang up on you right now?',
        challenge: 'Maintain downward inflection, do NOT apologize, pause 2 seconds, and deliver the calm reverse psychology counter.'
      },
      {
        id: 'scen-tone-2',
        title: 'Challenge 2: Tactical Silence After the Close',
        context: 'You just asked for the $250 deposit. The contractor goes completely silent for 4 seconds.',
        contractorLine: 'Carl stays silent: "... (4 seconds of heavy jobsite background breathing) ..."',
        challenge: 'HOLD FRAME. Do not speak, do not discount, do not panic. Type or speak your reaction or wait for him to talk.'
      },
      {
        id: 'scen-tone-3',
        title: 'Challenge 3: The Skeptical Trade Grunt',
        context: 'Bo Pauley hits you with cynicism: "Every software guy promises the moon. Sounds like BS to me."',
        contractorLine: 'Every vendor tells me that. Sounds like tech BS to me.',
        challenge: 'Validate his skepticism completely without being defensive, and re-anchor on Ferguson unbilled copper receipts.'
      }
    ]
  }
];

export default function WorkshopLessonStudio({
  lessonId = 'lesson-architecture',
  onClose = () => {},
  onSelectLesson = () => {}
}) {
  const navigate = useNavigate();
  const coachName = (() => {
    try { return JSON.parse(localStorage.getItem('scriptmaster_user') || '{}').coachName || 'Coach'; } catch { return 'Coach'; }
  })();
  const activeLesson = FOUNDATIONS_LESSONS.find(l => l.id === lessonId) || FOUNDATIONS_LESSONS[0];

  // Mode Switcher: 'classroom' | 'copilot' | 'simulation'
  const [workshopMode, setWorkshopMode] = useState('classroom');

  // Studio Progression State
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const activeScenario = activeLesson.scenarios[currentScenarioIndex] || activeLesson.scenarios[0];

  // Helper to generate dynamic, interactive instructor greetings
  const createInstructorGreeting = (mode, lesson, scenario) => {
    if (mode === 'copilot') {
      return {
        id: `coach-init-${Date.now()}`,
        sender: 'coach',
        text: `👋 **Coach Marcus here in Script Co-Pilot mode.**\n\nLet's co-construct and sharpen your contractor script for **Lesson 0${lesson.number}: ${lesson.title}**.\n\nChoose an element below to brainstorm or refine:\n- 🎯 **10-Second Pattern Interrupt Hook**\n- 💥 **Bleeding-Neck Contractor Pain**\n- 🛠️ **Differentiated Offline Proof**\n- 🤝 **Low-Friction Downside-Risk Close**\n\nType your rough thought or speak into the mic. Use **"Send to Script Builder"** or **"Lock to Teleprompter"** anytime to practice live!`,
        score: null,
        correction: null
      };
    }
    if (mode === 'simulation') {
      return {
        id: `coach-init-${Date.now()}`,
        sender: 'coach',
        text: `📞 **Simulated Call Mode Active.**\n\nI am sparring with you as the contractor **Dave** on a windy metal tear-off roof in Kanawha Valley.\n\n*Contractor State:* ${scenario.context}\n\nContractor line:\n> **"${scenario.contractorLine}"**\n\n${scenario.challenge}\n\nYou have 10 seconds. Deliver your response now via mic or text—I will react like a real contractor and pause for tactical coaching if you lose frame!`,
        score: null,
        correction: null
      };
    }
    // 'classroom' - Interactive Masterclass Instructor
    return {
      id: `coach-init-${Date.now()}`,
      sender: 'coach',
      text: `🎓 **Welcome to Lesson 0${lesson.number}: ${lesson.title}**!\n\nI'm Coach Marcus Vance, your 1-on-1 direct-response phone sales instructor. We do not just run passive roleplay—we drill conversational mechanics, eliminate apologetic commission breath, and wire in calm peer-to-peer status.\n\n👉 **Active Drill:** ${scenario.title}\n*Jobsite Context:* ${scenario.context}\n\nContractor says:\n> **"${scenario.contractorLine}"**\n\n${scenario.challenge}\n\nDeliver your opening pattern interrupt below via mic, text, or tap **Live Voice (Gemini 2.0)** for live bidirectional audio feedback!`,
      score: null,
      correction: null
    };
  };

  // Interactive Dialogue State
  const [userSpeechInput, setUserSpeechInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);
  const [activeTabSide, setActiveTabSide] = useState('mistakes'); // 'replacements' | 'mistakes' | 'notes' | 'teleprompter'
  const [liveCoachNotes, setLiveCoachNotes] = useState([]);
  const [completedScenarios, setCompletedScenarios] = useState({});
  const [scriptDraftState, setScriptDraftState] = useState({
    hook: '',
    pain: '',
    proof: '',
    closingAsk: ''
  });
  const [appliedToBoardToast, setAppliedToBoardToast] = useState(false);

  // Gemini Live Bidirectional Audio Session State (gemini-3.8-live)
  const [isLiveAudioConnected, setIsLiveAudioConnected] = useState(false);
  const [liveAudioStatus, setLiveAudioStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'error'
  const [liveTokens, setLiveTokens] = useState('');
  const [audioAmplitude, setAudioAmplitude] = useState({ output: 0, input: 0, active: 0 });
  const [micSandboxBlocked, setMicSandboxBlocked] = useState(false);
  const [liveAudioErrorMessage, setLiveAudioErrorMessage] = useState('');
  const liveSessionRef = useRef(null);

  // Chat message stream inside lesson
  const [lessonMessages, setLessonMessages] = useState(() => [
    createInstructorGreeting('classroom', activeLesson, activeScenario)
  ]);

  const recognitionRef = useRef(null);
  const chatBottomRef = useRef(null);
  const audioContextRef = useRef(null);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Handle Mode switching with greeting refresh
  const handleModeChange = (newMode) => {
    setWorkshopMode(newMode);
    const newGreeting = createInstructorGreeting(newMode, activeLesson, activeScenario);
    setLessonMessages(prev => [
      ...prev,
      {
        id: `mode-switch-${Date.now()}`,
        sender: 'coach',
        text: `🔄 **Switched to ${newMode === 'classroom' ? 'Classroom Drill' : newMode === 'copilot' ? 'Script Co-Pilot' : 'Simulated Call'} mode.**\n\n${newGreeting.text}`,
        score: null,
        correction: null
      }
    ]);
  };

  // Bridge action: Send script output directly into Script Builder module
  const handleSendToScriptBuilder = () => {
    const fullPitch = [
      scriptDraftState.hook || "Hey Carl, Katy here. I know you're hauling materials down Route 60, but give me 20 seconds...",
      scriptDraftState.pain || "Does handwriting quotes for 10 hours every Sunday and eating $1,200 on lost lumber scrap sound familiar?",
      scriptDraftState.proof || "Works with zero cell service in the hollows—syncs straight into billing when you hit 4G.",
      scriptDraftState.closingAsk || "Give me 10 minutes this Thursday. If it doesn't fit your crew, tell me to jump in the river. Fair?"
    ].filter(Boolean).join('\n\n');

    saveScriptToScriptsPage({
      title: `Lesson 0${activeLesson.number} - Coach Marcus Co-Pilot Script`,
      body: fullPitch,
      notes: `Co-created with Coach Marcus Vance in Workshop Studio (${workshopMode} mode).`,
      tags: ['workshop', 'marcus-co-pilot', activeLesson.tag]
    });

    navigate('/script-builder');
  };

  // Bridge action: Lock to Teleprompter / Active Script
  const handleLockToTeleprompter = () => {
    const fullPitch = [
      scriptDraftState.hook || "Hey Carl, Katy here. I know you're hauling materials down Route 60, but give me 20 seconds...",
      scriptDraftState.pain || "Does handwriting quotes for 10 hours every Sunday and eating $1,200 on lost lumber scrap sound familiar?",
      scriptDraftState.proof || "Works with zero cell service in the hollows—syncs straight into billing when you hit 4G.",
      scriptDraftState.closingAsk || "Give me 10 minutes this Thursday. If it doesn't fit your crew, tell me to jump in the river. Fair?"
    ].filter(Boolean).join('\n\n');

    try {
      localStorage.setItem('scriptmaster_active_script', fullPitch);
      window.dispatchEvent(new CustomEvent('scriptmaster_script_updated', {
        detail: { script: fullPitch }
      }));
    } catch (e) {
      console.warn('Failed to lock script to teleprompter:', e);
    }

    setAppliedToBoardToast(true);
    setTimeout(() => setAppliedToBoardToast(false), 3500);
  };

  // Sync state when activeLesson changes
  useEffect(() => {
    setCurrentScenarioIndex(0);
    const scen = activeLesson.scenarios[0];
    setLessonMessages([createInstructorGreeting(workshopMode, activeLesson, scen)]);

    if (liveSessionRef.current) {
      try { liveSessionRef.current.disconnect(); } catch { /* ignore */ }
      liveSessionRef.current = null;
      setIsLiveAudioConnected(false);
      setLiveAudioStatus('disconnected');
    }
  }, [activeLesson.id]);

  // Cleanup live audio session on unmount
  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        try { liveSessionRef.current.disconnect(); } catch { /* ignore */ }
        liveSessionRef.current = null;
      }
    };
  }, []);

  // Toggle Bidirectional Gemini-2.0-Live Audio Session
  const handleToggleLiveAudio = async () => {
    setMicSandboxBlocked(false);
    setLiveAudioErrorMessage('');

    if (isLiveAudioConnected) {
      if (liveSessionRef.current) {
        try { liveSessionRef.current.disconnect(); } catch { /* ignore */ }
        liveSessionRef.current = null;
      }
      playHangupClick();
      setIsLiveAudioConnected(false);
      setLiveAudioStatus('disconnected');
      return;
    }

    playPickupClick();
    setLiveAudioStatus('connecting');

    try {
      const modeInstruction = workshopMode === 'copilot'
        ? `You are ${coachName}, an expert cold call script co-pilot and strategist. The user is co-writing and refining their contractor sales pitch for Lesson 0${activeLesson.number}: "${activeLesson.title}". Help them craft punchy 10-second hooks, visceral contractor pain points, offline proof, and low-friction closes. Speak concisely in 1-2 punchy sentences aloud, suggest strong phrasing, and refine with them line-by-line.`
        : workshopMode === 'simulation'
        ? `You are roleplaying Contractor Dave, on a windy metal tear-off roof in Kanawha Valley. The user is cold calling you. Your initial pushback: "${activeScenario.contractorLine}". Be gruff, direct, and test their frame. If they hesitate or sound like a timid telemarketer, cut them off. If they use a calm pattern interrupt with clear downside risk removal, hear them out.`
        : `You are ${coachName}, an aggressive, practical, elite B2B Cold Calling Coach for blue-collar contractors. You are conducting an interactive live audio drill with the sales rep on Lesson 0${activeLesson.number}: "${activeLesson.title}". Current drill: "${activeScenario.title}". Contractor pushback: "${activeScenario.contractorLine}". When the user speaks, critique their downward inflection, pacing, and tone. Hold frame and train them to talk contractor-to-contractor without fluff.`;

      const modeInitialPrompt = workshopMode === 'copilot'
        ? `Coach Marcus, let's co-write and sharpen my sales pitch for Lesson 0${activeLesson.number}. Greet me and ask which section of the script we should construct first.`
        : workshopMode === 'simulation'
        ? `Deliver your opening contractor pushback to start the call: "${activeScenario.contractorLine}".`
        : `Coach Marcus, please start the classroom drill now. Greet me aloud and state Scenario 1: "${activeScenario.title}" with contractor pushback: "${activeScenario.contractorLine}".`;

      const session = new GeminiLiveSession({
        voiceName: 'Fenrir',
        initialPrompt: modeInitialPrompt,
        systemInstruction: modeInstruction,
        onStateChange: (newState) => {
          setLiveAudioStatus(newState);
        },
        onAudioAmplitude: (amp) => {
          setAudioAmplitude(amp);
        },
        onTextToken: (token) => {
          setLiveTokens(prev => prev + token);
        },
        onTurnComplete: (userText, modelText) => {
          setLiveTokens('');
          if (modelText) {
            setLessonMessages(prev => [
              ...(userText ? [{ id: `user-live-${Date.now()}`, sender: 'user', text: userText }] : []),
              { id: `coach-live-${Date.now()}`, sender: 'coach', text: modelText }
            ]);
          }
        },
        onToolCall: handleLiveCoachToolCall,
        onInterrupted: () => {
          setLiveTokens('');
          setLiveAudioStatus('listening');
        },
        onIframeMicBlocked: () => {
          setMicSandboxBlocked(true);
          setIsLiveAudioConnected(false);
          setLiveAudioStatus('disconnected');
        },
        onError: (err) => {
          console.warn('Gemini Live session error:', err);
          setLiveAudioErrorMessage(err.message || 'Microphone access denied or unavailable.');
          setIsLiveAudioConnected(false);
          setLiveAudioStatus('error');
        }
      });

      await session.start();
      liveSessionRef.current = session;
      setIsLiveAudioConnected(true);
    } catch (err) {
      console.warn('Could not start Gemini Live session:', err);
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        setMicSandboxBlocked(true);
      } else {
        setLiveAudioErrorMessage(err.message || 'Could not start live voice session. Check microphone permissions.');
      }
      setIsLiveAudioConnected(false);
      setLiveAudioStatus('error');
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [lessonMessages, isEvaluating]);

  // Initial prompt speech
  useEffect(() => {
    if (!isAgentMuted) {
      speakCoachText(`Welcome to Lesson ${activeLesson.number}. ${activeScenario.title}. Let's see your delivery.`);
    }
  }, [activeLesson.id]);

  // Speech helper with Fenrir voice
  const speakCoachText = async (text) => {
    if (!text || isAgentMuted) return;
    try {
      const clean = text.replace(/[*_#`~>]/g, '').trim();
      const tts = await getGeminiTTSAudio(clean, 'Fenrir', 'male', 'marcus');
      if (tts && tts.audioBase64) {
        const audio = new Audio(`data:${tts.mimeType || 'audio/wav'};base64,${tts.audioBase64}`);
        audio.play().catch(() => {});
        return;
      }
    } catch {
      /* ignore */
    }

    // Browser TTS Fallback
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text.replace(/[*_#`~>]/g, ''));
        utter.rate = 1.0;
        utter.pitch = 0.95;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      /* ignore */
    }
  };

  // Mic speech dictation
  const toggleVoiceInput = () => {
    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      setIsListening(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsIframeMicModalOpen(true);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      rec.onstart = () => setIsListening(true);
      rec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        if (text) {
          setUserSpeechInput(prev => prev ? `${prev} ${text}` : text);
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  // Submit Answer to Coach Marcus
  const handleSubmitResponse = async (e) => {
    if (e) e.preventDefault();
    const answer = userSpeechInput.trim();
    if (!answer || isEvaluating) return;

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setIsListening(false);
    }

    playPickupClick();
    setUserSpeechInput('');
    setIsEvaluating(true);

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: answer
    };

    setLessonMessages(prev => [...prev, userMsg]);

    // If Gemini Live is connected, send user turn directly into live session so Marcus responds aloud
    if (liveSessionRef.current && isLiveAudioConnected) {
      try {
        liveSessionRef.current.sendTextMessage(answer);
      } catch (liveErr) {
        console.warn('Failed to send text to live session:', liveErr);
      }
    }

    const systemPrompt = `You are Coach Marcus Vance, aggressive, practical, elite B2B Cold Calling Coach for blue-collar contractors.
You are evaluating the rep on Lesson 0${activeLesson.number}: "${activeLesson.title}".
CURRENT DRILL: "${activeScenario.title}"
CONTRACTOR OBJECTION: "${activeScenario.contractorLine}"
CHALLENGE REQUIREMENT: "${activeScenario.challenge}"

THE USER'S SUBMITTED DELIVERY:
"${answer}"

EVALUATION CRITERIA:
1. Score from 1 to 5 stars (5 = Master peer-to-peer closer, 1 = Timid telemarketer fluff).
2. SINGLE CONCRETE CORRECTION: Direct, blunt, 1-2 sentences.
3. PSYCHOLOGICAL BREAKDOWN: Explain why a contractor reacts positively or slams the phone on this phrasing.
4. If this is Lesson 2 (Script Blueprint), extract or format the script component (hook, pain, proof, or closingAsk).
5. Next Action instruction: Encourage them to proceed to the next scenario or run it again.

OUTPUT STRICTLY AS JSON:
{
  "score": 4,
  "scoreLabel": "Sharp Peer Closer",
  "correction": "Drop the 'I was just wondering' preface. Demand the 20-second contract directly.",
  "psychology": "When you hesitate with qualifiers, contractors register commission breath. Directness signals high value.",
  "coachResponse": "Solid effort. You acknowledged Route 60, but tighten the finish with 'tell me to jump in the river. Fair?'.",
  "scriptPart": {
    "key": "${currentScenarioIndex === 0 ? 'hook' : currentScenarioIndex === 1 ? 'pain' : 'proof'}",
    "text": "${answer.replace(/"/g, "'")}"
  }
}`;

    try {
      let evaluation = null;
      const clientApiKey = getGeminiApiKey();

      if (clientApiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: clientApiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: systemPrompt,
            config: {
              temperature: 0.5,
              responseMimeType: 'application/json'
            }
          });

          if (response?.text) {
            evaluation = JSON.parse(response.text);
          }
        } catch (apiErr) {
          console.warn('Direct Gemini flash call fallback:', apiErr);
        }
      }

      if (!evaluation) {
        const backendRes = await askGeminiCoach({
          systemPrompt: "You are Marcus Vance evaluating a sales lesson. Return valid JSON only.",
          userMessage: systemPrompt,
          stage: 'script_building'
        });

        if (backendRes?.text) {
          const match = backendRes.text.match(/\{[\s\S]*\}/);
          if (match) evaluation = JSON.parse(match[0]);
        }
      }

      // Fallback evaluation if offline
      if (!evaluation) {
        const isSharp = /20|seconds|route 60|fair|river|1,200|sunday/i.test(answer);
        evaluation = {
          score: isSharp ? 4 : 3,
          scoreLabel: isSharp ? "Sharp Closer" : "Good Effort",
          correction: "Anchor on concrete dollar figures ($1,200 plumbing run) and end with downward vocal inflection.",
          psychology: "Contractors live in physical reality. Specific local markers (Route 60, Sunday quotes) disarm their defenses.",
          coachResponse: `Good rep! You hit the core friction. Remember: keep your cadence under 20 seconds so Carl doesn't cut you off.`,
          scriptPart: {
            key: currentScenarioIndex === 0 ? 'hook' : currentScenarioIndex === 1 ? 'pain' : 'proof',
            text: answer
          }
        };
      }

      // Update script draft state if in Lesson 2
      if (activeLesson.id === 'lesson-blueprint' && evaluation.scriptPart) {
        setScriptDraftState(prev => ({
          ...prev,
          [evaluation.scriptPart.key]: evaluation.scriptPart.text
        }));
      }

      // Append live note
      const newNote = {
        id: `note-${Date.now()}`,
        drillTitle: activeScenario.title,
        score: evaluation.score,
        correction: evaluation.correction,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setLiveCoachNotes(prev => [newNote, ...prev]);

      // Mark scenario as completed
      setCompletedScenarios(prev => ({
        ...prev,
        [`${activeLesson.id}-${activeScenario.id}`]: evaluation.score
      }));

      // Speak feedback (when Gemini Live is not handling audio directly)
      if (!isLiveAudioConnected) {
        speakCoachText(`${evaluation.correction} ${evaluation.coachResponse}`);
      }

      const coachReplyMsg = {
        id: `coach-eval-${Date.now()}`,
        sender: 'coach',
        text: evaluation.coachResponse,
        score: evaluation.score,
        scoreLabel: evaluation.scoreLabel,
        correction: evaluation.correction,
        psychology: evaluation.psychology,
        scenarioCompleted: true
      };

      setLessonMessages(prev => [...prev, coachReplyMsg]);
      setIsEvaluating(false);

    } catch (err) {
      console.warn('Lesson evaluation error:', err);
      setIsEvaluating(false);
    }
  };

  // Actions available to the live classroom coach. Results are returned to Gemini
  // so Marcus can explain what he changed or found instead of merely claiming it.
  const handleLiveCoachToolCall = async (toolName, args = {}) => {
    if (toolName === 'saveScriptToScriptsPage' || toolName === 'saveScriptToLibrary') {
      const result = await saveScriptToScriptsPage(args);
      setAppliedToBoardToast(true);
      setTimeout(() => setAppliedToBoardToast(false), 2500);
      return result;
    }
    if (toolName === 'updateActiveScript') {
      const next = { ...getActiveScript(), ...args };
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(next));
      window.dispatchEvent(new Event('scriptmaster_script_updated'));
      return { success: true, script: next, message: 'Updated the active script board.' };
    }
    if (toolName === 'pullUpScript') return pullUpScript(args.query);
    if (toolName === 'openPracticeSession') return openPracticeSession(args);
    if (toolName === 'researchProspect') {
      const result = await researchProspectWithGemini(args);
      return result || { success: false, message: 'Research endpoint returned no result.' };
    }
    if (toolName === 'navigateToPage') {
      const destination = String(args.page || '').toLowerCase();
      const route = destination.includes('practice') ? '/practice'
        : destination.includes('record') ? '/recordings'
        : destination.includes('script') ? '/saved-scripts'
        : destination.includes('dashboard') ? '/dashboard' : '/coach';
      navigate(route);
      return { success: true, route, message: `Navigated to ${route}.` };
    }
    return { success: false, message: `Action ${toolName} is not available in this workspace.` };
  };

  // Next Scenario
  const handleAdvanceScenario = () => {
    if (currentScenarioIndex < activeLesson.scenarios.length - 1) {
      const nextIdx = currentScenarioIndex + 1;
      setCurrentScenarioIndex(nextIdx);
      const nextScen = activeLesson.scenarios[nextIdx];

      const advanceMsg = {
        id: `coach-scen-${Date.now()}`,
        sender: 'coach',
        text: `### Next Challenge: **${nextScen.title}**\n\n*Context:* ${nextScen.context}\n\nContractor says:\n> **"${nextScen.contractorLine}"**\n\n${nextScen.challenge}\n\nDeliver your counter line!`,
        score: null,
        correction: null
      };

      setLessonMessages(prev => [...prev, advanceMsg]);
      if (liveSessionRef.current && isLiveAudioConnected) {
        liveSessionRef.current.sendTextMessage(
          `[SCENARIO ADVANCE] We are now advancing to drill: "${nextScen.title}". Context: ${nextScen.context}. Contractor pushback: "${nextScen.contractorLine}". Challenge: ${nextScen.challenge}. Deliver your prompt and challenge me now!`
        );
      } else {
        speakCoachText(`${nextScen.title}. Contractor says: ${nextScen.contractorLine}`);
      }
    }
  };

  // Push Script to Active Board & Library (Lesson 2 specific power)
  const handleCommitDraftToBoard = () => {
    const finishedScript = {
      id: `scr-lesson-${Date.now()}`,
      title: "Custom 4-Part Contractor Pitch (Marcus Lab)",
      name: "Custom 4-Part Contractor Pitch (Marcus Lab)",
      target: "Carl 'Mac' McIntyre & Trade Owners",
      hook: scriptDraftState.hook || "Hey Carl, Katy here. I know you're hauling materials down Route 60, but give me 20 seconds: if this doesn't stop you from handwriting quotes for 10 hours every Sunday and eating $1,200 on unbudgeted plumbing runs, tell me to jump in the river. Fair?",
      problem: scriptDraftState.pain || "10 hours every Sunday handwriting kitchen & bath quotes; eating $1,200 on unbudgeted plumbing runs because changes were noted on lumber scraps.",
      value: scriptDraftState.proof || "Handled & Buddy walkthrough intake with offline sync in the hollows. Single Crew tier ($499 setup / $129/mo).",
      closingAsk: scriptDraftState.closingAsk || "Lock in onboarding slot with a $250 upfront deposit (half of the $499 setup fee).",
      rebuttals: [
        { objection: "Can my guys use this when there's no cell service out in the hollows?", response: "100%. Everything saves locally on the phone or iPad. Once your crew drives out onto Route 60, it pushes straight to your office automatically." },
        { objection: "I do all my quotes with a legal pad on Sundays, don't need another app", response: "Legal pads are great until a homeowner claims you agreed to move a load-bearing wall for free. This turns your legal pad notes into a signed PDF change order in 60 seconds." }
      ]
    };

    saveScriptToScriptsPage(finishedScript);
    try {
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(finishedScript));
      localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('scriptmaster_script_updated'));
      window.dispatchEvent(new Event('scriptmaster_scripts_updated'));
    } catch {
      /* ignore */
    }

    setAppliedToBoardToast(true);
    setTimeout(() => setAppliedToBoardToast(false), 3500);

    const commitMsg = {
      id: `coach-commit-${Date.now()}`,
      sender: 'coach',
      text: `🔥 **Script Locked to Active Board & Library!**\nI saved your custom 4-part pitch directly into your active working document and added it to your Saved Scripts page. You can practice it live with Carl McIntyre right now!`,
      score: 5,
      scoreLabel: 'Board Synchronized'
    };
    setLessonMessages(prev => [...prev, commitMsg]);
  };

  return (
    <div className="bg-[#0A0E1A] text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col min-h-[750px] relative">
      
      {/* Toast alert when script is saved to board */}
      {appliedToBoardToast && (
        <div className="absolute top-5 right-5 z-50 bg-emerald-600 border border-emerald-400 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>Pitch Committed to Active Teleprompter & Scripts Page!</span>
        </div>
      )}

      {/* =========================================================================
          STUDIO HEADER: Lesson Title, Progress, Audio Toggle & Exit
         ========================================================================= */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Exit Lesson Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                Lesson 0{activeLesson.number}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold">
                {activeLesson.tag}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-black text-white mt-0.5">
              {activeLesson.title}
            </h2>
          </div>
        </div>

        {/* Lesson Switcher & Controls */}
        <div className="flex items-center gap-2">
          {/* Gemini 2.0 Live Bidirectional Audio Toggle */}
          <button
            type="button"
            onClick={handleToggleLiveAudio}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isLiveAudioConnected
                ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse'
                : liveAudioStatus === 'connecting'
                ? 'bg-amber-600/30 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-indigo-950/60 hover:bg-indigo-900/80 border-indigo-500/40 text-indigo-300 hover:text-white'
            }`}
            title="Toggle bidirectional live audio drill with Coach (gemini-3.8-live)"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveAudioConnected ? 'text-white' : 'text-indigo-400'}`} />
            <span>
              {isLiveAudioConnected 
                ? 'Live Voice Active' 
                : liveAudioStatus === 'connecting'
                ? 'Connecting Voice...'
                : 'Gemini-2.0-Live Voice'}
            </span>
          </button>

          {/* Lesson Select Dropdown */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            {FOUNDATIONS_LESSONS.map((l) => (
              <button
                key={l.id}
                onClick={() => onSelectLesson(l.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  l.id === activeLesson.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                0{l.number}
              </button>
            ))}
          </div>

          {/* Teleprompter Toggle Button */}
          <button
            type="button"
            onClick={() => setActiveTabSide(activeTabSide === 'teleprompter' ? 'replacements' : 'teleprompter')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              activeTabSide === 'teleprompter'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
            }`}
            title="Toggle live script teleprompter"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-300" />
            <span>Teleprompter</span>
          </button>

          {/* Mute Audio Toggle */}
          <button
            onClick={() => setIsAgentMuted(!isAgentMuted)}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
              isAgentMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-indigo-400 hover:text-white'
            }`}
            title={isAgentMuted ? "Coach audio muted" : "Coach audio active (Fenrir)"}
          >
            {isAgentMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN STUDIO WORKSPACE (TWO COLUMNS)
         ========================================================================= */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* =========================================================================
            LEFT COLUMN: CURRICULUM SIDE PANEL (5 cols)
            - Live Teleprompter (Script Reading & Live Edit)
            - Lethal Mistakes (Never Say)
            - High-Leverage Replacements (Say This Instead)
            - Live Feedback Notes & Script Blueprint Draft
           ========================================================================= */}
        <div className="lg:col-span-5 border-r border-slate-800 bg-[#080B14] p-5 flex flex-col gap-4 overflow-y-auto max-h-[700px]">
          
          {/* Side Panel Tab Navigator */}
          <div className={`${workshopMode === 'simulation' ? 'grid-cols-4' : 'grid-cols-3'} grid gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800 text-xs font-bold`}>
            {workshopMode === 'simulation' && (
              <button
                onClick={() => setActiveTabSide('teleprompter')}
                className={`py-2 px-1 rounded-xl text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                  activeTabSide === 'teleprompter'
                    ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-600/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate">Prompter</span>
              </button>
            )}

            <button
              onClick={() => setActiveTabSide('replacements')}
              className={`py-2 px-1 rounded-xl text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                activeTabSide === 'replacements'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">Say This</span>
            </button>

            <button
              onClick={() => setActiveTabSide('mistakes')}
              className={`py-2 px-1 rounded-xl text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                activeTabSide === 'mistakes'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-600/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="truncate">Never Say</span>
            </button>

            <button
              onClick={() => setActiveTabSide('notes')}
              className={`py-2 px-1 rounded-xl text-center transition flex items-center justify-center gap-1 cursor-pointer ${
                activeTabSide === 'notes'
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-600/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="truncate">Notes</span>
            </button>
          </div>

          {/* TAB 0: LIVE TELEPROMPTER */}
          {workshopMode === 'simulation' && activeTabSide === 'teleprompter' && (
            <div className="h-[600px] animate-fadeIn">
              <PracticeTeleprompter
                onInsertText={(text) => {
                  setUserSpeechInput(prev => prev ? `${prev} ${text}` : text);
                }}
                className="h-full"
              />
            </div>
          )}

          {/* TAB 1: LETHAL MISTAKES (NEVER SAY) */}
          {activeTabSide === 'mistakes' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Lethal Mistakes (Never Say)
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeLesson.lethalMistakes.length} Fatal Traps
                </span>
              </div>

              <div className="space-y-3">
                {activeLesson.lethalMistakes.map((m, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-800/40 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold uppercase">
                        {m.trigger}
                      </span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold">Trap #{idx + 1}</span>
                    </div>
                    <p className="text-xs font-bold text-white line-through decoration-rose-500 decoration-2 italic">
                      {m.phrase}
                    </p>
                    <p className="text-[11px] text-rose-200/80 leading-relaxed">
                      👉 <strong className="text-rose-300">Why it fails:</strong> {m.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: HIGH-LEVERAGE REPLACEMENTS (SAY THIS INSTEAD) */}
          {activeTabSide === 'replacements' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  High-Leverage Replacements
                </span>
                <span className="text-[10px] text-slate-500">
                  {activeLesson.highLeverageReplacements.length} Power Lines
                </span>
              </div>

              <div className="space-y-3">
                {activeLesson.highLeverageReplacements.map((r, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">
                        {r.trigger}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">Line #{idx + 1}</span>
                    </div>
                    <p className="text-xs font-bold text-emerald-100 italic leading-relaxed">
                      "{r.phrase}"
                    </p>
                    <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                      💡 <strong className="text-emerald-300">Contractor Psychology:</strong> {r.whyItWorks}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LIVE COACH NOTES & BLUEPRINT DRAFT */}
          {activeTabSide === 'notes' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  Live Feedback Notes ({liveCoachNotes.length})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Lesson 0{activeLesson.number}
                </span>
              </div>

              {/* Lesson 2 Special Blueprint Draft Box */}
              {activeLesson.id === 'lesson-blueprint' && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Live Script Draft Assembly
                    </span>
                    <button
                      type="button"
                      onClick={handleCommitDraftToBoard}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] flex items-center gap-1 transition cursor-pointer"
                    >
                      <Zap className="w-3 h-3 text-amber-400" />
                      Commit to Board
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">1. 20-Second Hook</span>
                      <p className="text-[11px] text-slate-200 italic mt-0.5">
                        {scriptDraftState.hook || "Hey Carl, Katy here. Give me 20 seconds: if this doesn't stop you eating $1,200 on plumbing runs, tell me to jump in the river. Fair?"}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">2. Bleeding-Neck Pain</span>
                      <p className="text-[11px] text-slate-200 italic mt-0.5">
                        {scriptDraftState.pain || "10 hours every Sunday handwriting kitchen & bath quotes and eating $1,200 on lost lumber scrap notes."}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">3. Differentiated Proof & Offline</span>
                      <p className="text-[11px] text-slate-200 italic mt-0.5">
                        {scriptDraftState.proof || "Works with zero cell service in the hollows—syncs straight into billing on Route 60."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feed of Live Notes from Marcus */}
              {liveCoachNotes.length === 0 ? (
                <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-xs text-slate-500">
                  <p>No feedback notes recorded yet.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Submit your responses in the drill stage on the right to receive live grading notes from Coach Marcus.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {liveCoachNotes.map(n => (
                    <div key={n.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-indigo-300">{n.drillTitle}</span>
                        <span className="font-extrabold text-amber-400">★ {n.score}/5</span>
                      </div>
                      <p className="text-xs text-white font-medium">
                        "{n.correction}"
                      </p>
                      <span className="text-[9px] text-slate-500 block text-right">{n.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* =========================================================================
            RIGHT COLUMN: INTERACTIVE COACHING CHAT & DRILL STAGE (7 cols)
           ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col bg-[#0A0E1A] p-5 sm:p-6 justify-between gap-4">
          
          {/* Scenario Progress Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-300">
                Drill {currentScenarioIndex + 1} of {activeLesson.scenarios.length}:
              </span>
              <span className="text-xs font-extrabold text-white">
                {activeScenario.title}
              </span>
            </div>

            {/* Scenario Stepper Buttons */}
            <div className="flex items-center gap-1.5">
              {activeLesson.scenarios.map((scen, idx) => (
                <button
                  key={scen.id}
                  onClick={() => setCurrentScenarioIndex(idx)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                    idx === currentScenarioIndex
                      ? 'bg-indigo-600 text-white shadow-md'
                      : completedScenarios[`${activeLesson.id}-${scen.id}`]
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={scen.title}
                >
                  {completedScenarios[`${activeLesson.id}-${scen.id}`] ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* =========================================================================
              3-WAY STUDIO MODE SWITCHER & SCRIPT CO-PILOT ACTIONS
             ========================================================================= */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleModeChange('classroom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    workshopMode === 'classroom'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Classroom Drill</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('copilot')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    workshopMode === 'copilot'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-300" />
                  <span>Script Co-Pilot</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('simulation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    workshopMode === 'simulation'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
                  <span>Simulated Call</span>
                </button>
              </div>

              {/* Script Builder Bridge & Teleprompter Lock */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSendToScriptBuilder}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition cursor-pointer"
                  title="Export coaching script directly into Script Builder module"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Send to Script Builder</span>
                </button>

                <button
                  type="button"
                  onClick={handleLockToTeleprompter}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Lock current pitch draft into Active Teleprompter"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lock to Teleprompter</span>
                </button>
              </div>
            </div>

            {/* Quick Drafting Pills in Script Co-Pilot Mode */}
            {workshopMode === 'copilot' && (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 animate-fadeIn">
                <span className="text-[10px] font-black uppercase text-purple-400 mr-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Quick Prompts:
                </span>
                <button
                  type="button"
                  onClick={() => setUserSpeechInput("Hey Carl, Katy here. I know you're hauling materials down Route 60, but give me 20 seconds: if this doesn't stop you eating $1,200 on plumbing runs, tell me to jump in the river. Fair?")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-950/60 border border-slate-700/60 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-purple-200 transition cursor-pointer"
                >
                  🎯 10s Hook
                </button>
                <button
                  type="button"
                  onClick={() => setUserSpeechInput("Does handwriting quotes for 10 hours every Sunday and eating $1,200 on lost lumber scrap notes sound familiar?")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-950/60 border border-slate-700/60 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-purple-200 transition cursor-pointer"
                >
                  💥 Bleeding-Neck Pain
                </button>
                <button
                  type="button"
                  onClick={() => setUserSpeechInput("Works with zero cell service in the hollows—syncs straight into billing when you hit 4G.")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-950/60 border border-slate-700/60 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-purple-200 transition cursor-pointer"
                >
                  🛠️ Offline Proof
                </button>
                <button
                  type="button"
                  onClick={() => setUserSpeechInput("Give me 10 minutes this Thursday. If it doesn't fit your crew, tell me to jump in the river. Fair?")}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-950/60 border border-slate-700/60 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-purple-200 transition cursor-pointer"
                >
                  🤝 10-Min Audit Close
                </button>
              </div>
            )}
          </div>

          {/* Standalone Launch Prompt for Sandbox Issues */}
          {micSandboxBlocked && (
            <div className="p-3.5 rounded-2xl bg-amber-950/70 border border-amber-500/80 text-amber-200 text-xs flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-semibold text-white">
                  Microphone blocked by preview sandbox. Click here to open in a dedicated browser tab.
                </span>
              </div>
              <a
                href={typeof window !== 'undefined' ? window.location.href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Dedicated Tab</span>
              </a>
            </div>
          )}

          {/* Visible Error Message if mic access is denied or unavailable */}
          {liveAudioErrorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/80 text-rose-200 text-xs flex items-center justify-between gap-2 shadow animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{liveAudioErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setLiveAudioErrorMessage('')}
                className="text-rose-400 hover:text-white p-1 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* =========================================================================
              CONSTANT GEMINI LIVE CONVERSATIONAL VOICE COCKPIT
             ========================================================================= */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isLiveAudioConnected
              ? 'bg-gradient-to-r from-indigo-950/90 via-slate-900 to-purple-950/90 border-indigo-500 shadow-xl shadow-indigo-500/10'
              : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-md transition-all ${
                  isLiveAudioConnected
                    ? liveAudioStatus === 'speaking'
                      ? 'bg-gradient-to-br from-emerald-500 to-indigo-600 text-white ring-4 ring-emerald-500/30 animate-pulse'
                      : liveAudioStatus === 'listening'
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white ring-4 ring-indigo-500/30'
                      : 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {isLiveAudioConnected ? (
                    <Radio className="w-5 h-5 text-white animate-pulse" />
                  ) : (
                    <PhoneCall className="w-5 h-5 text-indigo-400" />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isLiveAudioConnected && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    )}
                    <span className="text-xs font-black text-white">
                      {isLiveAudioConnected
                        ? 'Gemini Live Voice Active'
                        : liveAudioStatus === 'connecting'
                        ? 'Connecting Real-Time Audio...'
                        : 'Interactive Gemini Live Voice Call'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      <Radio className="w-2.5 h-2.5" />
                      models/gemini-3.8-live
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                      &lt;35ms latency • PCM 16k In / 24k Out
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 text-amber-400" />
                      Interruption Ready (Barge-in Enabled)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {isLiveAudioConnected ? (
                      liveAudioStatus === 'speaking' ? (
                        <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                          Coach Marcus is speaking aloud to you (Fenrir voice)...
                        </span>
                      ) : liveAudioStatus === 'listening' ? (
                        <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          Listening to your voice... deliver your line naturally!
                        </span>
                      ) : (
                        <span>Live bidirectional audio active. Speak anytime — Marcus will respond aloud.</span>
                      )
                    ) : (
                      <span>Talk back and forth in real-time. Marcus speaks aloud, listens to your delivery, and critiques your tone.</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Live Audio Action Controls */}
              <div className="flex items-center gap-2">
                {isLiveAudioConnected && (
                  <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 h-9">
                    {[0.3, 0.7, 1.0, 0.6, 0.4].map((baseHeight, i) => {
                      const level = liveAudioStatus === 'speaking' 
                        ? Math.max(0.2, (audioAmplitude.output || 0.4) * baseHeight * 2) 
                        : liveAudioStatus === 'listening' 
                        ? Math.max(0.2, (audioAmplitude.input || 0.3) * baseHeight * 2)
                        : 0.2;
                      return (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-all duration-75 ${
                            liveAudioStatus === 'speaking'
                              ? 'bg-emerald-400'
                              : liveAudioStatus === 'listening'
                              ? 'bg-indigo-400'
                              : 'bg-slate-700'
                          }`}
                          style={{ height: `${Math.min(24, Math.max(4, level * 24))}px` }}
                        />
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleToggleLiveAudio}
                  className={`px-4 py-2 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 ${
                    isLiveAudioConnected
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
                      : liveAudioStatus === 'connecting'
                      ? 'bg-amber-600/40 text-amber-200 border border-amber-500 animate-pulse'
                      : 'bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white shadow-emerald-600/30'
                  }`}
                >
                  {isLiveAudioConnected ? (
                    <>
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>End Live Call</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Start Live Voice Call with Marcus</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Real-time Streaming Words Ticker */}
            {isLiveAudioConnected && liveTokens && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-950/90 border border-indigo-500/30 text-xs text-indigo-200 italic flex items-center gap-2 animate-fadeIn">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="line-clamp-2">{liveTokens}</span>
              </div>
            )}
          </div>

          {/* Dialogue Message Stream */}
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[460px] pr-2 text-xs">
            {lessonMessages.map((m) => {
              const isUser = m.sender === 'user';

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl flex flex-col gap-2 ${
                    isUser
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-slate-100 ml-8'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 mr-4 shadow-xl'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-extrabold">
                    <span className={isUser ? 'text-indigo-400' : 'text-amber-400 flex items-center gap-1.5'}>
                      {!isUser && <div className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">MV</div>}
                      {isUser ? 'Your Spoken Delivery' : 'Coach Marcus Vance'}
                    </span>
                    
                    {m.score && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                        ★ {m.score}/5 {m.scoreLabel && `• ${m.scoreLabel}`}
                      </span>
                    )}
                  </div>

                  <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-medium">
                    {m.text}
                  </div>

                  {/* Concrete Correction Card inside Coach Reply */}
                  {m.correction && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Marcus's Tactical Fix:
                      </span>
                      <p className="font-bold text-white leading-relaxed">
                        {m.correction}
                      </p>
                      {m.psychology && (
                        <p className="text-[11px] text-amber-300/80 pt-1 border-t border-amber-500/20 mt-1">
                          🧠 <strong>Psychological Reality:</strong> {m.psychology}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Next Step Action Button inside message */}
                  {m.scenarioCompleted && currentScenarioIndex < activeLesson.scenarios.length - 1 && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleAdvanceScenario}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <span>Next Challenge ({currentScenarioIndex + 2}/{activeLesson.scenarios.length})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isEvaluating && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 text-indigo-400 text-xs font-bold flex items-center gap-2.5 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Coach Marcus is analyzing your pitch phrasing and psychological triggers...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Bar: Live Audio Connected State (Zero Click-to-Talk) vs Standard Fallback */}
          {isLiveAudioConnected ? (
            <div className="pt-3 border-t border-indigo-500/30 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/50 shadow-xl flex flex-wrap items-center justify-between gap-4">
                
                {/* Left: Continuous streaming indicator & status */}
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-10 h-10 rounded-full bg-emerald-500/20 animate-ping" />
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                      <Mic className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-black text-white uppercase tracking-wider">
                        Live Audio Connected • Zero Click-to-Talk
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold">
                        16kHz PCM Stream
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1">
                      {liveAudioStatus === 'speaking' ? (
                        <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                          Marcus is speaking aloud. Speak anytime to barge in &amp; interrupt!
                        </span>
                      ) : (
                        <span className="text-indigo-300 font-medium flex items-center gap-1.5">
                          <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
                          Microphone streaming continuously. Speak naturally — no buttons needed.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Audio Waveform & End Call Button */}
                <div className="flex items-center gap-3">
                  {/* Dynamic 5-bar Waveform */}
                  <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 h-10">
                    {[0.35, 0.75, 1.0, 0.65, 0.45].map((baseHeight, i) => {
                      const level = liveAudioStatus === 'speaking'
                        ? Math.max(0.2, (audioAmplitude.output || 0.4) * baseHeight * 2.2)
                        : Math.max(0.2, (audioAmplitude.input || 0.3) * baseHeight * 2.2);
                      return (
                        <div
                          key={i}
                          className={`w-1.5 rounded-full transition-all duration-75 ${
                            liveAudioStatus === 'speaking'
                              ? 'bg-emerald-400'
                              : 'bg-indigo-400'
                          }`}
                          style={{ height: `${Math.min(26, Math.max(4, level * 26))}px` }}
                        />
                      );
                    })}
                  </div>

                  {/* Single End Call Button */}
                  <button
                    type="button"
                    onClick={handleToggleLiveAudio}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 transition"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call</span>
                  </button>
                </div>

              </div>

              {/* Spoken transcript ticker if text tokens are streaming */}
              {liveTokens && (
                <div className="mt-2 p-2 rounded-xl bg-slate-950/90 border border-indigo-500/30 text-xs text-indigo-200 italic flex items-center gap-2 animate-fadeIn">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="line-clamp-2">{liveTokens}</span>
                </div>
              )}
            </div>
          ) : (
            /* Interactive User Input Bar */
            <form onSubmit={handleSubmitResponse} className="pt-3 border-t border-slate-800 space-y-2">
              <div className="relative">
                <textarea
                  rows={2}
                  value={userSpeechInput}
                  onChange={(e) => setUserSpeechInput(e.target.value)}
                  placeholder="Deliver your response to Coach Marcus (e.g. 'Hey Carl, Katy here...')..."
                  disabled={isEvaluating}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 pr-14 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none disabled:opacity-50"
                />

                <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={!userSpeechInput.trim() || isEvaluating}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition flex items-center justify-center cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Want hands-free conversation? Click <strong>"Start Live Voice Call with Marcus"</strong> above</span>
                <span>Press Enter to submit text</span>
              </div>
            </form>
          )}

        </div>

      </div>

      {/* Iframe mic permission modal */}
      <IframeMicModal 
        isOpen={isIframeMicModalOpen} 
        onClose={() => setIsIframeMicModalOpen(false)} 
      />

    </div>
  );
}

WorkshopLessonStudio.propTypes = {
  lessonId: PropTypes.string,
  onClose: PropTypes.func,
  onSelectLesson: PropTypes.func
};
