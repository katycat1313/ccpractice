import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
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
  Sliders,
  DollarSign,
  Users,
  Target,
  PhoneCall,
  Compass,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  Brain
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey, askGeminiCoach, getGeminiTTSAudio } from '../lib/geminiClient';
import { GeminiLiveSession } from '../lib/geminiLiveClient';
import { playPickupClick, playHangupClick } from '../lib/soundUtils';
import IframeMicModal from './IframeMicModal';

const STORAGE_KEY_DNA = 'scriptmaster_discovery_lab_dna';

export const TRADE_PERSONAS = [
  { id: 'gc', label: 'General Contractor', name: "Carl 'Mac' McIntyre", defaultTrade: 'Residential & Commercial Remodeling • Route 60, WV' },
  { id: 'hvac', label: 'HVAC & Mechanical', name: "Travis 'Bo' Pauley", defaultTrade: 'HVAC & Mechanical • Teays Valley, WV' },
  { id: 'excavation', label: 'Excavation & Site Prep', name: "Delbert Workman", defaultTrade: 'Excavation & Heavy Earthmoving • Elkview, WV' },
  { id: 'roofing', label: 'Commercial Roofing', name: "Dave Miller", defaultTrade: 'Commercial Metal & Shingle Roofing • Kanawha Valley, WV' }
];

export const METHODOLOGY_STEPS = [
  {
    step: 1,
    id: 'step-discover',
    title: 'Step 1: Discover & Qualify',
    subtitle: 'Talk Ratio: 43% You / 57% Them',
    badge: 'Diagnostic Questioning',
    color: 'indigo',
    science: 'Why open-ended questions like "How\'s business?" trigger instant rejection ("We\'re busy / slammed"). Top performers listen 57% of the time. Blue-collar contractors never open up to corporate discovery checklists; they open up to diagnostic questions that demonstrate you already know the exact failure points of their trade.',
    fatalTrap: 'Asking "What\'s your biggest pain point?" or rapid-fire interrogations that feel like a tax audit.',
    verbatimPhrases: [
      '“When your guys grab extra line sets or brass fittings at the supply house, how much of that actually makes it onto the final customer invoice versus getting lost under the truck floorboards?”',
      '“How many Sunday evenings a month are spent rewriting quotes from notes scribbled on 2x4 lumber scraps because change orders weren’t signed on-site?”',
      '“When a customer asks for a scope variation in the middle of a foundation dig, what is your current system for locking the price before the equipment leaves the site?”'
    ],
    exercisePlaceholder: 'Draft a diagnostic question to uncover unbilled change orders or lost receipts...',
    defaultExercisePrompt: 'Draft your diagnostic discovery question for Carl McIntyre.'
  },
  {
    step: 2,
    id: 'step-solution',
    title: 'Step 2: Present Your Solution',
    subtitle: 'Outcomes Close; Features Don’t',
    badge: 'Outcome Anchoring',
    color: 'emerald',
    science: 'Modern sales research reveals win rates increase by +10% when concrete business ROI and pricing structure are anchored early rather than hidden until the end. Trade owners evaluate software strictly by retrieved weekend hours and protected margins, not cloud tech specs.',
    fatalTrap: 'Feature dumping: explaining cloud sync, offline SQLite databases, cross-platform mobile apps. Contractors tune out in 8 seconds.',
    verbatimPhrases: [
      '“Instead of spending 10 hours every Sunday handwriting kitchen & bath quotes and eating $1,200 on unbudgeted plumbing runs, your foreman locks the change order on-site before the truck leaves. You get your weekends back and stop leaking margin.”',
      '“We set you up for $1,500 and $199/mo. If this catches just one unbilled $2,000 foundation variation in the first 30 days, it pays for your entire year.”',
      '“Two taps on the phone: your tech snaps the Ferguson supply slip, it attaches directly to customer billing, and you never pay for copper fittings out of pocket again.”'
    ],
    exercisePlaceholder: 'Draft an outcome-anchored solution pitch highlighting margin saved and pricing...',
    defaultExercisePrompt: 'Draft an outcome-anchored solution pitch for Handled.'
  },
  {
    step: 3,
    id: 'step-objections',
    title: 'Step 3: Handle Objections',
    subtitle: 'The 4 Modern Buckets & Requests for Certainty',
    badge: 'Frame Control Pivots',
    color: 'amber',
    science: 'Objections are requests for certainty, not rejections. When a contractor pushes back, they are testing whether you believe your own numbers and understand jobsite physical reality.',
    fatalTrap: 'Arguing, getting defensive, or immediately offering discounts when they push back.',
    buckets: [
      {
        id: 'time',
        name: '1. Time / Inertia',
        objection: '“I’m too busy running jobs to learn some new software right now.”',
        counter: '“That’s exactly why we’re talking, Carl. If you’re slammed working 14-hour days and still losing Sunday nights to paper quotes, taking 45 minutes on onboarding gives you back 10 hours a week for the rest of the year. When’s your slowest morning this week?”'
      },
      {
        id: 'crew',
        name: '2. Crew Skepticism',
        objection: '“My guys in the field aren’t tech guys. They won’t tap screens with dirty work gloves.”',
        counter: '“I’d never ask a rough framer or HVAC tech to type on a screen with dirty gloves. It’s 2 taps: snap a photo of the supply ticket or tap a single ‘Approved’ button. If they can text a photo of a deer or use Facebook, they can use Handled in 10 seconds.”'
      },
      {
        id: 'cash',
        name: '3. Financial / Cash Flow',
        objection: '“Sounds good, but $1,500 setup is too expensive right now.”',
        counter: '“Compared to what, Carl? Last month you told me an unbilled plumbing change order cost you $1,200 out of pocket. That’s one job. At $1,500 setup, catching two missed change orders puts you in pure profit. Why don’t we do half down ($750) today to lock your onboarding spot?”'
      },
      {
        id: 'legacy',
        name: '4. Authority / Legacy',
        objection: '“I’ve been quoting on a yellow legal pad for 25 years. We’re doing fine.”',
        counter: '“Yellow pads worked great when lumber was cheap and homeowners didn’t dispute bills. But a yellow pad won’t stand up in court when a client claims you agreed to finish their basement for free. This turns your notes into a signed PDF change order before your crew packs up.”'
      }
    ],
    exercisePlaceholder: 'Select an objection bucket and deliver your calm frame-control pivot counter...'
  },
  {
    step: 4,
    id: 'step-committee',
    title: 'Step 4: Map Buying Committee & Lock Close',
    subtitle: 'Deals with 2+ Stakeholders Close at 2x Rate',
    badge: 'Multi-Threading Close',
    color: 'purple',
    science: 'Deals with 2 or more stakeholders have double the closed-won rate. In trades, the field owner will say yes on the truck, but the spouse or office manager ("Connie") controls QuickBooks, payroll, and check-writing. Never let the owner play telephone.',
    fatalTrap: '“Great! I’ll send an email with the link for you to look over and talk to your team.” (A 95% deal killer).',
    verbatimPhrases: [
      '“Before we set up the onboarding audit, usually whoever handles your QuickBooks and end-of-month reconciliation needs to confirm this won’t disrupt payroll. Does Connie handle your back office, or do you sign off on the software tools yourself?”',
      '“Let’s do this: I’ll jump on a quick 12-minute screen share with you and whoever handles the books. That way neither of you has to play telephone, and if Connie says it slows her down, we kill it immediately. Fair?”',
      '“Let’s put down the $750 deposit today to reserve your crew onboarding slot, and I’ll loop in your office manager so we walk through the QuickBooks sync together before next Monday.”'
    ],
    exercisePlaceholder: 'Draft your multi-threading ask to bring Connie into the loop without bruising Carl’s ego...'
  }
];

export default function DiscoveryClosingLab() {
  // Offer DNA Configuration
  const [offerDna, setOfferDna] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DNA);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return {
      appName: 'Handled',
      valueProp: 'Contractor operations, job costing & change order capture',
      pricingStructure: 'Upfront Setup Fee $1,500 + $199/mo SaaS',
      targetTrade: 'gc',
      synthesizedPlaybook: null
    };
  });

  const [activeStepTab, setActiveStepTab] = useState(1);
  const [selectedObjectionBucket, setSelectedObjectionBucket] = useState('time');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesizeToast, setSynthesizeToast] = useState(false);

  // Exercise submission & feedback state
  const [exerciseInput, setExerciseInput] = useState('');
  const [isEvaluatingExercise, setIsEvaluatingExercise] = useState(false);
  const [exerciseFeedback, setExerciseFeedback] = useState(null);

  // Interactive Sparring Modal / Studio
  const [isSparringActive, setIsSparringActive] = useState(false);
  const [sparringTrade, setSparringTrade] = useState('gc');
  const [sparringMessages, setSparringMessages] = useState([]);
  const [sparringInput, setSparringInput] = useState('');
  const [isSparringListening, setIsSparringListening] = useState(false);
  const [isSparringThinking, setIsSparringThinking] = useState(false);
  const [isLiveAudioConnected, setIsLiveAudioConnected] = useState(false);
  const [liveAudioStatus, setLiveAudioStatus] = useState('disconnected');
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);

  const sparringBottomRef = useRef(null);
  const liveSessionRef = useRef(null);
  const recognitionRef = useRef(null);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Persist Offer DNA
  const updateOfferDna = (updates) => {
    const updated = { ...offerDna, ...updates };
    setOfferDna(updated);
    try {
      localStorage.setItem(STORAGE_KEY_DNA, JSON.stringify(updated));
    } catch {
      /* ignore */
    }
  };

  // Scroll sparring chat
  useEffect(() => {
    if (isSparringActive && sparringBottomRef.current) {
      sparringBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sparringMessages, isSparringThinking, isSparringActive]);

  // Clean up live session on unmount
  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        try { liveSessionRef.current.disconnect(); } catch { /* ignore */ }
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  const activePersona = TRADE_PERSONAS.find(p => p.id === offerDna.targetTrade) || TRADE_PERSONAS[0];
  const activeStep = METHODOLOGY_STEPS.find(s => s.step === activeStepTab) || METHODOLOGY_STEPS[0];

  // Synthesize Verbatim Discovery & Closing Playbook with Gemini 3.8 Flash
  const handleSynthesizePlaybook = async () => {
    setIsSynthesizing(true);
    const clientKey = getGeminiApiKey();

    const prompt = `You are Coach Marcus Vance, world-class B2B Sales Methodologist specializing in modern sales science for blue-collar contractors.
GIVEN APP/OFFER DNA:
- App/Service Name: "${offerDna.appName}"
- Core Value Prop: "${offerDna.valueProp}"
- Pricing Structure: "${offerDna.pricingStructure}"
- Target Contractor: "${activePersona.name} (${activePersona.label} - ${activePersona.defaultTrade})"

Generate a verbatim, battle-tested 4-step Discovery & Closing Playbook specifically tailored to this exact application and trade persona.

OUTPUT STRICTLY VALID JSON IN THIS FORMAT:
{
  "step1Discovery": {
    "diagnosticQuestions": [
      "question 1 tailored to ${activePersona.label}",
      "question 2 tailored to ${activePersona.label}",
      "question 3 tailored to ${activePersona.label}"
    ],
    "talkRatioStrategy": "Exact guidance on staying at 43% talk / 57% listen for ${activePersona.name}"
  },
  "step2Solution": {
    "outcomePitch": "Verbatim outcome-anchored 25-second pitch connecting ${offerDna.appName} directly to ${offerDna.pricingStructure} without feature-dumping",
    "roiAnchor": "Exact calculation showing how one caught change order pays for the setup fee"
  },
  "step3Objections": {
    "timeCounter": "Exact counter for 'Too busy running jobs'",
    "crewCounter": "Exact counter for 'My crew won't use apps'",
    "cashCounter": "Exact counter for '${offerDna.pricingStructure} is too expensive'",
    "legacyCounter": "Exact counter for 'I use yellow pads/memory'"
  },
  "step4Committee": {
    "multiThreadAsk": "Verbatim ask to bring Connie / bookkeeper into the loop without offending ${activePersona.name}",
    "closingContract": "12-minute screen-share confirmation with deposit lock"
  }
}`;

    try {
      let result = null;
      if (clientKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: clientKey });
          const res = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              temperature: 0.4,
              responseMimeType: 'application/json'
            }
          });
          if (res?.text) {
            result = JSON.parse(res.text);
          }
        } catch (apiErr) {
          console.warn('Direct gemini-3.8-flash synthesis fallback:', apiErr);
        }
      }

      if (!result) {
        const backendRes = await askGeminiCoach({
          systemPrompt: "You are Marcus Vance. Return strictly valid JSON containing the customized sales playbook.",
          userMessage: prompt,
          stage: 'script_building'
        });
        if (backendRes?.text) {
          const match = backendRes.text.match(/\{[\s\S]*\}/);
          if (match) result = JSON.parse(match[0]);
        }
      }

      if (!result) {
        // High-fidelity fallback tailored to offer
        result = {
          step1Discovery: {
            diagnosticQuestions: [
              `When your crew orders extra materials or line items on job runs, how much gets captured on final invoicing vs eaten on floorboard receipts?`,
              `How many hours each weekend are spent deciphering handwritten quotes and disputed scope additions?`,
              `What is your protocol when a client asks to change specifications while your crew is already on site?`
            ],
            talkRatioStrategy: `Let ${activePersona.name} vent about Sunday quoting and lost supply slips. Hold your tongue until he pauses for 3 seconds.`
          },
          step2Solution: {
            outcomePitch: `Instead of burning 10 hours every Sunday handwriting estimates and eating $1,200 on unbilled runs, ${offerDna.appName} locks change orders on-site before the truck leaves. Setup is ${offerDna.pricingStructure}, and catching one disputed run pays for the entire year.`,
            roiAnchor: `One $1,500 change order captured on-site completely pays for onboarding.`
          },
          step3Objections: {
            timeCounter: `That's why we do this, ${activePersona.name.split(' ')[0]}. If you're working 14 hours a day and still losing Sundays, 45 minutes on onboarding buys you back 10 hours every week.`,
            crewCounter: `Your crew doesn't type. They tap twice to snap a photo of the slip, and it attaches straight to billing. If they can text a photo, they can use ${offerDna.appName}.`,
            cashCounter: `At ${offerDna.pricingStructure}, catching just two unbilled runs puts you in pure profit. Let's do half down today to lock your onboarding slot.`,
            legacyCounter: `Yellow pads are great until a homeowner disputes an invoice. This turns your pad notes into a signed PDF change order in 60 seconds.`
          },
          step4Committee: {
            multiThreadAsk: `Before we set up the onboarding audit, usually whoever handles your QuickBooks and end-of-month reconciliation needs to confirm this won't disrupt payroll. Does Connie handle your back office, or do you sign off on software tools yourself?`,
            closingContract: `Let's do a 12-minute walkthrough with you and your office manager so neither of you plays telephone.`
          }
        };
      }

      updateOfferDna({ synthesizedPlaybook: result });
      setSynthesizeToast(true);
      setTimeout(() => setSynthesizeToast(false), 4000);
      setIsSynthesizing(false);
    } catch (err) {
      console.warn('Synthesis error:', err);
      setIsSynthesizing(false);
    }
  };

  // Evaluate Step Exercise with Gemini 3.8 Flash
  const handleEvaluateExercise = async (e) => {
    if (e) e.preventDefault();
    if (!exerciseInput.trim() || isEvaluatingExercise) return;

    setIsEvaluatingExercise(true);
    const clientKey = getGeminiApiKey();

    const prompt = `You are Coach Marcus Vance, evaluating a sales rep's phrasing for ${activeStep.title}.
RELEVANT STAGE: ${activeStep.title} (${activeStep.subtitle})
TARGET TRADE: ${activePersona.name} (${activePersona.label})
OFFER: ${offerDna.appName} - ${offerDna.valueProp} (${offerDna.pricingStructure})

USER'S DRAFT PHRASING:
"${exerciseInput.trim()}"

EVALUATION CRITERIA:
1. Score from 1 to 5 (5 = Master peer-to-peer phrasing, 1 = Fluffy corporate pitch slap / feature dump).
2. Diagnostic vs Feature-Dump Check: Flag if they slipped into features instead of outcomes.
3. Single concrete correction (1-2 sentences, direct, blunt).
4. Improved Master Verbatim version rewriting their phrase for maximum impact.

OUTPUT STRICTLY AS JSON:
{
  "score": 4,
  "scoreLabel": "Sharp Diagnostic",
  "featureDumpFlagged": false,
  "critique": "Strong focus on the Sunday legal pad pain, but tighten the finish so it ends on a downward inflection.",
  "correction": "Drop 'I was wondering if' and demand the diagnostic directly.",
  "masterRewire": "When your guys grab extra fittings at the supply house, how much of that actually makes it onto the invoice versus getting lost under truck floorboards?"
}`;

    try {
      let evaluation = null;
      if (clientKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: clientKey });
          const res = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              temperature: 0.3,
              responseMimeType: 'application/json'
            }
          });
          if (res?.text) {
            evaluation = JSON.parse(res.text);
          }
        } catch (apiErr) {
          console.warn('Exercise evaluation fallback:', apiErr);
        }
      }

      if (!evaluation) {
        const backendRes = await askGeminiCoach({
          systemPrompt: "You are Marcus Vance evaluating sales phrasing. Return strictly JSON.",
          userMessage: prompt,
          stage: 'workshop_micro_drill'
        });
        if (backendRes?.text) {
          const match = backendRes.text.match(/\{[\s\S]*\}/);
          if (match) evaluation = JSON.parse(match[0]);
        }
      }

      if (!evaluation) {
        const hasNumbers = /\$|\d+|hours|sunday|receipt|change order/i.test(exerciseInput);
        evaluation = {
          score: hasNumbers ? 4 : 3,
          scoreLabel: hasNumbers ? "Sharp Diagnostic" : "Needs Specificity",
          featureDumpFlagged: /cloud|app|software|platform|sync|database/i.test(exerciseInput),
          critique: "Solid attempt. Focus on concrete physical objects (supply slips, scrap lumber, truck floorboards) rather than abstract concepts.",
          correction: "Anchor on the exact dollar leakage ($1,200 plumbing run) and end with a closed diagnostic.",
          masterRewire: "When your techs finish a run, how many unbilled change orders get swallowed because the client didn't sign on-site?"
        };
      }

      setExerciseFeedback(evaluation);
      setIsEvaluatingExercise(false);
    } catch (err) {
      console.warn('Exercise evaluation error:', err);
      setIsEvaluatingExercise(false);
    }
  };

  // Launch Sparring Drill
  const handleStartSparring = (personaId = offerDna.targetTrade) => {
    const selected = TRADE_PERSONAS.find(p => p.id === personaId) || TRADE_PERSONAS[0];
    setSparringTrade(selected.id);
    setIsSparringActive(true);
    playPickupClick();

    const initialMsg = {
      id: `spar-${Date.now()}`,
      sender: 'prospect',
      text: `“Yeah, ${selected.name} here. Make it fast—I've got about 60 seconds before this concrete truck shows up. Who is this and what do you want?”`,
      roleplayPersona: selected.name,
      metrics: null
    };

    setSparringMessages([initialMsg]);
  };

  // Close Sparring Drill
  const handleCloseSparring = () => {
    if (liveSessionRef.current) {
      try { liveSessionRef.current.disconnect(); } catch { /* ignore */ }
      liveSessionRef.current = null;
    }
    playHangupClick();
    setIsLiveAudioConnected(false);
    setLiveAudioStatus('disconnected');
    setIsSparringActive(false);
  };

  // Toggle Live Voice Call with Marcus / Prospect (Gemini 3.8 Live)
  const handleToggleLiveAudioSparring = async () => {
    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }

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
    const selected = TRADE_PERSONAS.find(p => p.id === sparringTrade) || TRADE_PERSONAS[0];

    try {
      const session = new GeminiLiveSession({
        voiceName: 'Fenrir',
        systemInstruction: `You are roleplaying as ${selected.name} (${selected.defaultTrade}) and simultaneously providing instant sales coaching as Marcus Vance.
THE SALES REP'S PRODUCT: ${offerDna.appName} (${offerDna.valueProp}, ${offerDna.pricingStructure}).
YOUR ROLEPLAY BEHAVIOR:
- You are a busy, skeptical, blunt contractor on a noisy jobsite.
- Deliver rapid pushback: "I do quotes on Sunday legal pads", "My crew won't use apps", "Send an email to Connie in the office".
- Test whether the rep asks diagnostic questions (talk ratio: 43% rep / 57% you) or dumps software features.
- If the rep feature-dumps, interrupt them: "Sounds like Silicon Valley tech BS to me. What is this gonna cost?"
- Keep responses short, punchy, and contractor-authentic (1-2 sentences).`,
        onStateChange: (state) => setLiveAudioStatus(state),
        onTurnComplete: (userText, modelText) => {
          if (modelText) {
            setSparringMessages(prev => [
              ...(userText ? [{ id: `user-${Date.now()}`, sender: 'user', text: userText }] : []),
              { id: `prospect-${Date.now()}`, sender: 'prospect', text: modelText, roleplayPersona: selected.name }
            ]);
          }
        },
        onIframeMicBlocked: () => {
          setIsIframeMicModalOpen(true);
          setIsLiveAudioConnected(false);
          setLiveAudioStatus('disconnected');
        },
        onError: (err) => {
          console.warn('Gemini Live sparring error:', err);
          setIsLiveAudioConnected(false);
          setLiveAudioStatus('error');
        }
      });

      await session.start();
      liveSessionRef.current = session;
      setIsLiveAudioConnected(true);
    } catch (err) {
      console.warn('Failed to start Live Audio session:', err);
      setIsLiveAudioConnected(false);
      setLiveAudioStatus('error');
    }
  };

  // Submit Text/Mic message in Sparring Drill
  const handleSendSparringMessage = async (e) => {
    if (e) e.preventDefault();
    const repText = sparringInput.trim();
    if (!repText || isSparringThinking) return;

    if (isSparringListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setIsSparringListening(false);
    }

    setSparringInput('');
    setIsSparringThinking(true);

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: repText
    };

    setSparringMessages(prev => [...prev, userMsg]);
    const selected = TRADE_PERSONAS.find(p => p.id === sparringTrade) || TRADE_PERSONAS[0];
    const clientKey = getGeminiApiKey();

    const prompt = `You are simulating a live cold call roleplay with a sales rep.
YOU ARE: ${selected.name}, ${selected.defaultTrade}.
THE REP'S OFFER: ${offerDna.appName} - ${offerDna.valueProp} (${offerDna.pricingStructure}).

CONVERSATION HISTORY:
${sparringMessages.map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}
USER JUST SAID: "${repText}"

YOUR GOAL:
1. Provide the contractor's natural spoken pushback or answer (1-2 sentences max, blunt, skeptical).
2. Calculate sales metrics:
   - repTalkRatioPercent: estimate (e.g. 40-70%)
   - featureDumpDetected: boolean (true if rep explained software features instead of asking diagnostic questions or naming concrete jobsite outcomes)
   - score: 1 to 5
   - marcusCritique: 1 sentence from Coach Marcus Vance evaluating whether they diagnosed, mapped the buying committee, or got derailed.

OUTPUT STRICTLY AS JSON:
{
  "contractorReply": "Look, I've got Ferguson parts on account and my wife Connie handles the billing. Why should I clutter her desk with another login?",
  "metrics": {
    "score": 4,
    "featureDumpDetected": false,
    "talkRatioEst": "45% Rep / 55% Contractor",
    "marcusVerdict": "Solid diagnostic focus on Ferguson supply slips, but pivot directly to Connie before he hangs up."
  }
}`;

    try {
      let responseData = null;
      if (clientKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: clientKey });
          const res = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              temperature: 0.5,
              responseMimeType: 'application/json'
            }
          });
          if (res?.text) responseData = JSON.parse(res.text);
        } catch (apiErr) {
          console.warn('Direct gemini-3.8-flash sparring fallback:', apiErr);
        }
      }

      if (!responseData) {
        const backendRes = await askGeminiCoach({
          systemPrompt: "You are roleplaying a contractor and coaching a sales rep. Return strictly JSON.",
          userMessage: prompt,
          stage: 'cold_call_simulation'
        });
        if (backendRes?.text) {
          const match = backendRes.text.match(/\{[\s\S]*\}/);
          if (match) responseData = JSON.parse(match[0]);
        }
      }

      if (!responseData) {
        const isDumping = /cloud|platform|mobile|database|sync|portal/i.test(repText);
        responseData = {
          contractorReply: `Look, I've been doing quotes on yellow pads for 25 years. My wife Connie does all the invoicing on QuickBooks on Fridays. What's this gonna cost me?`,
          metrics: {
            score: isDumping ? 2 : 4,
            featureDumpDetected: isDumping,
            talkRatioEst: "50% Rep / 50% Contractor",
            marcusVerdict: isDumping 
              ? "You started feature dumping technical jargon. Anchor on Connie and the $1,200 Sunday quotes." 
              : "Good diagnostic frame. Now multi-thread directly to Connie and anchor the $1,500 setup."
          }
        };
      }

      const prospectMsg = {
        id: `prospect-${Date.now()}`,
        sender: 'prospect',
        text: `“${responseData.contractorReply}”`,
        roleplayPersona: selected.name,
        metrics: responseData.metrics
      };

      setSparringMessages(prev => [...prev, prospectMsg]);
      setIsSparringThinking(false);

    } catch (err) {
      console.warn('Sparring dialogue error:', err);
      setIsSparringThinking(false);
    }
  };

  // Mic Toggle for Sparring
  const toggleSparringVoiceInput = () => {
    if (isInIframe) {
      setIsIframeMicModalOpen(true);
      return;
    }

    if (isSparringListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
      setIsSparringListening(false);
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
      rec.onstart = () => setIsSparringListening(true);
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setSparringInput(prev => prev ? `${prev} ${transcript}` : transcript);
        }
      };
      rec.onerror = () => setIsSparringListening(false);
      rec.onend = () => setIsSparringListening(false);
      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsSparringListening(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Toast Alert on Playbook Synthesis */}
      {synthesizeToast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 border border-emerald-400 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>Verbatim Playbook Synthesized &amp; Saved to DNA!</span>
        </div>
      )}

      {/* =========================================================================
          HERO BANNER: MODERN SALES SCIENCE & METHODOLOGY
         ========================================================================= */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900 to-[#0A0D18] border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Modern Conversational Sales Science
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Sales Discovery &amp; Closing Methodology Lab
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            What to say <strong className="text-white">after earning permission to talk</strong>. Master the scientific talk ratio (43:57), outcome anchoring, the 4 modern objection buckets, and how to map the buying committee ("Connie") to double your close rate.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <Brain className="w-4 h-4 text-indigo-400" />
              Diagnostic Questioning (43:57 Ratio)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Outcome Anchoring vs Feature Dumps
            </span>
            <span className="flex items-center gap-1.5 text-purple-300">
              <Users className="w-4 h-4 text-purple-400" />
              2x Close Multi-Threading
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: APP & OFFER DNA CONFIGURATION CARD
         ========================================================================= */}
      <div className="bg-slate-900/90 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              App &amp; Offer DNA Configuration
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Personalize the diagnostic scripts for your exact software &amp; pricing
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Field 1: App / Service Name & Value Prop */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              App Name &amp; Core Value Prop
            </label>
            <input
              type="text"
              value={offerDna.appName}
              onChange={(e) => updateOfferDna({ appName: e.target.value })}
              placeholder="e.g. Handled"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={offerDna.valueProp}
              onChange={(e) => updateOfferDna({ valueProp: e.target.value })}
              placeholder="e.g. Contractor operations, job costing & change order capture"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-300 text-[11px] focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Field 2: Pricing Structure */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Pricing Structure
            </label>
            <input
              type="text"
              value={offerDna.pricingStructure}
              onChange={(e) => updateOfferDna({ pricingStructure: e.target.value })}
              placeholder="e.g. Upfront Setup Fee $1,500 + $199/mo SaaS"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 block">
              Anchors ROI: 1 caught change order covers setup fee
            </span>
          </div>

          {/* Field 3: Target Trade Persona */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Target Trade Persona
            </label>
            <select
              value={offerDna.targetTrade}
              onChange={(e) => updateOfferDna({ targetTrade: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {TRADE_PERSONAS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.name})
                </option>
              ))}
            </select>
            <span className="text-[10px] text-indigo-300 block truncate">
              {activePersona.defaultTrade}
            </span>
          </div>

        </div>

        {/* Synthesize CTA Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-400">
            Powered by <strong>gemini-3.8-flash</strong> • Generates verbatim questions, outcome anchors &amp; objection counters.
          </div>

          <button
            type="button"
            onClick={handleSynthesizePlaybook}
            disabled={isSynthesizing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : ''}`} />
            <span>
              {isSynthesizing ? 'Synthesizing Tailored Playbook...' : 'Synthesize Verbatim Discovery & Closing Playbook'}
            </span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: 4-STEP METHODOLOGY INTERACTIVE CURRICULUM
         ========================================================================= */}
      <div className="bg-[#0A0E1A] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-slate-950 border-b border-slate-800">
          {METHODOLOGY_STEPS.map((s) => {
            const isSelected = activeStepTab === s.step;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActiveStepTab(s.step);
                  setExerciseFeedback(null);
                }}
                className={`p-4 sm:p-5 text-left transition flex flex-col gap-1.5 cursor-pointer relative ${
                  isSelected
                    ? 'bg-slate-900 text-white border-b-2 border-indigo-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                    Step 0{s.step}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                    isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {s.badge}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-black leading-tight text-white">
                  {s.title.split(': ')[1] || s.title}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">
                  {s.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Step Content Body */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Step Header & Science Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Col: Psychology & Science (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">
                  Science &amp; Conversational Psychology
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {activeStep.title} — <span className="text-indigo-300 font-bold">{activeStep.subtitle}</span>
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                🧠 {activeStep.science}
              </div>

              {/* Fatal Trap Callout */}
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-xs space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Fatal Trap to Eliminate:
                </span>
                <p className="font-bold text-rose-200 leading-relaxed">
                  {activeStep.fatalTrap}
                </p>
              </div>
            </div>

            {/* Right Col: Live Verbatim Golden Phrases (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verbatim Golden Phrases:
                </span>
                <span className="text-[10px] text-slate-500">
                  Target: {activePersona.label}
                </span>
              </div>

              {activeStep.verbatimPhrases && (
                <div className="space-y-3">
                  {activeStep.verbatimPhrases.map((phrase, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold block uppercase">
                        Golden Line #{idx + 1}
                      </span>
                      <p className="text-slate-200 font-medium italic leading-relaxed">
                        {phrase}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3 Special: 4 Objection Buckets Interactive Cards */}
              {activeStep.step === 3 && activeStep.buckets && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {activeStep.buckets.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedObjectionBucket(b.id)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          selectedObjectionBucket === b.id
                            ? 'bg-amber-950/60 border-amber-500 text-white font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-bold block">{b.name}</span>
                      </button>
                    ))}
                  </div>

                  {(() => {
                    const bucket = activeStep.buckets.find(b => b.id === selectedObjectionBucket) || activeStep.buckets[0];
                    return (
                      <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/40 space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase text-amber-400 block">
                            Contractor Pushback:
                          </span>
                          <p className="text-white font-bold italic mt-0.5">
                            {bucket.objection}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-amber-500/20">
                          <span className="text-[10px] font-extrabold uppercase text-emerald-400 block">
                            Frame-Control Pivot Script:
                          </span>
                          <p className="text-emerald-200 leading-relaxed font-medium mt-0.5">
                            {bucket.counter}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

          </div>

          {/* Dynamic Tailored Synthesized Box (If generated) */}
          {offerDna.synthesizedPlaybook && (
            <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-3 animate-fadeIn text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-indigo-300 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Synthesized Playbook for {offerDna.appName} ({activePersona.label})
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">DNA Active</span>
              </div>

              {activeStep.step === 1 && offerDna.synthesizedPlaybook.step1Discovery && (
                <div className="space-y-2">
                  <p className="text-slate-300 font-medium">
                    🎯 <strong>Talk Ratio Strategy:</strong> {offerDna.synthesizedPlaybook.step1Discovery.talkRatioStrategy}
                  </p>
                  <div className="space-y-1">
                    {offerDna.synthesizedPlaybook.step1Discovery.diagnosticQuestions.map((q, i) => (
                      <p key={i} className="text-indigo-200 italic pl-2 border-l-2 border-indigo-400">
                        "{q}"
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {activeStep.step === 2 && offerDna.synthesizedPlaybook.step2Solution && (
                <div className="space-y-2">
                  <p className="text-slate-300 font-medium">
                    💵 <strong>ROI Anchor:</strong> {offerDna.synthesizedPlaybook.step2Solution.roiAnchor}
                  </p>
                  <p className="text-emerald-200 italic pl-2 border-l-2 border-emerald-400">
                    "{offerDna.synthesizedPlaybook.step2Solution.outcomePitch}"
                  </p>
                </div>
              )}

              {activeStep.step === 3 && offerDna.synthesizedPlaybook.step3Objections && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-amber-400 block">Time Pivot:</span>
                    <p className="text-slate-200 italic mt-0.5">{offerDna.synthesizedPlaybook.step3Objections.timeCounter}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="font-bold text-amber-400 block">Crew Pivot:</span>
                    <p className="text-slate-200 italic mt-0.5">{offerDna.synthesizedPlaybook.step3Objections.crewCounter}</p>
                  </div>
                </div>
              )}

              {activeStep.step === 4 && offerDna.synthesizedPlaybook.step4Committee && (
                <div className="space-y-2">
                  <p className="text-slate-300 font-medium">
                    🤝 <strong>Multi-Threading Phrasing:</strong> "{offerDna.synthesizedPlaybook.step4Committee.multiThreadAsk}"
                  </p>
                  <p className="text-purple-200 italic pl-2 border-l-2 border-purple-400">
                    "{offerDna.synthesizedPlaybook.step4Committee.closingContract}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Interactive Phrasing Exercise: Test Your Phrasing */}
          <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-400" />
                Concrete Exercise: Test Your {activeStep.title.split(': ')[1] || activeStep.title} Phrasing
              </span>
              <span className="text-[10px] text-slate-500">
                Instant grading via gemini-3.8-flash
              </span>
            </div>

            <form onSubmit={handleEvaluateExercise} className="space-y-3">
              <textarea
                rows={2}
                value={exerciseInput}
                onChange={(e) => setExerciseInput(e.target.value)}
                placeholder={activeStep.exercisePlaceholder}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[10px] text-slate-500">
                  Deliver your line to Carl McIntyre or Travis Pauley without telemarketer qualifiers.
                </span>

                <button
                  type="submit"
                  disabled={!exerciseInput.trim() || isEvaluatingExercise}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isEvaluatingExercise ? 'Evaluating Phrasing...' : 'Get Marcus Feedback'}</span>
                </button>
              </div>
            </form>

            {/* Exercise Feedback Card */}
            {exerciseFeedback && (
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3 animate-fadeIn text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                      MV
                    </div>
                    <span className="font-black text-white">Marcus's Phrasing Verdict:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-extrabold uppercase">
                      {exerciseFeedback.scoreLabel} (★ {exerciseFeedback.score}/5)
                    </span>
                  </div>

                  {exerciseFeedback.featureDumpFlagged && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-extrabold">
                      ⚠️ Feature Dump Detected
                    </span>
                  )}
                </div>

                <p className="text-slate-300 leading-relaxed">
                  {exerciseFeedback.critique}
                </p>

                {exerciseFeedback.correction && (
                  <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200">
                    <strong className="text-amber-400 block text-[10px] uppercase">Concrete Correction:</strong>
                    {exerciseFeedback.correction}
                  </div>
                )}

                {exerciseFeedback.masterRewire && (
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-200">
                    <strong className="text-emerald-400 block text-[10px] uppercase">Master Verbatim Rewire:</strong>
                    "{exerciseFeedback.masterRewire}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sparring Launch Action Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800">
            <div>
              <h4 className="text-xs sm:text-sm font-black text-white">
                Ready for Live Jobsite Pressure?
              </h4>
              <p className="text-[11px] text-slate-400">
                Connect to Coach Marcus in a live sparring drill. Talk ratio, feature dumping, and diagnostic questions evaluated in real-time.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleStartSparring(offerDna.targetTrade)}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs shadow-xl shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Practice This Discovery Flow Live</span>
            </button>
          </div>

        </div>

      </div>

      {/* =========================================================================
          INTERACTIVE SPARRING MODAL: VERBATIM CONVERSATIONAL DRILL
         ========================================================================= */}
      {isSparringActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0E1A] w-full max-w-4xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
            
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
                  {sparringTrade.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Live Discovery Sparring: {TRADE_PERSONAS.find(p => p.id === sparringTrade)?.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Testing Diagnostic Questions &amp; Outcome Anchoring for {offerDna.appName}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {/* Gemini Live Voice Toggle */}
                <button
                  type="button"
                  onClick={handleToggleLiveAudioSparring}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                    isLiveAudioConnected
                      ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse'
                      : liveAudioStatus === 'connecting'
                      ? 'bg-amber-600/30 border-amber-500 text-amber-300 animate-pulse'
                      : 'bg-indigo-950/60 hover:bg-indigo-900 border-indigo-500/40 text-indigo-300 hover:text-white'
                  }`}
                  title="Toggle bidirectional live audio with Marcus roleplaying the contractor (gemini-3.8-live)"
                >
                  <Radio className={`w-3.5 h-3.5 ${isLiveAudioConnected ? 'text-white' : 'text-indigo-400'}`} />
                  <span>
                    {isLiveAudioConnected 
                      ? 'Live Voice Active' 
                      : liveAudioStatus === 'connecting'
                      ? 'Connecting Voice...'
                      : 'Gemini-3.8-Live Voice'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseSparring}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Exit Sparring Drill"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sparring Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px] text-xs">
              {sparringMessages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div
                    key={m.id}
                    className={`p-4 rounded-2xl flex flex-col gap-2 ${
                      isUser
                        ? 'bg-indigo-600/20 border border-indigo-500/40 text-slate-100 ml-8'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 mr-8 shadow-xl'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-extrabold">
                      <span className={isUser ? 'text-indigo-400' : 'text-amber-400 flex items-center gap-1.5'}>
                        {!isUser && <div className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] font-black">CP</div>}
                        {isUser ? 'Your Spoken Discovery Line' : m.roleplayPersona}
                      </span>

                      {m.metrics && (
                        <div className="flex items-center gap-2">
                          {m.metrics.talkRatioEst && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-mono">
                              {m.metrics.talkRatioEst}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                            ★ {m.metrics.score}/5
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-medium">
                      {m.text}
                    </div>

                    {/* Live Marcus Verdict inside response */}
                    {m.metrics && m.metrics.marcusVerdict && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs space-y-1 mt-1">
                        <span className="text-[10px] font-extrabold uppercase text-indigo-400 flex items-center gap-1">
                          <Brain className="w-3.5 h-3.5" />
                          Coach Marcus Micro-Critique:
                        </span>
                        <p className="text-indigo-200 leading-relaxed">
                          {m.metrics.marcusVerdict}
                        </p>
                        {m.metrics.featureDumpDetected && (
                          <p className="text-rose-400 text-[11px] font-bold">
                            ⚠️ Warning: You slipped into feature dumping technical details. Pivot to margin &amp; Connie!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {isSparringThinking && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-indigo-400 text-xs font-bold flex items-center gap-2.5 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Contractor is reacting to your diagnostic line and jobsite pressure...</span>
                </div>
              )}

              <div ref={sparringBottomRef} />
            </div>

            {/* Sparring Input Footer */}
            <form onSubmit={handleSendSparringMessage} className="p-4 bg-slate-900 border-t border-slate-800 space-y-2">
              <div className="relative">
                <textarea
                  rows={2}
                  value={sparringInput}
                  onChange={(e) => setSparringInput(e.target.value)}
                  placeholder={isSparringListening ? "Listening with mic... deliver your diagnostic line" : "Deliver your response (e.g. 'Carl, when your techs grab extra fittings at Ferguson, how much gets billed?')..."}
                  disabled={isSparringThinking}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 pr-20 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />

                <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleSparringVoiceInput}
                    className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                      isSparringListening
                        ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-md'
                        : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-indigo-400 hover:text-white'
                    }`}
                    title={isSparringListening ? "Listening with mic... tap to stop" : "Speak via mic"}
                  >
                    {isSparringListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    type="submit"
                    disabled={!sparringInput.trim() || isSparringThinking}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition flex items-center justify-center cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Talk Ratio Target: <strong>43% You / 57% Contractor</strong></span>
                <span>Powered by gemini-3.8-flash &amp; gemini-3.8-live</span>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Iframe Mic Modal */}
      <IframeMicModal
        isOpen={isIframeMicModalOpen}
        onClose={() => setIsIframeMicModalOpen(false)}
      />

    </div>
  );
}

DiscoveryClosingLab.propTypes = {};
