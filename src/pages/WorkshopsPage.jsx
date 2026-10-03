import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { 
  Zap, 
  ArrowLeft, 
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
  ExternalLink,
  Award,
  ChevronRight,
  Flame,
  Clock,
  Target,
  FileText,
  BookOpen,
  Layers,
  Radio,
  Check,
  Compass
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { askGeminiCoach } from '../lib/geminiClient';
import { playPickupClick, playHangupClick } from '../lib/soundUtils';
import IframeMicModal from '../components/IframeMicModal';
import WorkshopLessonStudio, { FOUNDATIONS_LESSONS } from '../components/WorkshopLessonStudio';
import DiscoveryClosingLab from '../components/DiscoveryClosingLab';

export const WORKSHOP_DRILLS = [
  {
    id: 'drill-hook',
    title: 'The 20-Second Pattern Interrupt',
    subtitle: 'Hooking rushed truck drivers in under 20s',
    breakdown: 'Acknowledge their jobsite or truck cab chaos in the first 7 seconds, name the bleeding-neck pain, and earn permission to continue.',
    personaName: "Carl 'Mac' McIntyre",
    trade: 'General Contractor • Route 60, WV',
    objectionText: "Hey, make it quick—I'm hauling materials down Route 60 in my truck right now. Who is this and what do you want?",
    idealCounter: "Hey Carl, Katy here. I know you're hauling down Route 60, but give me 20 seconds: if this doesn't stop you from handwriting quotes for 10 hours every Sunday and eating $1,200 on unbudgeted plumbing runs, tell me to jump in the river. Fair?",
    keyFriction: 'Rushed truck driver, ready to hang up in 5 seconds.'
  },
  {
    id: 'drill-gatekeeper',
    title: 'The Connie / Gatekeeper Deflection',
    subtitle: 'Getting past spouses and office managers directly and respectfully',
    breakdown: 'Never pitch the gatekeeper; validate their authority, explain the high-ticket risk, and request a direct cell or 30-second filter.',
    personaName: "Carl 'Mac' McIntyre",
    trade: 'Residential Remodeler • Kanawha County',
    objectionText: "Just shoot an email to my wife Connie at the office. She handles all the paperwork, scheduling, and software stuff.",
    idealCounter: "Happy to send Connie the paperwork, Carl, but I want to make sure you two actually want this before cluttering her inbox. Give me 30 seconds to explain the math, and if it's no fit, I'll never call back. Fair?",
    keyFriction: 'Reflexive email brush-off to protect office inbox.'
  },
  {
    id: 'drill-estimating',
    title: 'The Sunday Estimating Pivot',
    subtitle: "Flipping 'I do it on a yellow pad' into saved weekend hours",
    breakdown: 'Validate their legal pad habit first, then highlight the catastrophic unbudgeted change order liability that handwriting creates.',
    personaName: 'Delbert Workman',
    trade: 'Excavation & Site Prep • Elkview, WV',
    objectionText: "I've been quoting jobs with a yellow legal pad on Sunday nights for 25 years. I don't need some tech app to tell me how to run my business.",
    idealCounter: "Legal pads are great until a homeowner claims you agreed to move a load-bearing wall for free. This turns your legal pad notes into a signed PDF change order in 60 seconds so you stop eating $2k on disputed runs.",
    keyFriction: 'Decades of habit and deep skepticism of Silicon Valley software.'
  },
  {
    id: 'drill-changeorder',
    title: 'The Unbilled Change Order Challenge',
    subtitle: 'Proving ROI on lost parts and unbilled machine hours',
    breakdown: 'Quantify the silent bleeding neck—lost parts under truck floorboards or unbilled rock hammer hours—with concrete local dollar amounts.',
    personaName: "Travis 'Bo' Pauley",
    trade: 'HVAC & Mechanical • Teays Valley, WV',
    objectionText: "My techs aren't computer guys. They're not gonna tap screens with dirty work gloves, and we already buy all our parts through Ferguson on account.",
    idealCounter: "Buying on account isn't the problem—it's matching that Ferguson slip to the customer ticket so you're not paying for fittings out of pocket. It's 2 taps: snap a photo of the supply ticket, and it attaches to billing in 5 seconds.",
    keyFriction: 'Tech reluctance to use apps and unbilled truck stock leakage.'
  }
];

export default function WorkshopsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'drills' 
    ? 'drills' 
    : searchParams.get('tab') === 'discovery' 
    ? 'discovery' 
    : 'foundations';
  const initialLesson = searchParams.get('lesson') || null;
  const initialLive = searchParams.get('live') === 'true';

  const [workshopTab, setWorkshopTab] = useState(initialTab);
  const [activeLessonId, setActiveLessonId] = useState(initialLesson);
  const [startWithLiveVoice, setStartWithLiveVoice] = useState(initialLive);

  const [selectedDrillIndex, setSelectedDrillIndex] = useState(0);
  const activeDrill = WORKSHOP_DRILLS[selectedDrillIndex];

  const handleSelectLesson = (lessonId, startLive = false) => {
    setActiveLessonId(lessonId);
    setStartWithLiveVoice(startLive);
    setWorkshopTab('foundations');
    setSearchParams({ tab: 'foundations', lesson: lessonId, ...(startLive ? { live: 'true' } : {}) });
  };

  const handleCloseLesson = () => {
    setActiveLessonId(null);
    setStartWithLiveVoice(false);
    setSearchParams({ tab: 'foundations' });
  };

  // Drill Execution State
  const [drillStatus, setDrillStatus] = useState('ready'); // 'ready' | 'objection_delivered' | 'evaluating' | 'completed'
  const [userResponse, setUserResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [drillScore, setDrillScore] = useState(null); // { score: 1-5, correction: string, feedback: string, modelDelivery: string }
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);
  const [drillHistory, setDrillHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('scriptmaster_workshop_scores');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const recognitionRef = useRef(null);
  const responseInputRef = useRef(null);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  // Voice speech-to-text dictation
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
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setUserResponse(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };
      recognition.onerror = (e) => {
        setIsListening(false);
        if (isInIframe || e?.error === 'not-allowed') {
          setIsIframeMicModalOpen(true);
        }
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      if (isInIframe) {
        setIsIframeMicModalOpen(true);
      }
    }
  };

  // Run Drill Trigger
  const handleRunDrill = () => {
    playPickupClick();
    setDrillStatus('objection_delivered');
    setUserResponse('');
    setDrillScore(null);
    setTimeout(() => {
      responseInputRef.current?.focus();
    }, 200);
  };

  // Submit Rep Counter for Marcus Evaluation
  const handleSubmitCounter = async (e) => {
    if (e) e.preventDefault();
    if (!userResponse.trim() || drillStatus === 'evaluating') return;

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setIsListening(false);
    }

    setDrillStatus('evaluating');

    const prompt = `You are Marcus Vance, an aggressive, elite, practical B2B Cold Calling Coach for blue-collar contractors.
DRILL: "${activeDrill.title}"
CONTRACTOR OBJECTION: "${activeDrill.objectionText}"
TARGET CONTRACTOR: "${activeDrill.personaName} (${activeDrill.trade})"
BENCHMARK COUNTER: "${activeDrill.idealCounter}"

THE SALES REP'S COUNTER-RESPONSE:
"${userResponse.trim()}"

YOUR TASK:
Deliver an instant micro-evaluation:
1. Score from 1 to 5 (1 = Flopped/Telemarketer fluff, 2 = Weak/Hesitant, 3 = Decent, 4 = Sharp closer, 5 = Lethal master).
2. Exactly ONE CONCRETE CORRECTION (1 sentence max, direct, zero padding).
3. Short critique explaining what they missed or nailed.

OUTPUT STRICTLY AS JSON:
{
  "score": 4,
  "scoreLabel": "Sharp Closer",
  "correction": "Drop 'Did I catch you at a bad time' and demand the 20-second contract directly.",
  "feedback": "Great local road reference on Route 60, but you sounded hesitant on the final question.",
  "modelDelivery": "${activeDrill.idealCounter}"
}`;

    try {
      const response = await askGeminiCoach({
        systemPrompt: "You are Marcus Vance evaluating a rapid sales micro-drill. Return valid JSON only.",
        userMessage: prompt,
        stage: 'workshop_micro_drill',
        currentBusiness: {
          ownerName: activeDrill.personaName,
          target: activeDrill.trade
        }
      });

      let parsed = null;
      if (response && response.text) {
        const match = response.text.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        }
      }

      if (!parsed) {
        // Fallback intelligent evaluation
        const wordCount = userResponse.trim().split(/\s+/).length;
        const hasFair = /fair|river|permission/i.test(userResponse);
        const hasTime = /20|seconds|30/i.test(userResponse);
        const score = hasFair && hasTime ? 4 : wordCount > 10 ? 3 : 2;
        parsed = {
          score,
          scoreLabel: score >= 4 ? "Sharp Closer" : score === 3 ? "Solid Attempt" : "Needs Pacing Work",
          correction: "Anchor on the concrete $1,200 loss immediately and give them permission to hang up.",
          feedback: "You addressed the friction, but tighten your phrasing so you don't exceed 20 seconds.",
          modelDelivery: activeDrill.idealCounter
        };
      }

      setDrillScore(parsed);
      setDrillStatus('completed');

      // Save drill history
      const updatedHistory = {
        ...drillHistory,
        [activeDrill.id]: {
          score: parsed.score,
          date: new Date().toISOString()
        }
      };
      setDrillHistory(updatedHistory);
      try {
        localStorage.setItem('scriptmaster_workshop_scores', JSON.stringify(updatedHistory));
      } catch {
        /* ignore */
      }

    } catch {
      const fallbackScore = {
        score: 3,
        scoreLabel: "Solid Attempt",
        correction: "Eliminate qualifiers and challenge him with 'tell me to jump in the river. Fair?'",
        feedback: "Good recognition of his truck environment, but punch up the closing ask.",
        modelDelivery: activeDrill.idealCounter
      };
      setDrillScore(fallbackScore);
      setDrillStatus('completed');
    }
  };

  const handleResetDrill = () => {
    playHangupClick();
    setDrillStatus('ready');
    setUserResponse('');
    setDrillScore(null);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* =========================================================================
            TOP HEADER ROW
           ========================================================================= */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            <span className="text-slate-600">/</span>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                <span>Cold Calling Skill Workshops</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1">
                  <Flame className="w-3 h-3 text-indigo-400" />
                  Rapid Micro-Drills
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Master 4 lethal objections for high-ticket field ops &amp; contractor software with Coach Marcus.
              </p>
            </div>
          </div>

          <Link
            to="/practice"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition flex items-center gap-2 shadow-sm shrink-0 self-start sm:self-auto"
          >
            <span>Full Practice Studio</span>
            <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
          </Link>
        </header>

        {/* =========================================================================
            WORKSHOP SECTION TABS: Foundations & Script Lab vs Objection Reps
           ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setWorkshopTab('foundations');
                setSearchParams({ tab: 'foundations' });
              }}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
                workshopTab === 'foundations'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-300" />
              <span>Foundations &amp; Script Lab</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 text-[10px] font-extrabold border border-indigo-500/30">
                3 Master Lessons
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWorkshopTab('discovery');
                setSearchParams({ tab: 'discovery' });
                setActiveLessonId(null);
              }}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
                workshopTab === 'discovery'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Sales Discovery &amp; Closing Lab</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                4-Step Science
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWorkshopTab('drills');
                setSearchParams({ tab: 'drills' });
                setActiveLessonId(null);
              }}
              className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
                workshopTab === 'drills'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Contractor Objection Drills</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-extrabold border border-slate-700">
                4 Pushback Reps
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 pr-2">
            <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Coach Marcus Live Audio
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-[11px] font-mono text-slate-400">gemini-3.8-flash &amp; gemini-3.8-live</span>
          </div>
        </div>

        {/* =========================================================================
            TAB 1: FOUNDATIONS & SCRIPT LAB (MASTER LESSONS WITH COACH MARCUS)
           ========================================================================= */}
        {workshopTab === 'foundations' && (
          activeLessonId ? (
            <div className="animate-fadeIn">
              <WorkshopLessonStudio
                lessonId={activeLessonId}
                onClose={handleCloseLesson}
                onSelectLesson={(id) => handleSelectLesson(id, false)}
                initialStartLiveVoice={startWithLiveVoice}
              />
            </div>
          ) : (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Lab Intro Banner */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-[#0B0F1C] border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                <div className="max-w-3xl space-y-3 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Interactive Coaching &amp; Script Mastery
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Foundations &amp; Script Lab with Coach Marcus
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Eliminate commission breath, wire in the 4-part contractor pitch architecture, and master frame control with instant AI voice drills. Marcus listens, critiques line-by-line, and outputs finished scripts directly into your active script board.
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Lethal Mistake Diagnostics
                    </span>
                    <span className="flex items-center gap-1.5 text-indigo-300">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Automated Script Board Sync
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <Radio className="w-4 h-4 text-amber-400" />
                      Bidirectional Gemini Live Voice
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Structured Master Lessons Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                
                {/* LESSON 1 */}
                <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-7 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-6 shadow-xl relative group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                        Lesson 01 • Architecture
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        6 min • 3 Scenarios
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-indigo-200 transition">
                        Cold Call Architecture: What to Say vs. What NEVER to Say
                      </h3>
                      <p className="text-xs text-indigo-300 font-semibold mt-1">
                        Eliminating commission breath, timid openers, and corporate pitch slaps
                      </p>
                    </div>

                    <div className="space-y-2 pt-1 text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        Core Focus:
                      </span>
                      <ul className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed list-disc list-inside">
                        <li>Eliminating timid qualifiers (<span className="text-rose-400 font-semibold italic">"Did I catch you at a bad time?"</span>)</li>
                        <li>Replacing generic telemarketer banter with the crisp <strong>20-Second Contract</strong></li>
                        <li>Negative reverse close: <span className="text-emerald-300 font-semibold">"tell me to jump in the river. Fair?"</span></li>
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        Mechanism:
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Interactive conversational drill with Coach Marcus. He presents common contractor scenarios, tests the user on "Right Phrase vs. Fatal Trap", explains the psychological trigger behind contractor reactions, and grades responses 1-5.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-[11px] space-y-0.5">
                        <span className="text-[9px] font-extrabold uppercase text-rose-400 block">🛑 Fatal Trap (Never Say):</span>
                        <p className="text-rose-200 font-medium italic">"Did I catch you at a bad time? Just checking in..."</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-[11px] space-y-0.5">
                        <span className="text-[9px] font-extrabold uppercase text-emerald-400 block">✅ High-Leverage Replacement:</span>
                        <p className="text-emerald-200 font-medium italic">"Hey Carl, Katy here. I know you're hauling down Route 60, but give me 20 seconds..."</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSelectLesson('lesson-architecture', true)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 cursor-pointer transition active:scale-[0.98] ring-2 ring-emerald-500/40"
                    >
                      <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                      <span>🎙️ Start Real-Time Live Voice Call (gemini-3.8-live)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectLesson('lesson-architecture', false)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Open Lesson Studio (Text &amp; Voice)</span>
                    </button>
                  </div>
                </div>

                {/* LESSON 2 */}
                <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-7 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-6 shadow-xl relative group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                        Lesson 02 • Script Blueprint
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        8 min • 3 Steps
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-indigo-200 transition">
                        The 4-Part Script Blueprint: Hook, Bleeding-Neck Pain, Proof &amp; Ask
                      </h3>
                      <p className="text-xs text-indigo-300 font-semibold mt-1">
                        Constructing custom 20-second scripts step-by-step for any blue-collar trade
                      </p>
                    </div>

                    <div className="space-y-2 pt-1 text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        Core Focus:
                      </span>
                      <ul className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed list-disc list-inside">
                        <li>Mastering the 4 parts: <strong>Hook</strong>, <strong>Bleeding-Neck Pain</strong>, <strong>Proof</strong>, <strong>Low-Friction Ask</strong></li>
                        <li>Tailoring pitches to trades: plumbing, excavation, roofing, HVAC</li>
                        <li>Rewiring vague tech jargon into tangible field assets (Ferguson receipts, scrap lumber, Sunday paperwork)</li>
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        Mechanism:
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Guided script-building dialogue where Coach Marcus prompts the user line by line, provides real-time critique, rewires weak phrasing, and outputs the finished script directly into the user's active script board.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-[11px] space-y-0.5">
                        <span className="text-[9px] font-extrabold uppercase text-rose-400 block">🛑 Fatal Trap (Never Say):</span>
                        <p className="text-rose-200 font-medium italic">"We optimize digital workflows and increase overall crew productivity..."</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-[11px] space-y-0.5">
                        <span className="text-[9px] font-extrabold uppercase text-emerald-400 block">✅ High-Leverage Replacement:</span>
                        <p className="text-emerald-200 font-medium italic">"10 hours every Sunday handwriting kitchen quotes and eating $1,200 on unbudgeted plumbing runs..."</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSelectLesson('lesson-blueprint', true)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 cursor-pointer transition active:scale-[0.98] ring-2 ring-emerald-500/40"
                    >
                      <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                      <span>🎙️ Start Real-Time Live Voice Call (gemini-3.8-live)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectLesson('lesson-blueprint', false)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Open Lesson Studio (Text &amp; Voice)</span>
                    </button>
                  </div>
                </div>

                {/* LESSON 3 */}
                <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-7 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between gap-6 shadow-xl relative group">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                        Lesson 03 • Voice &amp; Frame
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        5 min • 3 Challenges
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-indigo-200 transition">
                        Tone, Pace &amp; Frame Control: Talking Contractor-to-Contractor
                      </h3>
                      <p className="text-xs text-indigo-300 font-semibold mt-1">
                        Developing an authentic peer-to-peer tone and commanding respect on the phone
                      </p>
                    </div>

                    <div className="space-y-2 pt-1 text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        Core Focus:
                      </span>
                      <ul className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed list-disc list-inside">
                        <li>Eliminating upward inflection (? cadence) that screams telemarketer</li>
                        <li>Maintaining deliberate 110-130 wpm tempo with downward inflection (. cadence)</li>
                        <li>Deploying 3-4 second tactical silence after "Fair?" without caving to anxiety</li>
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs">
                      <span className="text-[10px] font-bold uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        Mechanism:
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Rapid-fire voice drill where Marcus roleplays contractor pushback and trains the user to hold frame, pause without stuttering, and use tactical silence instead of rambling.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-[11px] space-y-0.5">
                        <span className="text-[9px] font-extrabold uppercase text-rose-400 block">🛑 Fatal Trap (Never Say):</span>
                        <p className="text-rose-200 font-medium italic">High-pitched rapid telemarketer cadence + rambling when contractor pauses</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-[11px] space-y-0.5">
                        <span className="text-[9px] font-extrabold uppercase text-emerald-400 block">✅ High-Leverage Replacement:</span>
                        <p className="text-emerald-200 font-medium italic">Downward vocal inflection + holding frame through 4-second tactical silence</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSelectLesson('lesson-frame-control', true)}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2.5 cursor-pointer transition active:scale-[0.98] ring-2 ring-emerald-500/40"
                    >
                      <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                      <span>🎙️ Start Real-Time Live Voice Call (gemini-3.8-live)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectLesson('lesson-frame-control', false)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Open Lesson Studio (Text &amp; Voice)</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )
        )}

        {/* =========================================================================
            TAB 2: SALES DISCOVERY & CLOSING LAB (MODERN CONVERSATIONAL SCIENCE)
           ========================================================================= */}
        {workshopTab === 'discovery' && (
          <DiscoveryClosingLab />
        )}

        {/* =========================================================================
            TAB 3: CONTRACTOR OBJECTION DRILLS (4 FOCUSED RAPID MICRO-DRILLS)
           ========================================================================= */}
        {workshopTab === 'drills' && (
          <div className="space-y-8 animate-fadeIn">
            {/* DRILL MODULE SELECTION TABS (4 FOCUSED DRILLS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {WORKSHOP_DRILLS.map((drill, idx) => {
            const isSelected = selectedDrillIndex === idx;
            const pastScore = drillHistory[drill.id];

            return (
              <button
                key={drill.id}
                onClick={() => {
                  if (drillStatus !== 'evaluating') {
                    setSelectedDrillIndex(idx);
                    handleResetDrill();
                  }
                }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 relative ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-xl shadow-indigo-500/10 ring-2 ring-indigo-500/30'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                      Module 0{idx + 1}
                    </span>
                    {pastScore && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold flex items-center gap-1">
                        ★ {pastScore.score}/5
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-black text-white leading-tight">
                    {drill.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {drill.subtitle}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-semibold text-slate-400">
                  <span className="truncate max-w-[150px]">{drill.personaName}</span>
                  <span className={isSelected ? 'text-indigo-400 font-bold' : 'text-slate-500'}>
                    {isSelected ? 'Active Drill' : 'Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            ACTIVE DRILL ARENA (INTERACTIVE FLOW)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Technique Breakdown & Contractor Profile (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Target className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Technique Breakdown
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed font-medium">
                👉 {activeDrill.breakdown}
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                    Target Contractor
                  </span>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {activeDrill.personaName}
                  </p>
                  <span className="text-[11px] text-indigo-300">
                    {activeDrill.trade}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider block">
                    Core Friction Point
                  </span>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {activeDrill.keyFriction}
                  </p>
                </div>
              </div>
            </div>

            {/* Benchmark Master Counter Reference Card */}
            <div className="bg-slate-900/70 rounded-3xl p-5 border border-slate-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcus's Benchmark Formula
              </span>
              <p className="text-xs text-slate-300 italic leading-relaxed pl-2 border-l-2 border-emerald-500/40">
                "{activeDrill.idealCounter}"
              </p>
            </div>
          </div>

          {/* Right: Live Interactive Drill Stage (8 cols) */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-[#0c101d] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6 relative overflow-hidden">
              
              {/* Stage Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">
                    Interactive Drill Stage
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                    {activeDrill.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {drillStatus === 'ready' && (
                    <button
                      onClick={handleRunDrill}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Run Drill</span>
                    </button>
                  )}

                  {drillStatus !== 'ready' && (
                    <button
                      onClick={handleResetDrill}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ready State Prompt */}
              {drillStatus === 'ready' && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h3 className="text-base font-bold text-white">
                      Ready to face {activeDrill.personaName}?
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Click <strong>Run Drill</strong>. Marcus will deliver the abrupt contractor pushback. Speak or type your counter immediately.
                    </p>
                  </div>
                  <button
                    onClick={handleRunDrill}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Drill Now</span>
                  </button>
                </div>
              )}

              {/* Objection Delivered State & Interactive Input */}
              {drillStatus !== 'ready' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Contractor Pushback Balloon */}
                  <div className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-lg space-y-2 relative">
                    <div className="flex items-center justify-between text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        {activeDrill.personaName} Pushback:
                      </span>
                      <span className="text-slate-400 font-mono text-[10px]">
                        Abrupt Objection
                      </span>
                    </div>
                    <blockquote className="text-sm sm:text-base font-bold text-white leading-relaxed italic pl-3 border-l-2 border-amber-400">
                      “{activeDrill.objectionText}”
                    </blockquote>
                  </div>

                  {/* Rep Response Input Bar */}
                  <form onSubmit={handleSubmitCounter} className="space-y-3">
                    <label className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Your Counter-Response:</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Speak via mic or type your line
                      </span>
                    </label>

                    <div className="relative">
                      <textarea
                        ref={responseInputRef}
                        rows={3}
                        value={userResponse}
                        onChange={(e) => setUserResponse(e.target.value)}
                        placeholder="Deliver your counter line (e.g. 'Hey Carl, Katy here on Route 60...')"
                        disabled={drillStatus === 'evaluating' || drillStatus === 'completed'}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-white leading-relaxed focus:outline-none focus:border-indigo-500 transition resize-none disabled:opacity-75"
                      />

                      {/* Microphone Toggle Button */}
                      <button
                        type="button"
                        onClick={toggleVoiceInput}
                        disabled={drillStatus === 'evaluating' || drillStatus === 'completed'}
                        className={`absolute right-3.5 bottom-3.5 p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                          isListening
                            ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-md'
                            : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title={isListening ? "Listening with mic... tap to stop" : "Speak your counter via mic"}
                      >
                        {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-indigo-400" />}
                      </button>
                    </div>

                    {drillStatus === 'objection_delivered' && (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] text-slate-500">
                          {userResponse.trim().split(/\s+/).filter(Boolean).length} words typed
                        </span>

                        <button
                          type="submit"
                          disabled={!userResponse.trim()}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Counter to Marcus</span>
                        </button>
                      </div>
                    )}
                  </form>

                  {/* Evaluating Spinner */}
                  {drillStatus === 'evaluating' && (
                    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center gap-3 text-xs text-indigo-400 font-bold animate-pulse">
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Coach Marcus is scoring your delivery and checking tempo...</span>
                    </div>
                  )}

                  {/* Completed: 1-5 Score & Single Concrete Correction */}
                  {drillStatus === 'completed' && drillScore && (
                    <div className="p-6 rounded-3xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl space-y-5 animate-fadeIn">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                            MV
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white flex items-center gap-2">
                              <span>Marcus's Drill Verdict</span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                                {drillScore.scoreLabel || 'Evaluation'}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400">Micro-drill feedback on {activeDrill.title}</p>
                          </div>
                        </div>

                        {/* 1-5 Star Score Display */}
                        <div className="flex items-center gap-1.5 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
                          <span className="text-xs font-black text-white mr-1">Score:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-base font-bold ${
                                star <= drillScore.score ? 'text-amber-400' : 'text-slate-700'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="text-xs font-mono font-bold text-amber-400 ml-1">
                            {drillScore.score}/5
                          </span>
                        </div>
                      </div>

                      {/* Single Concrete Correction Highlight */}
                      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          Single Concrete Correction:
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                          {drillScore.correction}
                        </p>
                      </div>

                      {/* Coaching Feedback Breakdown */}
                      {drillScore.feedback && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {drillScore.feedback}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleRunDrill}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Drill Again</span>
                        </button>

                        {selectedDrillIndex < WORKSHOP_DRILLS.length - 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDrillIndex(prev => prev + 1);
                              handleResetDrill();
                            }}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>Next Drill: {WORKSHOP_DRILLS[selectedDrillIndex + 1].title}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          </div>

        </div>
        </div>
      )}
      </main>

      {/* IFRAME MICROPHONE PERMISSION / OPEN FULL WINDOW MODAL */}
      <IframeMicModal 
        isOpen={isIframeMicModalOpen} 
        onClose={() => setIsIframeMicModalOpen(false)} 
      />
    </div>
  );
}
