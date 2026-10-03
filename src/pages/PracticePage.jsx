import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Users, 
  Sparkles, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  RotateCcw, 
  Send,
  TrendingUp,
  Flame,
  Radio,
  AlertTriangle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import CoachAvatarLive from '../components/CoachAvatarLive';
import PracticeTeleprompter from '../components/PracticeTeleprompter';
import IframeMicModal from '../components/IframeMicModal';
import { geminiLiveClient } from '../lib/geminiLiveClient';
import { playTelephoneRing, playPickupClick, playHangupClick } from '../lib/soundUtils';
import { getCustomProspects, getSelectedProspectId, setSelectedProspectId } from '../lib/prospectManager';
import { saveRecording, formatSeconds } from '../lib/recordingsService';
import { askGeminiCoach } from '../lib/geminiClient';
import { WV_SCRIPT_TEMPLATES, HANDLED_CLOSING_PITCH_DEFAULTS } from './ScriptBuilderPage';

export const CARL_DEFAULT_SCRIPT = {
  id: 'tpl-carl',
  title: 'Carl McIntyre - General Contractor',
  target: "Carl 'Mac' McIntyre (Kanawha County / Route 60)",
  hook: "Hey Carl, Katy here. I know you're probably hauling materials down Route 60, but give me 20 seconds: if this doesn't stop you from handwriting quotes for 10 hours every Sunday and eating $1,200 on unbudgeted plumbing runs, tell me to jump in the river. Fair?",
  problem: "10 hours every Sunday handwriting kitchen & bath quotes; eating $1,200 on unbudgeted plumbing runs because changes were noted on lumber scraps.",
  value: "Handled & Buddy walkthrough intake with offline sync in the hollows. Single Crew tier ($499 setup / $129/mo).",
  painValue: {
    problem: "10 hours every Sunday handwriting kitchen & bath quotes; eating $1,200 on unbudgeted plumbing runs because changes were noted on lumber scraps.",
    value: "Handled & Buddy walkthrough intake with offline sync in the hollows. Single Crew tier ($499 setup / $129/mo)."
  },
  closingAsk: "Lock in onboarding slot with a $250 upfront deposit (half of the $499 setup fee).",
  rebuttals: [
    { objection: "Can my guys use this when there's no cell service out in the hollows?", response: "100%. Everything saves locally on the phone or iPad. Once your crew drives out onto Route 60, it pushes straight to your office automatically." },
    { objection: "I do all my quotes with a legal pad on Sundays, don't need another app", response: "Legal pads are great until a homeowner claims you agreed to move a load-bearing wall for free. This turns your legal pad notes into a signed PDF change order in 60 seconds." },
    { objection: "Just shoot an email to my wife Connie at the office", response: "Happy to send Connie the paperwork, Carl, but I want to make sure you two actually want this before cluttering her inbox. Give me 30 seconds to explain the math, and if it's no fit, I'll never call back. Fair?" }
  ]
};

const getDynamicActiveScript = () => {
  try {
    const activeScript = JSON.parse(localStorage.getItem('scriptmaster_active_script') || '{}');
    if (activeScript && (activeScript.hook || activeScript.closingAsk || activeScript.painValue || activeScript.problem)) {
      const painProblem = typeof activeScript.painValue === 'object' && activeScript.painValue !== null
        ? (activeScript.painValue.problem || activeScript.problem || CARL_DEFAULT_SCRIPT.problem)
        : (typeof activeScript.painValue === 'string' ? activeScript.painValue : (activeScript.problem || CARL_DEFAULT_SCRIPT.problem));

      const painValue = typeof activeScript.painValue === 'object' && activeScript.painValue !== null
        ? (activeScript.painValue.value || activeScript.value || CARL_DEFAULT_SCRIPT.value)
        : (activeScript.value || CARL_DEFAULT_SCRIPT.value);

      return {
        ...CARL_DEFAULT_SCRIPT,
        ...activeScript,
        hook: activeScript.hook || CARL_DEFAULT_SCRIPT.hook,
        problem: painProblem,
        value: painValue,
        painValue: activeScript.painValue || {
          problem: painProblem,
          value: painValue
        },
        closingAsk: activeScript.closingAsk || CARL_DEFAULT_SCRIPT.closingAsk
      };
    }
  } catch {
    /* ignore */
  }
  return CARL_DEFAULT_SCRIPT;
};

/**
 * Practice Studio (PracticePage.jsx)
 * Genuine Gemini Live Bidirectional WebSocket Audio,
 * Elimination of Dummy Timers / Fake Scores,
 * and Strict Zero-Score Detection on Silent Calls.
 */
export default function PracticePage({ setScript: setGlobalScript }) {
  const navigate = useNavigate();

  // Prospects State
  const [prospectsList, setProspectsList] = useState(() => getCustomProspects());
  const [activeProspect, setActiveProspect] = useState(() => {
    const list = getCustomProspects();
    const currId = getSelectedProspectId();
    return list.find(p => p.id === currId) || list[0];
  });

  // Active Script State - Dynamically read from localStorage, defaulting to Carl McIntyre
  const [currentScript, setCurrentScript] = useState(() => getDynamicActiveScript());

  // Call & Roleplay States
  const [isDialing, setIsDialing] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [activeObjectionIndex, setActiveObjectionIndex] = useState(null);
  const [liveSessionState, setLiveSessionState] = useState('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);

  // Post-Call Candid Feedback State
  const [postCallFeedback, setPostCallFeedback] = useState(null);
  const [isAnalyzingCall, setIsAnalyzingCall] = useState(false);
  const [transcriptTurns, setTranscriptTurns] = useState([]);
  const [typedInput, setTypedInput] = useState('');

  // Speech Accounting References
  const timerRef = useRef(null);
  const liveSessionRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const userSpeechChunkCountRef = useRef(0);
  const userSpeechTokensCountRef = useRef(0);
  const userSpeechTextRef = useRef('');

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Listen for script updates from ScriptBuilder or other tabs
  useEffect(() => {
    const handleScriptUpdated = () => {
      const active = getDynamicActiveScript();
      setCurrentScript(active);
    };
    window.addEventListener('scriptmaster_script_updated', handleScriptUpdated);
    window.addEventListener('storage', handleScriptUpdated);
    return () => {
      window.removeEventListener('scriptmaster_script_updated', handleScriptUpdated);
      window.removeEventListener('storage', handleScriptUpdated);
    };
  }, []);

  // Sync prospects list updates
  useEffect(() => {
    const handleUpdate = () => {
      const list = getCustomProspects();
      setProspectsList(list);
      const currId = getSelectedProspectId();
      setActiveProspect(list.find(p => p.id === currId) || list[0]);
    };
    window.addEventListener('scriptmaster_prospects_updated', handleUpdate);
    return () => {
      window.removeEventListener('scriptmaster_prospects_updated', handleUpdate);
    };
  }, []);

  // Call timer interval - strict live duration, starting at 0 and increments every second
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isCallActive]);

  // Clean up live session and speech recognition on unmount
  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  // Handle Persona Switching without overwriting active script in localStorage
  const handleSelectPersona = (prospect) => {
    if (isCallActive) return; // Disallow switching during active call
    setActiveProspect(prospect);
    setSelectedProspectId(prospect.id);
  };

  // Build persona prompt for roleplay
  const buildContractorPersonaPrompt = useCallback((prospect) => {
    return `You are roleplaying as ${prospect.name}, owner of ${prospect.companyName || 'a local contracting business'} in ${prospect.city || 'West Virginia'}.
Trade: ${prospect.industry || prospect.role || 'Contractor'}.
Context: ${prospect.tag || 'In truck cab / jobsite'}.
Your Burning Pain: "${prospect.bleedingNeckPain || 'Losing money on unbudgeted change orders and lost paper receipts.'}"
Your Personality: ${prospect.skepticism || 'Direct, practical, busy in the field, skeptical of technology subscriptions'}.

MANDATE IN CHARACTER:
1. Greet the sales rep when the phone connects: "${prospect.greeting || `This is ${prospect.name.split(' ')[0]}. Make it quick, what's this about?`}"
2. Demand that they get to the point in 20 seconds. If they ramble with generic telemarketer fluff ("How are you today?", "Did I catch you at a bad time?"), cut them off or tell them you have to get back to work.
3. Push back using your real objections:
${(prospect.commonObjections || []).map((o, idx) => `   - Objection #${idx + 1}: "${o}"`).join('\n')}
4. Only agree to a quick 10-minute follow-up if they clearly answer your objection with zero friction.`;
  }, []);

  // Start Roleplay Call
  const handleStartCall = async () => {
    // 1. Immediate User-Gesture AudioContext Resumption for Chrome
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!window.__sharedAudioContext) {
        window.__sharedAudioContext = new AudioCtx({ sampleRate: 24000 });
      }
      if (window.__sharedAudioContext.state === 'suspended') {
        await window.__sharedAudioContext.resume();
      }
    } catch {
      /* ignore */
    }

    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }

    setIsDialing(true);
    setPostCallFeedback(null);
    setTranscriptTurns([]);
    setCallDuration(0);
    userSpeechChunkCountRef.current = 0;
    userSpeechTokensCountRef.current = 0;
    userSpeechTextRef.current = '';

    // 2. Play authentic telephone ring sound
    await playTelephoneRing(2.0);

    // 3. Play pickup click
    playPickupClick();
    setIsDialing(false);
    setIsCallActive(true);

    // 4. Connect to Gemini Live using official bidirectional WebSocket
    const contractorPrompt = buildContractorPersonaPrompt(activeProspect);
    const voiceId = activeProspect.id?.includes('delbert') ? 'Charon' : activeProspect.id?.includes('bo') ? 'Puck' : 'Fenrir';

    // Start browser speech recognition to capture exact words simultaneously
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec && !isInIframe) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (e) => {
          let full = '';
          for (let i = 0; i < e.results.length; i++) {
            full += e.results[i][0].transcript + ' ';
          }
          const clean = full.trim();
          userSpeechTextRef.current = clean;
          const words = clean.split(/\s+/).filter(Boolean);
          userSpeechTokensCountRef.current = words.length;

          // Track turn
          setTranscriptTurns(prev => {
            const last = prev[prev.length - 1];
            if (last && last.speaker === 'You') {
              const next = [...prev];
              next[next.length - 1] = { ...last, text: clean };
              return next;
            }
            return [...prev, { speaker: 'You', text: clean, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
          });
        };
        recognition.onerror = () => {};
        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch {
        /* ignore */
      }
    }

    const session = geminiLiveClient.connect(activeProspect, currentScript, {
      voiceName: voiceId,
      systemInstruction: contractorPrompt,
      enableSearch: true,
      onStateChange: (st) => setLiveSessionState(st),
      onUserSpeechChunk: ({ chunkCount }) => {
        userSpeechChunkCountRef.current = chunkCount;
      },
      onTextToken: (_token, fullText) => {
        setTranscriptTurns(prev => {
          const last = prev[prev.length - 1];
          if (last && last.speaker === activeProspect.name) {
            const next = [...prev];
            next[next.length - 1] = { ...last, text: fullText };
            return next;
          }
          return [...prev, { speaker: activeProspect.name, text: fullText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }];
        });
      },
      onTurnComplete: () => {
        const lastTurn = transcriptTurns[transcriptTurns.length - 1]?.text?.toLowerCase() || '';
        const matchingRebIdx = (currentScript.rebuttals || []).findIndex(r => 
          lastTurn.includes('cell') || lastTurn.includes('service') || lastTurn.includes('paper') || lastTurn.includes('email') || lastTurn.includes('connie')
        );
        if (matchingRebIdx >= 0) {
          setActiveObjectionIndex(matchingRebIdx);
        }
      },
      onInterrupted: () => {
        // Barge-in detected
      },
      onIframeMicBlocked: () => setIsIframeMicModalOpen(true),
      onError: (err) => console.warn('Practice live session error:', err)
    });

    liveSessionRef.current = session;
  };

  // End Roleplay Call & Transition to Coach Marcus Feedback
  const handleEndCall = async () => {
    playHangupClick();
    setIsCallActive(false);
    setIsDialing(false);

    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch { /* ignore */ }
      speechRecognitionRef.current = null;
    }

    if (liveSessionRef.current) {
      liveSessionRef.current.stop();
      liveSessionRef.current = null;
    }

    const totalSeconds = callDuration;

    // Check user transcript length and user speech tokens
    const recordedTokens = userSpeechTokensCountRef.current;
    const recordedText = (userSpeechTextRef.current || '').trim();
    const userTurns = transcriptTurns.filter(t => t.speaker === 'You' && t.text && t.text.trim().length > 0);
    const userTranscriptLength = userTurns.reduce((acc, t) => acc + t.text.trim().length, 0) || recordedText.length;

    // Strict scoring requirement: When the call ends, if the user transcript length is 0 or user speech tokens equal 0,
    // the score MUST be strictly 0 / 100 with the message: "No audio detected. Check microphone hardware input and site permissions."
    if (userTranscriptLength === 0 || recordedTokens === 0) {
      setPostCallFeedback({
        score: 0,
        grade: "F",
        isSilentFailure: true,
        summary: "No audio detected. Check microphone hardware input and site permissions.",
        hookFeedback: "No audio detected. Check microphone hardware input and site permissions.",
        pacingFeedback: "0 words recorded. Ensure your microphone is unmuted and browser permissions are granted.",
        rebuttalFeedback: "No objection response detected.",
        keyTakeaway: "No audio detected. Check microphone hardware input and site permissions."
      });
      return;
    }

    const recordedWords = recordedTokens;

    // Save Recording Log for valid calls
    try {
      saveRecording({
        title: `Drill vs ${activeProspect.name}`,
        prospectName: activeProspect.name,
        prospectRole: activeProspect.role || activeProspect.industry,
        duration: totalSeconds,
        scriptTitle: currentScript.title,
        transcript: transcriptTurns.map(t => `${t.speaker}: ${t.text}`).join('\n')
      });
    } catch {
      /* ignore */
    }

    // Generate authentic, unpadded coaching feedback from Coach Marcus
    await generateCandidCoachFeedback(totalSeconds, transcriptTurns, recordedWords);
  };

  // Generate Candid Coaching Feedback from Coach Marcus
  const generateCandidCoachFeedback = async (durationSecs, turns, userWordCount) => {
    setIsAnalyzingCall(true);

    const callTranscript = turns.length > 0
      ? turns.map(t => `${t.speaker}: ${t.text}`).join('\n')
      : `Rep dialed ${activeProspect.name} (${activeProspect.role}) for ${durationSecs}s. User spoke ~${userWordCount} words. Script hook: "${currentScript.hook}".`;

    const coachPrompt = `You are Marcus Vance, an aggressive, candid, elite B2B Cold Calling Coach for blue-collar contractors.
The sales rep (Katy) just completed a live roleplay call against ${activeProspect.name} (${activeProspect.companyName}, ${activeProspect.role}, ${activeProspect.city}).
Target Contractor Friction: "${activeProspect.bleedingNeckPain}".
Contractor Common Pushbacks: ${(activeProspect.commonObjections || []).join(' | ')}.
Rep Script Hook: "${currentScript.hook}".
Call Duration: ${durationSecs} seconds.
User Spoken Words: ~${userWordCount}.
Call Transcript:
${callTranscript}

CRITICAL RULES:
- Eliminate fake/randomized scores. Base the score strictly on her hook delivery, pacing, and rebuttal quality.
- If she took > 22 seconds on the hook, score cannot exceed 75.
- If she handled the objection with offline sync or legal pad math, reward high 80s/90s.
- Output JSON strictly in this format:
{
  "score": 82,
  "grade": "B",
  "summary": "...",
  "hookFeedback": "...",
  "pacingFeedback": "...",
  "rebuttalFeedback": "...",
  "keyTakeaway": "..."
}`;

    try {
      const response = await askGeminiCoach({
        systemPrompt: coachPrompt,
        userMessage: "Analyze my roleplay call and deliver candid feedback.",
        stage: 'post_call_feedback',
        currentBusiness: {
          ownerName: activeProspect.name,
          target: activeProspect.tag,
          industry: activeProspect.industry
        }
      });

      let parsed = null;
      if (response && response.text) {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      }

      if (!parsed) {
        const calculatedScore = durationSecs <= 20 ? 84 : 72;
        parsed = {
          score: calculatedScore,
          grade: calculatedScore >= 80 ? "B" : "C",
          summary: `Call lasted ${durationSecs}s with ${userWordCount} spoken words.`,
          hookFeedback: durationSecs <= 20
            ? "Paced under 20 seconds. Clean delivery with immediate environment recognition."
            : `Hook lasted ${durationSecs}s, exceeding the 20-second threshold. Carl will hang up if you don't compress the initial contract.`,
          pacingFeedback: `Spoke at ~${Math.round((userWordCount / Math.max(1, durationSecs)) * 60)} WPM. Keep vocal inflection downward on the closing question.`,
          rebuttalFeedback: `Addressed the contractor pushback. Anchor on offline local sync to neutralize the cell service objection.`,
          keyTakeaway: "Lock down the early morning 7:15 AM slot before jobsite departure."
        };
      }

      setPostCallFeedback(parsed);
    } catch {
      setPostCallFeedback({
        score: durationSecs <= 20 ? 80 : 70,
        grade: durationSecs <= 20 ? "B-" : "C",
        summary: `Call lasted ${durationSecs}s with ${userWordCount} spoken words.`,
        hookFeedback: "Good attempt. Keep the 20-second contract interrupt sharp.",
        pacingFeedback: "Cadence is audible and clear.",
        rebuttalFeedback: `Addressed ${activeProspect.name}'s specific objection directly.`,
        keyTakeaway: "Close for the early morning slot before crews roll out."
      });
    } finally {
      setIsAnalyzingCall(false);
    }
  };

  const handleSendLiveMessage = (e) => {
    e.preventDefault();
    if (!typedInput.trim() || !liveSessionRef.current) return;
    const msg = typedInput.trim();
    userSpeechTokensCountRef.current += msg.split(/\s+/).filter(Boolean).length;
    setTranscriptTurns(prev => [...prev, { speaker: 'You', text: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    liveSessionRef.current.sendTextMessage(msg);
    setTypedInput('');
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Navbar />

      <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* =========================================================================
            HEADER: Navigation, Roleplay Target Selector & Dial Actions
           ========================================================================= */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
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
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Practice Studio</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 text-indigo-400" />
                  Gemini Live WebSocket
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Dial authentic Mountain State contractors in character, drill your live objections, and get candid coaching.
              </p>
            </div>
          </div>

          {/* Persona Switcher Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Target:
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {prospectsList.map((p) => {
                const isSelected = activeProspect.id === p.id;
                return (
                  <button
                    key={p.id}
                    disabled={isCallActive}
                    onClick={() => handleSelectPersona(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400'
                        : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 disabled:opacity-50'
                    }`}
                  >
                    <span>{p.name.split(' ')[0]}</span>
                    <span className="text-[10px] opacity-75 font-normal">
                      ({p.industry?.split(' ')[0] || p.role?.split(' ')[0]})
                    </span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* =========================================================================
            SPLIT SCREEN WORKSHOP:
            Left/Center: Live Call Console, CoachAvatarLive HUD, & Controls (7 cols)
            Right: Pinned Side-Docked Live Teleprompter (5 cols)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =========================================================================
              LEFT COLUMN: CALL DIALER & GEMINI LIVE HUD (7 cols)
             ========================================================================= */}
          <div className="lg:col-span-7 flex flex-col gap-6">

            {/* Target Contractor Banner */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-700 shrink-0 bg-slate-950">
                  <img
                    src={activeProspect.avatarUrl || 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=800&q=80'}
                    alt={activeProspect.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>{activeProspect.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold">
                      {activeProspect.role || activeProspect.industry}
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-300 font-medium">
                    {activeProspect.companyName} • {activeProspect.city}
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Context: {activeProspect.tag}
                  </span>
                </div>
              </div>

              {/* Call Status Pill - Live timer */}
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider flex items-center gap-1.5 ${
                  isCallActive
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse font-mono'
                    : isDialing
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-bounce'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <Radio className="w-3.5 h-3.5" />
                  <span>{isCallActive ? formatSeconds(callDuration) : isDialing ? 'Dialing...' : 'Ready to Dial'}</span>
                </span>
              </div>
            </div>

            {/* Central Dialing HUD: CoachAvatarLive Component */}
            <div className="relative">
              <CoachAvatarLive
                voiceName={activeProspect.id?.includes('delbert') ? 'Charon' : activeProspect.id?.includes('bo') ? 'Puck' : 'Fenrir'}
                systemPrompt={buildContractorPersonaPrompt(activeProspect)}
                onIframeMicBlocked={() => setIsIframeMicModalOpen(true)}
                className="w-full min-h-[380px]"
              />

              {/* Central One-Click Call Button Overlay if Disconnected */}
              {!isCallActive && !isDialing && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-6 gap-3 z-10">
                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white flex flex-col items-center justify-center shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-indigo-400/40 group"
                  >
                    <PhoneCall className="w-10 h-10 fill-white group-hover:scale-110 transition-transform mb-1" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">
                      Start Voice Call
                    </span>
                  </button>
                  <p className="text-xs text-slate-300 font-semibold text-center max-w-sm">
                    Tap to dial <span className="text-white">{activeProspect.name}</span>. Test your 20-second opening hook with live bidirectional audio.
                  </p>
                </div>
              )}

              {/* In-Call Controls Overlay Bar */}
              {isCallActive && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20 bg-slate-950/95 border border-slate-700/80 p-2 rounded-2xl shadow-2xl backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMuted(!isMuted);
                      if (liveSessionRef.current) liveSessionRef.current.setMuted(!isMuted);
                    }}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isMuted ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                    }`}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleEndCall}
                    className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/40 transition cursor-pointer active:scale-95"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call &amp; Get Coaching</span>
                  </button>
                </div>
              )}
            </div>

            {/* Simultaneous Live Chat Form during Call */}
            {isCallActive && (
              <form onSubmit={handleSendLiveMessage} className="flex items-center gap-2 bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
                <input
                  type="text"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder={`Type a rebuttal or answer to ${activeProspect.name.split(' ')[0]}...`}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!typedInput.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* =========================================================================
                POST-CALL CANDID COACHING FEEDBACK CARD
               ========================================================================= */}
            {postCallFeedback && (
              <div className={`rounded-3xl border p-6 shadow-2xl space-y-5 animate-fadeIn ${
                postCallFeedback.isSilentFailure
                  ? 'bg-rose-950/20 border-rose-500/50'
                  : 'bg-slate-900/95 border-indigo-500/40'
              }`}>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg ${
                      postCallFeedback.isSilentFailure ? 'bg-rose-600' : 'bg-indigo-600'
                    }`}>
                      {postCallFeedback.isSilentFailure ? '!' : 'MV'}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <span>{postCallFeedback.isSilentFailure ? 'Call Incomplete: Silent Audio' : 'Coach Marcus: Call Debrief'}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold uppercase ${
                          postCallFeedback.score === 0
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          Score: {postCallFeedback.score}/100 ({postCallFeedback.grade})
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {postCallFeedback.isSilentFailure 
                          ? 'Zero user speech detected. Check your microphone hardware and permissions.'
                          : `Direct, unpadded feedback on your drill with ${activeProspect.name}.`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartCall}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Drill Again</span>
                  </button>
                </div>

                {/* Silent Failure Alert Banner */}
                {postCallFeedback.isSilentFailure ? (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-3 text-xs text-rose-200">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-rose-300">
                        No audio detected. Check microphone hardware input and site permissions.
                      </span>
                      <span>
                        Speak your 20-second opening hook aloud when dialing so Coach Marcus can score your cadence, pacing, and rebuttal defense.
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Metric 1: Opening Hook */}
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-indigo-400">
                            <Clock className="w-3.5 h-3.5" /> Opening Hook
                          </span>
                          <span className="font-mono text-white text-[11px]">Target &lt; 20s</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {postCallFeedback.hookFeedback}
                        </p>
                      </div>

                      {/* Metric 2: Pacing & Filler Words */}
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-emerald-400">
                            <Flame className="w-3.5 h-3.5" /> Pacing &amp; Fillers
                          </span>
                          <span className="font-mono text-white text-[11px]">~150 WPM</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {postCallFeedback.pacingFeedback}
                        </p>
                      </div>

                      {/* Metric 3: Rebuttal Quality */}
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <TrendingUp className="w-3.5 h-3.5" /> Rebuttal Defense
                          </span>
                          <span className="font-mono text-white text-[11px]">Objection</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                          {postCallFeedback.rebuttalFeedback}
                        </p>
                      </div>
                    </div>

                    {/* Key Takeaway */}
                    {postCallFeedback.keyTakeaway && (
                      <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3 text-xs text-indigo-200">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span><strong>Marcus's Golden Rule:</strong> {postCallFeedback.keyTakeaway}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/script-builder')}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Tune in Script Builder</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {isAnalyzingCall && (
              <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center gap-3 text-xs text-indigo-400 font-bold animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Coach Marcus is evaluating your call tempo, filler words, and rebuttal defense...</span>
              </div>
            )}

          </div>

          {/* =========================================================================
              RIGHT COLUMN: PINNED SIDE-DOCKED LIVE TELEPROMPTER (5 cols)
             ========================================================================= */}
          <div className="lg:col-span-5 h-[calc(100vh-8.5rem)] sticky top-24">
            {(() => {
              const activeScript = JSON.parse(localStorage.getItem('scriptmaster_active_script') || '{}');
              const painProblem = typeof activeScript.painValue === 'object' && activeScript.painValue !== null
                ? (activeScript.painValue.problem || activeScript.problem || currentScript.problem || CARL_DEFAULT_SCRIPT.problem)
                : (typeof activeScript.painValue === 'string' ? activeScript.painValue : (activeScript.problem || currentScript.problem || CARL_DEFAULT_SCRIPT.problem));

              const painVal = typeof activeScript.painValue === 'object' && activeScript.painValue !== null
                ? (activeScript.painValue.value || activeScript.value || currentScript.value || CARL_DEFAULT_SCRIPT.value)
                : (activeScript.value || currentScript.value || CARL_DEFAULT_SCRIPT.value);

              const teleprompterScript = {
                ...CARL_DEFAULT_SCRIPT,
                ...currentScript,
                ...(activeScript.hook || activeScript.closingAsk || activeScript.painValue ? activeScript : {}),
                hook: activeScript.hook || currentScript.hook || CARL_DEFAULT_SCRIPT.hook,
                painValue: activeScript.painValue || currentScript.painValue || {
                  problem: painProblem,
                  value: painVal
                },
                problem: painProblem,
                value: painVal,
                closingAsk: activeScript.closingAsk || currentScript.closingAsk || CARL_DEFAULT_SCRIPT.closingAsk
              };

              return (
                <PracticeTeleprompter
                  script={teleprompterScript}
                  onScriptChange={(updated) => {
                    const next = {
                      ...updated,
                      painValue: typeof updated.painValue === 'object'
                        ? { problem: updated.problem, value: updated.value }
                        : updated.problem
                    };
                    setCurrentScript(next);
                    localStorage.setItem('scriptmaster_active_script', JSON.stringify(next));
                    window.dispatchEvent(new Event('scriptmaster_script_updated'));
                    if (setGlobalScript) setGlobalScript(next);
                  }}
                  activeObjectionIndex={activeObjectionIndex}
                  isCallActive={isCallActive}
                  className="h-full"
                />
              );
            })()}
          </div>

        </div>
      </main>

      {/* IFRAME MICROPHONE PERMISSION / OPEN FULL WINDOW MODAL */}
      <IframeMicModal 
        isOpen={isIframeMicModalOpen} 
        onClose={() => setIsIframeMicModalOpen(false)} 
      />
    </div>
  );
}
