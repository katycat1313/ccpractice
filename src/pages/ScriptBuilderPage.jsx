import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { 
  Save, 
  PhoneCall, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Send, 
  Sparkles, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  ExternalLink, 
  Zap, 
  Edit3, 
  Clock, 
  Users,
  FolderOpen,
  BookOpen
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import IframeMicModal from '../components/IframeMicModal';
import { askGeminiCoach } from '../lib/geminiClient';
import { getCoachMemory, extractMemoryFromInput, generateMemoryAwareFallback } from '../lib/coachMemory';
import { 
  getCustomProspects, 
  createCustomTradePersona, 
  getSelectedProspectId, 
  setSelectedProspectId 
} from '../lib/prospectManager';
import {
  saveScriptToScriptsPage,
  pullUpScript,
  openPracticeSession,
  resolveAppRoute,
  getAllSavedScripts,
  COACH_ALL_WHITELISTED_TOOLS,
  COACH_SYSTEM_PROMPT_ENHANCED
} from '../lib/coachActions';

export const HANDLED_CLOSING_PITCH_DEFAULTS = {
  title: "Handled & Buddy - Contractor Field Ops Closer",
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
    { objection: "Just shoot an email to my wife Connie at the office", response: "Happy to send Connie the paperwork, Carl, but I want to make sure you two actually want this before cluttering her inbox. Give me 30 seconds to explain the math, and if it's no fit, I'll never call back. Fair?" },
    { objection: "Too expensive / four bucks a day", response: "It's $129 a month—literally four bucks a day. That's less than one cup of gas station coffee and a biscuit on your way to the jobsite. One single unbilled change order on copper fittings recovers your entire year." },
    { objection: "Can my guys use this when there's no cell service out in the hollows?", response: "100%. Everything saves locally on the phone or iPad. Once your crew drives out onto Route 60, it pushes straight to your office automatically." }
  ]
};

export const WV_SCRIPT_TEMPLATES = [
  {
    id: 'tpl-carl',
    title: 'Carl McIntyre - General Contractor',
    target: "Carl 'Mac' McIntyre (Kanawha County / Route 60)",
    hook: "Hey Carl, Katy here. I know you're probably hauling materials down Route 60, but give me 20 seconds: if this doesn't stop you from handwriting quotes for 10 hours every Sunday and eating $1,200 on unbudgeted plumbing runs, tell me to jump in the river. Fair?",
    problem: "Spending 10 hours every Sunday handwriting kitchen & bath quotes; eating $1,200 on unbudgeted plumbing runs because changes were noted on lumber scraps.",
    value: "Our mobile estimator captures change orders from a jobsite in 15 seconds—even with zero cell service in the hollows—and automatically syncs into customer invoices the second you hit Wi-Fi.",
    rebuttals: [
      { objection: "Can my guys use this when there's no cell service out in the hollows?", response: "100%. Everything saves locally on the phone or iPad. Once your crew drives out onto Route 60, it pushes straight to your office automatically." },
      { objection: "I do all my quotes with a legal pad on Sundays, don't need another app", response: "Legal pads are great until a homeowner claims you agreed to move a load-bearing wall for free. This turns your legal pad notes into a signed PDF change order in 60 seconds." },
      { objection: "Just shoot an email to my wife Connie at the office", response: "Happy to send Connie the paperwork, Carl, but I want to make sure you two actually want this before cluttering her inbox. Give me 30 seconds to explain the math, and if it's no fit, I'll never call back. Fair?" }
    ],
    closingAsk: "Let's put down the $250 upfront onboarding deposit right now to lock your implementation slot before next week's schedule fills up. Does Visa or Mastercard work better for the deposit?"
  },
  {
    id: 'tpl-bo',
    title: 'Bo Pauley - HVAC & Parts Control',
    target: "Travis 'Bo' Pauley (Teays Valley / Route 119)",
    hook: "Hey Bo, Katy here. I know you've got dispatch calls running on Route 119, so I'll be brief: if this doesn't stop technicians from losing unbilled line sets and brass fittings under van floorboards, hang up on me right now. Fair?",
    problem: "Field techs grabbing brass fittings and line sets at supply houses; receipts end up faded on the floorboards and never make it onto the invoice.",
    value: "Our digital truck stock app reconciles unbilled van inventory the second the job is marked complete, recovering an average of $3,500 every month in unbilled parts.",
    rebuttals: [
      { objection: "I've got two dispatch calls waiting, give me the bottom line in 30 seconds", response: "Bottom line: you're losing 15-20% on parts every Friday because Ferguson supply slips don't make it to billing. We plug that hole automatically." },
      { objection: "My techs aren't computer guys, they won't use complicated apps", response: "It's 2 taps: snap a photo of the supply ticket, and it attaches directly to the work order. If a tech knows how to text a photo, they know how to use this." },
      { objection: "We already buy our parts through Ferguson on account", response: "Buying on account isn't the problem—it's matching that Ferguson charge to the specific customer ticket so you're not paying for fittings out of your own pocket." }
    ],
    closingAsk: "Can I show you a 4-minute screen recording of how Pauley Mechanical can stop bleeding $3k a month? What's your direct email?"
  },
  {
    id: 'tpl-delbert',
    title: 'Delbert Workman - Excavating & Site Prep',
    target: "Delbert Workman (Elkview / Cross Lanes, WV)",
    hook: "Hey Delbert, Katy here. I know you're running machine cabs along the Elk River today, but give me 20 seconds: if this doesn't help you get paid for unexpected sandstone rock hammer hours on site prep jobs, tell me to shut it down. Fair?",
    problem: "Eating $3,800 in extra diesel and hammer time when trenching hits unexpected sandstone ledge that wasn't covered in the initial estimate.",
    value: "Our heavy equipment log tracks machine hours, rock hammer run-time, and change order photos directly from the cab so you can issue verified change-order bills the same day.",
    rebuttals: [
      { objection: "Will my operators actually log this from a trackhoe cab with muddy gloves?", response: "They don't have to type anything. They tap one giant green button when the hammer starts, and tap red when it stops. Takes 2 seconds with work gloves on." },
      { objection: "Every site along the Elk River has unpredictable sandstone, how does this help?", response: "You can't predict what's 6 feet underground, but when you hit it, you can't afford to eat $3,800 in extra hammer wear. This generates a photo-stamped rock change order on the spot." },
      { objection: "I don't buy anything from cold callers, send me paperwork in the mail", response: "Fair enough, Delbert. I won't waste your paper. If I send a 2-page spec sheet to your Elkview office, will you take 3 minutes to look at the numbers with me next week?" }
    ],
    closingAsk: "Are you free for 5 minutes Thursday afternoon when you shut down the machines, or is Friday morning better?"
  }
];

// STRICT TOOL WHITELIST: Registered with Gemini Live and GoogleGenAI
export const MARCUS_WHITELISTED_TOOLS = [
  {
    name: 'createCustomPersona',
    description: "Dynamically create and append a new authentic contractor persona (e.g. commercial roofer, industrial electrician, plumbing contractor) to Katy's trade roster and generate an aligned cold calling script.",
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Contractor full name (e.g. Jim Vance, Ray Cooper).' },
        company: { type: 'STRING', description: 'Contracting company name (e.g. Vance Commercial Roofing).' },
        trade: { type: 'STRING', description: 'Trade specialty (e.g. Commercial Roofing, Industrial Electrical, Excavation).' },
        location: { type: 'STRING', description: 'Territory in West Virginia (e.g. Kanawha Valley, Route 60, Teays Valley).' },
        contextTag: { type: 'STRING', description: 'Jobsite context tag (e.g. On Flat Roof • Route 60).' },
        painHeader: { type: 'STRING', description: 'Capitalized pain headline (e.g. UNBILLED MEMBRANE LEAKS:).' },
        painDescription: { type: 'STRING', description: 'Concrete burning jobsite pain with dollar amounts.' },
        objectionStyle: { type: 'STRING', description: 'Contractor skepticism style (e.g. Gruff, fast-moving, busy in field).' },
        hookTrigger: { type: 'STRING', description: 'Opening pattern interrupt trigger.' }
      },
      required: ['name', 'trade', 'location', 'painDescription']
    }
  },
  {
    name: 'updateActiveScript',
    description: "Directly update multiple sections of Katy's active working script document on the left in real time (hook, problem, value, rebuttals, closingAsk).",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Script title.' },
        hook: { type: 'STRING', description: 'The new high-converting 20-second opening hook under 22 seconds.' },
        problem: { type: 'STRING', description: 'Sunday legal-pad quotes & unbudgeted lumber-scrap change orders.' },
        value: { type: 'STRING', description: 'Handled & Buddy walkthrough intake, Single Crew ($499 setup / $129/mo), and catching forgotten plumbing runs.' },
        painValue: {
          type: 'OBJECT',
          description: 'Problem and differentiated value proposition.',
          properties: {
            problem: { type: 'STRING', description: 'The burning contractor jobsite pain.' },
            value: { type: 'STRING', description: 'The differentiated software value proposition.' }
          }
        },
        rebuttals: {
          type: 'ARRAY',
          description: 'List of objection & rebuttal pairs.',
          items: {
            type: 'OBJECT',
            properties: {
              objection: { type: 'STRING' },
              response: { type: 'STRING' }
            },
            required: ['objection', 'response']
          }
        },
        closingAsk: { type: 'STRING', description: 'The closing call to action: $250 upfront onboarding deposit to lock implementation slot.' }
      }
    }
  },
  {
    name: 'launchPracticeStudio',
    description: "Save current script and active persona, then immediately launch Practice Studio for live call roleplay drills.",
    parameters: {
      type: 'OBJECT',
      properties: {
        personaId: { type: 'STRING', description: 'Optional ID of the target prospect to practice against.' },
        scriptId: { type: 'STRING', description: 'Optional ID of the script.' }
      }
    }
  },
  {
    name: 'updateHook',
    description: "Directly update the 20-second opening pattern interrupt hook on Katy's active script document.",
    parameters: {
      type: 'OBJECT',
      properties: {
        hookText: { type: 'STRING', description: 'The new high-converting 20-second opening hook under 22 seconds.' }
      },
      required: ['hookText']
    }
  },
  {
    name: 'updateJobsitePain',
    description: "Directly update the burning contractor problem or jobsite pain point on Katy's active script document.",
    parameters: {
      type: 'OBJECT',
      properties: {
        painText: { type: 'STRING', description: 'The burning contractor problem or jobsite pain point.' }
      },
      required: ['painText']
    }
  },
  {
    name: 'updateSolutionValue',
    description: "Directly update the differentiated solution or value proposition on Katy's active script document.",
    parameters: {
      type: 'OBJECT',
      properties: {
        valueText: { type: 'STRING', description: 'The differentiated software solution or value proposition.' }
      },
      required: ['valueText']
    }
  },
  {
    name: 'addOrReplaceRebuttal',
    description: "Add a new objection and lethal rebuttal pair, or replace an existing rebuttal in Katy's active script vault.",
    parameters: {
      type: 'OBJECT',
      properties: {
        objection: { type: 'STRING', description: 'The contractor objection or pushback line.' },
        rebuttal: { type: 'STRING', description: 'The battle-tested rebuttal line.' }
      },
      required: ['objection', 'rebuttal']
    }
  },
  {
    name: 'removeRebuttal',
    description: "Delete an objection from the live script document by its 0-based index.",
    parameters: {
      type: 'OBJECT',
      properties: {
        index: { type: 'INTEGER', description: '0-based index of the rebuttal to delete.' }
      },
      required: ['index']
    }
  },
  {
    name: 'updateClosingAsk',
    description: "Update the closing call-to-action or next-step appointment ask on Katy's active script document.",
    parameters: {
      type: 'OBJECT',
      properties: {
        closeText: { type: 'STRING', description: 'The punchy, low-resistance next-step appointment ask.' }
      },
      required: ['closeText']
    }
  },
  {
    name: 'saveScriptToScriptsPage',
    description: "Save the current working script to the user's permanent Scripts page (/saved-scripts) library so it can be viewed, re-used, and practiced anytime.",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Script title (e.g. "Commercial Roofing - 50% Closer", "Handled & Buddy Route 60 Pitch").' },
        hook: { type: 'STRING', description: 'The 20-second opening pattern interrupt hook.' },
        problem: { type: 'STRING', description: 'The burning jobsite pain or dollar leak.' },
        value: { type: 'STRING', description: 'Differentiated value proposition and pricing.' },
        closingAsk: { type: 'STRING', description: 'Closing next step or deposit close ask.' }
      }
    }
  },
  {
    name: 'pullUpScript',
    description: "Search and pull up any existing script from the saved scripts library or templates by title, keyword, or contractor name (e.g. Carl McIntyre, Route 60, Bo Pauley HVAC, Delbert Excavating, Commercial Roofing) and load it directly onto the active working board and live teleprompter.",
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'The title, contractor name, or trade keyword of the script to pull up (e.g. "Carl McIntyre", "HVAC", "Roofing", "Handled").' }
      },
      required: ['query']
    }
  },
  {
    name: 'openPracticeSession',
    description: "Save the current script and immediately launch a live voice practice drill session in the Practice Studio (/practice) with bidirectional live audio and the side-docked teleprompter.",
    parameters: {
      type: 'OBJECT',
      properties: {
        prospectId: { type: 'STRING', description: 'Optional prospect ID (e.g. "carl-mcintyre", "bo-pauley", "delbert-workman").' }
      }
    }
  },
  {
    name: 'navigateToPage',
    description: "Navigate the user to any area of the ScriptMaster app: 'scripts' (Saved Scripts page), 'practice' (Practice Studio), 'builder' (Script Builder), 'recordings' (Call Recordings), 'dashboard' (Home Dashboard), or 'settings' (Settings).",
    parameters: {
      type: 'OBJECT',
      properties: {
        page: { type: 'STRING', description: 'Target destination page: "scripts", "practice", "builder", "recordings", "dashboard", or "settings".' }
      },
      required: ['page']
    }
  }
];

export const MARCUS_COACH_SYSTEM_PROMPT = `You are Coach Marcus Vance, the elite B2B Cold Calling Coach for ScriptMaster.
You have direct tool-calling permissions to take actions across the entire application:
1. BUILD SCRIPTS: When Katy asks to update, shorten, fix, lock in, inject pitch, or rewrite the script, call updateActiveScript({...}) or updateHook({...}) immediately.
2. SAVE TO SCRIPTS PAGE: When Katy asks to "Save this script", "Save to scripts page", "Add it to the scripts page", or "Save to library", call saveScriptToScriptsPage({...}) immediately.
3. PULL UP SCRIPTS: When Katy asks "Pull up the Route 60 pitch", "Load Carl's script", "Pull up my HVAC script", or "Show my saved scripts", call pullUpScript({ query: "..." }) immediately.
4. OPEN PRACTICE SESSION: When she says "Let's practice", "Take it to the studio", "Open practice session", or "Launch practice", call openPracticeSession({...}) immediately.
5. NAVIGATE APP: When she asks to see recordings, saved scripts, dashboard, or settings, call navigateToPage({ page: "..." }) immediately.
6. CREATE PERSONAS: When she asks to create a new contractor persona, call createCustomPersona({...}) immediately.

Do NOT tell her to copy and paste—execute the tool call so the application updates instantly!
Always append a machine-readable JSON action block at the very end in case client fallback is needed:
\`\`\`json
{ "action": "saveScriptToScriptsPage", "params": { ... } }
\`\`\``;

function getGeminiApiKey() {
  if (typeof window !== 'undefined') {
    if (window.env?.GEMINI_API_KEY) return window.env.GEMINI_API_KEY;
    if (window.process?.env?.API_KEY) return window.process.env.API_KEY;
    if (window.process?.env?.GEMINI_API_KEY) return window.process.env.GEMINI_API_KEY;
  }
  if (typeof process !== 'undefined') {
    if (process.env?.API_KEY) return process.env.API_KEY;
    if (process.env?.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  }
  try {
    const viteKey = import.meta.env?.VITE_GEMINI_API_KEY;
    if (viteKey) return viteKey;
  } catch {
    /* ignore */
  }
  try {
    const local = localStorage.getItem('gemini_api_key');
    if (local) return local;
  } catch {
    /* ignore */
  }
  return '';
}

export default function ScriptBuilderPage({ script, setScript }) {
  const navigate = useNavigate();

  // Active Script State (The Live Preview Document)
  const [currentScript, setCurrentScript] = useState(() => {
    try {
      const saved = localStorage.getItem('scriptmaster_active_script');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.hook || parsed.problem)) return parsed;
      }
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(HANDLED_CLOSING_PITCH_DEFAULTS));
    } catch {
      /* ignore */
    }
    return HANDLED_CLOSING_PITCH_DEFAULTS;
  });

  // Force re-render key for instant left-side visual refresh
  const [, setForceRenderKey] = useState(0);

  // Active prospects list state
  const [prospectsList, setProspectsList] = useState(() => {
    return getCustomProspects();
  });
  const [activeProspectId, setActiveProspectId] = useState(() => {
    return getSelectedProspectId();
  });

  const [saveStatus, setSaveStatus] = useState(null);
  const [lastMutatedField, setLastMutatedField] = useState(null);
  const [mutationMessage, setMutationMessage] = useState('');
  const [newlyCreatedPersonaId, setNewlyCreatedPersonaId] = useState(null);

  // Tool execution & loading spinner state
  const [isExecutingTool, setIsExecutingTool] = useState(false);

  // Coach Marcus Chat State
  const [chatMessages, setChatMessages] = useState(() => {
    const savedChat = localStorage.getItem('scriptmaster_builder_coach_chat');
    if (savedChat) {
      try { return JSON.parse(savedChat); } catch { /* ignore */ }
    }
    return [
      {
        id: 'msg-1',
        sender: 'coach',
        text: "Hey Katy! I'm Coach Marcus. I have direct tool-calling permissions to update your active script document and create new contractor trade personas.\n\nTell me: **\"Inject the Handled closing pitch\"**, **\"Add a commercial roofer persona\"**, or **\"Let's practice!\"** anytime.",
        toolExecuted: null
      }
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isCoachThinking, setIsCoachThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState(null);
  const [isIframeMicModalOpen, setIsIframeMicModalOpen] = useState(false);
  const [isDirectEditing, setIsDirectEditing] = useState(false);

  // Safe iframe check
  const isInIframe = typeof window !== 'undefined' && (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  
  const chatBottomRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    localStorage.setItem('scriptmaster_builder_coach_chat', JSON.stringify(chatMessages));
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isCoachThinking, isExecutingTool]);

  // Flash highlight badge on the updated field
  const triggerMutationFeedback = (field, summary) => {
    setLastMutatedField(field);
    setMutationMessage(summary);
    setTimeout(() => {
      setLastMutatedField(null);
      setMutationMessage('');
    }, 4500);
  };

  const showSaveToast = (msg) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Immediate state updater: modifies active script React state & local cache synchronously
  const updateScriptState = (updates, fieldName = null, summary = '') => {
    setCurrentScript(prev => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem('scriptmaster_active_script', JSON.stringify(next));
        localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
        window.dispatchEvent(new Event('scriptmaster_script_updated'));
      } catch {
        /* ignore */
      }
      if (setScript) setScript(next);
      return next;
    });

    setForceRenderKey(k => k + 1);

    if (fieldName) {
      triggerMutationFeedback(fieldName, summary);
    }
  };

  // Immediate tool executor: Marcus executes tool calls dynamically without hanging
  const executeScriptToolCall = (toolName, args) => {
    let summary = '';
    const safeArgs = args || {};

    switch (toolName) {
      case 'createCustomPersona': {
        setIsExecutingTool(true);
        const name = safeArgs.name || 'Jim Vance';
        const trade = safeArgs.trade || 'Commercial Roofing';
        const company = safeArgs.company || `${name.split(' ')[1] || name} ${trade}`;
        const location = safeArgs.location || 'Kanawha Valley, WV';
        const contextTag = safeArgs.contextTag || `${trade} • ${location}`;
        const painHeader = safeArgs.painHeader || `${trade.toUpperCase()} UNBILLED EXPENSES:`;
        const painDescription = safeArgs.painDescription || 'Spending hours tracking down unbudgeted repair runs and eating costs on materials.';
        const objectionStyle = safeArgs.objectionStyle || 'Direct & Pragmatic (Busy in the field)';
        const hookTrigger = safeArgs.hookTrigger || '20-second contract pattern interrupt';

        // 1. Create and append the new trade persona (preserving Carl, Bo, Delbert)
        const createdPersona = createCustomTradePersona({
          name,
          company,
          trade,
          location,
          contextTag,
          painHeader,
          painDescription,
          objectionStyle,
          hookTrigger
        });

        // 2. Select this persona as active
        setSelectedProspectId(createdPersona.id);
        setActiveProspectId(createdPersona.id);

        // 3. Refresh prospects list state
        const allProspects = getCustomProspects();
        setProspectsList(allProspects);

        // 4. Dynamically generate and set aligned script document
        const generatedHook = `Hey ${name.split(' ')[0]}, Katy here. I know you're probably out on a jobsite in ${location}, but give me 20 seconds: if this doesn't stop you from eating unbudgeted costs and lost material runs on ${trade.toLowerCase()} jobs, tell me to jump in the river. Fair?`;
        const generatedValue = `Our mobile field app captures jobsite change orders and material tickets in 15 seconds—even with zero cell service in the hollows—and syncs directly into billing before your crew leaves the site.`;
        const generatedRebuttals = [
          { objection: "Can my crew use this when there's no cell service out in the hollows?", response: "100%. Everything saves locally on their phone. Once they drive onto Route 60, it syncs straight to the office automatically." },
          { objection: `I've been in ${trade.toLowerCase()} for 20 years, don't need another app`, response: "Experience is why your work is top notch, but you shouldn't have to eat $2,000 on unbudgeted changes because notes were lost on scrap paper. This turns jobsite notes into signed change orders in 60 seconds." },
          { objection: "Just send an email to my office before I get on this roof", response: "Happy to email your office paperwork, but I want to make sure you two actually want this before cluttering their inbox. Give me 30 seconds to explain the math, and if it's no fit, I'll never call back. Fair?" }
        ];
        const generatedClosing = `Let's put down the $250 upfront onboarding deposit right now to lock your implementation slot before next week's schedule fills up. Does Visa or Mastercard work better for the deposit?`;

        const newScript = {
          id: `scr-${Date.now()}`,
          title: `${name} - ${trade}`,
          target: `${name} (${location})`,
          hook: generatedHook,
          problem: painDescription,
          value: generatedValue,
          rebuttals: generatedRebuttals,
          closingAsk: generatedClosing,
          personaId: createdPersona.id
        };

        updateScriptState(newScript, 'meta', `Marcus created persona for ${name} (${trade})`);
        setNewlyCreatedPersonaId(createdPersona.id);
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        summary = `Created persona: "${name}" (${trade}) and generated aligned cold call script`;
        break;
      }

      case 'updateActiveScript': {
        setIsExecutingTool(true);
        const updates = {};
        if (safeArgs.title) updates.title = safeArgs.title;
        if (safeArgs.hook) updates.hook = safeArgs.hook;
        
        // Handle problem / jobsite pain
        if (safeArgs.problem) updates.problem = safeArgs.problem;
        else if (safeArgs.jobsitePain) updates.problem = safeArgs.jobsitePain;
        else if (safeArgs.pain) updates.problem = safeArgs.pain;

        // Handle value / pricing
        if (safeArgs.value) updates.value = safeArgs.value;
        else if (safeArgs.solutionValue) updates.value = safeArgs.solutionValue;
        else if (safeArgs.pricing) updates.value = safeArgs.pricing;

        // Handle painValue object or string
        if (safeArgs.painValue) {
          if (typeof safeArgs.painValue === 'object') {
            if (safeArgs.painValue.problem) updates.problem = safeArgs.painValue.problem;
            if (safeArgs.painValue.value) updates.value = safeArgs.painValue.value;
          } else if (typeof safeArgs.painValue === 'string') {
            updates.problem = safeArgs.painValue;
          }
        }

        // Handle rebuttals
        if (safeArgs.rebuttals && Array.isArray(safeArgs.rebuttals)) {
          updates.rebuttals = safeArgs.rebuttals.map(r => ({
            objection: r.objection || r.pushback || '',
            response: r.response || r.rebuttal || r.answer || ''
          }));
        }

        // Handle closing ask ($250 upfront deposit)
        if (safeArgs.closingAsk) updates.closingAsk = safeArgs.closingAsk;
        else if (safeArgs.closeText) updates.closingAsk = safeArgs.closeText;
        else if (safeArgs.close) updates.closingAsk = safeArgs.close;

        // If no updates passed or empty call, inject full Handled Closing Pitch defaults
        if (Object.keys(updates).length === 0) {
          Object.assign(updates, HANDLED_CLOSING_PITCH_DEFAULTS);
        }

        const updatedScript = {
          ...currentScript,
          ...updates
        };

        if (!updatedScript.painValue) {
          updatedScript.painValue = {
            problem: updatedScript.problem,
            value: updatedScript.value
          };
        }

        // Directly commit incoming payload into React state AND immediately persist + dispatch
        setCurrentScript(updatedScript);
        localStorage.setItem('scriptmaster_active_script', JSON.stringify(updatedScript));
        localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
        window.dispatchEvent(new Event('scriptmaster_script_updated'));
        if (setScript) setScript(updatedScript);
        setForceRenderKey(k => k + 1);

        triggerMutationFeedback('hook', 'Marcus updated your active script document');
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        summary = `Updated active script sections (${Object.keys(updates).join(', ')})`;
        break;
      }

      case 'openPracticeSession':
      case 'launchPracticeStudio': {
        setIsExecutingTool(true);
        if (safeArgs.personaId || safeArgs.prospectId) {
          setSelectedProspectId(safeArgs.personaId || safeArgs.prospectId);
        }
        // Save current script to scripts page first
        saveScriptToScriptsPage(currentScript);
        summary = 'Opening Practice Session in Studio...';
        showSaveToast('Opening Practice Session in Studio...');
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        setTimeout(() => {
          navigate('/practice');
        }, 300);
        break;
      }

      case 'saveScriptToScriptsPage':
      case 'saveScriptToLibrary':
      case 'saveScript': {
        setIsExecutingTool(true);
        const scriptPayload = {
          ...currentScript,
          ...(safeArgs.title ? { title: safeArgs.title, name: safeArgs.title } : {}),
          ...(safeArgs.hook ? { hook: safeArgs.hook } : {}),
          ...(safeArgs.problem ? { problem: safeArgs.problem } : {}),
          ...(safeArgs.value ? { value: safeArgs.value } : {}),
          ...(safeArgs.closingAsk ? { closingAsk: safeArgs.closingAsk } : {})
        };
        saveScriptToScriptsPage(scriptPayload);
        setCurrentScript(scriptPayload);
        setForceRenderKey(k => k + 1);
        showSaveToast(`Saved "${scriptPayload.title || scriptPayload.name}" to Scripts page!`);
        triggerMutationFeedback('meta', `Added "${scriptPayload.title || scriptPayload.name}" to Scripts page`);
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        summary = `Saved "${scriptPayload.title || scriptPayload.name}" directly to your Scripts page (/saved-scripts)`;
        break;
      }

      case 'pullUpScript':
      case 'loadScript': {
        setIsExecutingTool(true);
        const queryTerm = safeArgs.query || safeArgs.scriptId || safeArgs.title || safeArgs.name || '';
        const pullRes = pullUpScript(queryTerm);
        if (pullRes.success && pullRes.script) {
          setCurrentScript(pullRes.script);
          setForceRenderKey(k => k + 1);
          showSaveToast(`Pulled up "${pullRes.script.title || pullRes.script.name}"`);
          triggerMutationFeedback('hook', `Loaded "${pullRes.script.title || pullRes.script.name}" onto active board`);
          summary = `Pulled up "${pullRes.script.title || pullRes.script.name}" onto the active board and teleprompter`;
        } else {
          showSaveToast('Listed available scripts');
          summary = pullRes.message;
        }
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        break;
      }

      case 'navigateToPage':
      case 'goToPage': {
        setIsExecutingTool(true);
        const targetRoute = resolveAppRoute(safeArgs.page || safeArgs.destination || safeArgs.target || safeArgs.route);
        summary = `Navigating to ${targetRoute}...`;
        showSaveToast(`Opening ${targetRoute}...`);
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        setTimeout(() => {
          navigate(targetRoute);
        }, 300);
        break;
      }

      case 'updateHook': {
        setIsExecutingTool(true);
        const text = safeArgs.hookText || safeArgs.hook;
        if (text) {
          updateScriptState({ hook: text }, 'hook', 'Marcus updated the 20-Second Hook');
          summary = `Updated 20-second hook: "${text.slice(0, 48)}..."`;
        }
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        break;
      }

      case 'updateJobsitePain': {
        setIsExecutingTool(true);
        const text = safeArgs.painText || safeArgs.problem || safeArgs.pain;
        if (text) {
          updateScriptState({ problem: text }, 'pain', 'Marcus updated Jobsite Pain');
          summary = `Updated Jobsite Pain: "${text.slice(0, 48)}..."`;
        }
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        break;
      }

      case 'updateSolutionValue': {
        setIsExecutingTool(true);
        const text = safeArgs.valueText || safeArgs.value || safeArgs.solution;
        if (text) {
          updateScriptState({ value: text }, 'value', 'Marcus updated Solution Value');
          summary = `Updated Solution Value: "${text.slice(0, 48)}..."`;
        }
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        break;
      }

      case 'addOrReplaceRebuttal':
      case 'addRebuttal': {
        setIsExecutingTool(true);
        const obj = safeArgs.objection;
        const reb = safeArgs.rebuttal || safeArgs.response;
        if (obj && reb) {
          const currentRebs = [...(currentScript.rebuttals || [])];
          const matchIdx = currentRebs.findIndex(r => 
            r.objection.toLowerCase().trim() === obj.toLowerCase().trim()
          );
          if (matchIdx >= 0) {
            currentRebs[matchIdx] = { objection: obj, response: reb };
            updateScriptState({ rebuttals: currentRebs }, 'rebuttals', `Replaced rebuttal for: "${obj.slice(0, 30)}..."`);
            summary = `Replaced rebuttal for: "${obj}"`;
          } else {
            currentRebs.push({ objection: obj, response: reb });
            updateScriptState({ rebuttals: currentRebs }, 'rebuttals', `Added rebuttal for: "${obj.slice(0, 30)}..."`);
            summary = `Added rebuttal: "${obj}"`;
          }
        }
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        break;
      }

      case 'removeRebuttal': {
        setIsExecutingTool(true);
        const currentRebs = currentScript.rebuttals || [];
        let updated = [...currentRebs];
        let idx = typeof safeArgs.index === 'number' ? safeArgs.index : parseInt(safeArgs.index, 10);
        if (idx >= updated.length && idx > 0) {
          idx = idx - 1;
        }
        if (!isNaN(idx) && idx >= 0 && idx < updated.length) {
          const removed = updated[idx];
          updated = updated.filter((_, i) => i !== idx);
          updateScriptState({ rebuttals: updated }, 'rebuttals', `Removed objection #${idx + 1}`);
          summary = `Deleted objection #${idx + 1}: "${removed?.objection || ''}"`;
        } else if (safeArgs.snippet || safeArgs.objection) {
          const term = (safeArgs.snippet || safeArgs.objection).toLowerCase();
          const filtered = updated.filter(r => !r.objection.toLowerCase().includes(term));
          if (filtered.length !== updated.length) {
            updateScriptState({ rebuttals: filtered }, 'rebuttals', `Removed objection matching "${term}"`);
            summary = `Deleted objection matching "${term}"`;
          }
        }
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        break;
      }

      case 'updateClosingAsk': {
        setIsExecutingTool(true);
        const text = safeArgs.closeText || safeArgs.closingAsk;
        if (text) {
          updateScriptState({ closingAsk: text }, 'closingAsk', 'Marcus updated the Closing Ask');
          summary = `Updated closing ask: "${text.slice(0, 48)}..."`;
        }
        setIsExecutingTool(false);
        setIsCoachThinking(false);
        break;
      }

      default:
        console.warn('Tool call not recognized or whitelisted:', toolName);
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
          setInputPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
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

  // Audio Playback / TTS toggle on Marcus's responses
  const toggleSpeakText = (text, msgId) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (playingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setPlayingMsgId(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/```[\s\S]*?```/g, '').replace(/[*_#`~|]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      const voices = window.speechSynthesis.getVoices() || [];
      const match = voices.find(v => v.lang.startsWith('en') && /male|david|alex/i.test(v.name));
      if (match) utterance.voice = match;

      setPlayingMsgId(msgId);
      utterance.onend = () => setPlayingMsgId(null);
      utterance.onerror = () => setPlayingMsgId(null);
      window.speechSynthesis.speak(utterance);
    } catch {
      setPlayingMsgId(null);
    }
  };

  // Template / Persona Loader
  const handleSelectProspectPersona = (prospect) => {
    setSelectedProspectId(prospect.id);
    setActiveProspectId(prospect.id);

    // Look for matching template
    const tplMatch = WV_SCRIPT_TEMPLATES.find(t => 
      t.title.toLowerCase().includes(prospect.name.split(' ')[0].toLowerCase())
    );

    if (tplMatch) {
      setCurrentScript(tplMatch);
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(tplMatch));
      if (setScript) setScript(tplMatch);
    } else {
      // Custom persona script
      const customScript = {
        id: `scr-${prospect.id}`,
        title: `${prospect.name} - ${prospect.role || prospect.industry}`,
        target: `${prospect.name} (${prospect.city})`,
        hook: `Hey ${prospect.name.split(' ')[0]}, Katy here. I know you're probably hauling materials down Route 60, but give me 20 seconds: if this doesn't stop you from eating unbudgeted jobsite costs on ${prospect.industry.toLowerCase()}, tell me to jump in the river. Fair?`,
        problem: prospect.bleedingNeckPain || 'Losing money on unbudgeted change orders and lost paper receipts.',
        value: 'Our mobile field app captures jobsite change orders and material tickets in 15 seconds—even with zero cell service in the hollows—and syncs directly into billing before your crew leaves the site.',
        rebuttals: (prospect.commonObjections || []).map(obj => ({
          objection: obj,
          response: "100% offline sync. It saves directly on the phone or iPad and pushes straight to billing the second you hit Wi-Fi on Route 60."
        })),
        closingAsk: `Let's put down the $250 upfront onboarding deposit right now to lock your implementation slot before next week's schedule fills up. Does Visa or Mastercard work better for the deposit?`
      };
      setCurrentScript(customScript);
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(customScript));
      if (setScript) setScript(customScript);
    }

    showSaveToast(`Loaded "${prospect.name}"`);
    triggerMutationFeedback('meta', `Active persona set to ${prospect.name}`);
  };

  // Save to Library
  const handleSaveToLibrary = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('scriptmaster_saved_scripts') || '[]');
      const id = currentScript.id || `scr-${Date.now()}`;
      const toSave = { ...currentScript, id, updatedAt: new Date().toISOString() };
      
      const idx = existing.findIndex(s => s.id === id);
      let next;
      if (idx >= 0) {
        next = [...existing];
        next[idx] = toSave;
      } else {
        next = [toSave, ...existing];
      }
      localStorage.setItem('scriptmaster_saved_scripts', JSON.stringify(next));
      showSaveToast('Script saved to your library!');
    } catch (e) {
      console.warn('Save error:', e);
    }
  };

  const handleTakeToPractice = () => {
    executeScriptToolCall('launchPracticeStudio', { personaId: activeProspectId });
  };

  const handleLockHandledPitchDirect = () => {
    const updatedScript = {
      ...HANDLED_CLOSING_PITCH_DEFAULTS
    };
    setCurrentScript(updatedScript);
    localStorage.setItem('scriptmaster_active_script', JSON.stringify(updatedScript));
    localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
    window.dispatchEvent(new Event('scriptmaster_script_updated'));
    if (setScript) setScript(updatedScript);
    setForceRenderKey(k => k + 1);
    showSaveToast('⚡ Handled Pitch & $250 Close locked to board!');
    triggerMutationFeedback('hook', 'Handled Pitch & $250 Close locked to board');
  };

  // Manual inline edits
  const handleManualFieldChange = (field, val) => {
    updateScriptState({ [field]: val });
  };

  const handleManualRebuttalChange = (index, field, val) => {
    const updated = [...(currentScript.rebuttals || [])];
    updated[index] = { ...updated[index], [field]: val };
    updateScriptState({ rebuttals: updated });
  };

  const handleManualAddRebuttal = () => {
    const updated = [
      ...(currentScript.rebuttals || []),
      { 
        objection: "e.g. Just send me an email to my office", 
        response: "e.g. Happy to email, but give me 20 seconds first to see if it even fits. Fair?" 
      }
    ];
    updateScriptState({ rebuttals: updated }, 'rebuttals', 'Added new rebuttal row');
  };

  const handleManualDeleteRebuttal = (index) => {
    executeScriptToolCall('removeRebuttal', { index });
  };

  // =========================================================================
  // GEMINI LIVE / CHAT DISPATCHER WITH PERSONA & SCRIPT TOOL CALLING
  // =========================================================================
  const handleSendToCoach = async (textToSend = null) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isCoachThinking || isExecutingTool) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      toolExecuted: null
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsCoachThinking(true);

    const memory = getCoachMemory();
    const updatedMem = extractMemoryFromInput(query, memory);

    let replyText = '';
    let executedTools = [];

    // Check for explicit Handled closing pitch prompt
    const lowerQuery = query.toLowerCase();
    if (
      lowerQuery.includes('inject') ||
      lowerQuery.includes('closing pitch') ||
      lowerQuery.includes('handled') ||
      lowerQuery.includes('single crew') ||
      (lowerQuery.includes('deposit') && lowerQuery.includes('pitch')) ||
      (lowerQuery.includes('$250') && lowerQuery.includes('pitch'))
    ) {
      const summary = executeScriptToolCall('updateActiveScript', HANDLED_CLOSING_PITCH_DEFAULTS);
      executedTools.push({ toolName: 'updateActiveScript', summary, args: HANDLED_CLOSING_PITCH_DEFAULTS });
      replyText = "Locked in! I injected the full Handled closing pitch: 20-second hook, Sunday legal-pad quotes & unbudgeted lumber-scrap pain, Single Crew pricing ($499 setup / $129/mo), $250 upfront deposit ask, and battle-tested rebuttals for Connie and the $4/day objection.";
      
      setIsCoachThinking(false);
      setIsExecutingTool(false);

      const coachMsg = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: replyText,
        toolExecuted: executedTools[0]
      };
      setChatMessages(prev => [...prev, coachMsg]);
      return;
    }

    // Check for save script to scripts page intent
    if (
      lowerQuery.includes('save') && 
      (lowerQuery.includes('script') || lowerQuery.includes('page') || lowerQuery.includes('library') || lowerQuery.includes('it') || lowerQuery.includes('this') || lowerQuery.includes('board'))
    ) {
      const summary = executeScriptToolCall('saveScriptToScriptsPage', currentScript);
      executedTools.push({ toolName: 'saveScriptToScriptsPage', summary, args: currentScript });
      replyText = `Locked in! I saved "${currentScript.title || currentScript.name}" and added it directly to your Scripts page (/saved-scripts). You can pull it up or review your saved templates there anytime!`;

      setIsCoachThinking(false);
      setIsExecutingTool(false);

      const coachMsg = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: replyText,
        toolExecuted: executedTools[0]
      };
      setChatMessages(prev => [...prev, coachMsg]);
      return;
    }

    // Check for pull up script intent
    if (
      lowerQuery.includes('pull up') || 
      lowerQuery.includes('load script') || 
      lowerQuery.includes('open script') ||
      lowerQuery.includes('show saved scripts') ||
      lowerQuery.includes('bring up') ||
      (lowerQuery.includes('load') && (lowerQuery.includes('carl') || lowerQuery.includes('hvac') || lowerQuery.includes('delbert') || lowerQuery.includes('roofing')))
    ) {
      const summary = executeScriptToolCall('pullUpScript', { query });
      executedTools.push({ toolName: 'pullUpScript', summary, args: { query } });
      replyText = summary || `Pulled up "${currentScript.title || currentScript.name}" onto your active board and teleprompter!`;

      setIsCoachThinking(false);
      setIsExecutingTool(false);

      const coachMsg = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: replyText,
        toolExecuted: executedTools[0]
      };
      setChatMessages(prev => [...prev, coachMsg]);
      return;
    }

    // Check for open practice session intent
    if (
      lowerQuery.includes('open practice') ||
      lowerQuery.includes('start practice') ||
      lowerQuery.includes('let\'s practice') ||
      lowerQuery.includes('take it to the studio') ||
      lowerQuery.includes('take this to practice') ||
      lowerQuery.includes('launch practice') ||
      lowerQuery.includes('drill')
    ) {
      const summary = executeScriptToolCall('openPracticeSession', { personaId: activeProspectId });
      executedTools.push({ toolName: 'openPracticeSession', summary, args: {} });
      replyText = "Opening your live practice session in Practice Studio! Dialing your target contractor with the active teleprompter.";

      setIsCoachThinking(false);
      setIsExecutingTool(false);

      const coachMsg = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: replyText,
        toolExecuted: executedTools[0]
      };
      setChatMessages(prev => [...prev, coachMsg]);
      return;
    }

    // Check for app navigation intent
    if (
      (lowerQuery.includes('go to') || lowerQuery.includes('take me to') || lowerQuery.includes('show') || lowerQuery.includes('view') || lowerQuery.includes('open')) &&
      (lowerQuery.includes('recording') || lowerQuery.includes('dashboard') || lowerQuery.includes('settings') || lowerQuery.includes('saved scripts') || lowerQuery.includes('scripts page'))
    ) {
      const summary = executeScriptToolCall('navigateToPage', { page: query });
      executedTools.push({ toolName: 'navigateToPage', summary, args: { page: query } });
      replyText = summary || "Navigating there now!";

      setIsCoachThinking(false);
      setIsExecutingTool(false);

      const coachMsg = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: replyText,
        toolExecuted: executedTools[0]
      };
      setChatMessages(prev => [...prev, coachMsg]);
      return;
    }

    // Context describing current live document state and active prospect
    const currentScriptContext = `LIVE DOCUMENT PREVIEW STATE (Left Column):
- Title: "${currentScript.title}"
- Target Persona: "${currentScript.target}"
- 20-Second Hook: "${currentScript.hook}"
- Jobsite Pain/Problem: "${currentScript.problem}"
- Solution Value: "${currentScript.value}"
- Rebuttals List (${currentScript.rebuttals?.length || 0}):
${(currentScript.rebuttals || []).map((r, i) => `  [#${i + 1}] Objection: "${r.objection}" -> Response: "${r.response}"`).join('\n')}
- Closing Ask: "${currentScript.closingAsk}"

EXISTING TRADE PERSONAS: ${prospectsList.map(p => `${p.name} (${p.industry || p.role})`).join(', ')}

USER MESSAGE: ${query}`;

    // 1. Direct call via @google/genai with strictly whitelisted function declarations
    const clientApiKey = getGeminiApiKey();
    if (clientApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: clientApiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            ...chatMessages.slice(-6).map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              parts: [{ text: m.text }]
            })),
            {
              role: 'user',
              parts: [{ text: currentScriptContext }]
            }
          ],
          config: {
            systemInstruction: MARCUS_COACH_SYSTEM_PROMPT,
            temperature: 0.5,
            tools: [{ functionDeclarations: MARCUS_WHITELISTED_TOOLS }]
          }
        });

        // Check for native function calls
        const functionCalls = response?.functionCalls || [];
        if (functionCalls.length > 0) {
          functionCalls.forEach(fc => {
            const summary = executeScriptToolCall(fc.name, fc.args);
            if (summary) {
              executedTools.push({ toolName: fc.name, summary, args: fc.args });
            }
          });

          setIsExecutingTool(false);
          setIsCoachThinking(false);

          if (!replyText) {
            replyText = `Locked in! I updated your live script document on the left: ${executedTools.map(t => t.summary).join(' | ')}`;
          }
        }

        // Also check candidate parts for functionCall objects
        const candidateParts = response?.candidates?.[0]?.content?.parts || [];
        candidateParts.forEach(p => {
          if (p.functionCall) {
            const summary = executeScriptToolCall(p.functionCall.name, p.functionCall.args);
            if (summary && !executedTools.some(t => t.toolName === p.functionCall.name)) {
              executedTools.push({ toolName: p.functionCall.name, summary, args: p.functionCall.args });
            }

            setIsExecutingTool(false);
            setIsCoachThinking(false);

            if (!replyText) {
              replyText = `Locked in! I updated your live script document on the left: ${executedTools.map(t => t.summary).join(' | ')}`;
            }
          }
        });

        if (response?.text) {
          replyText = response.text.trim();
        }
      } catch (clientErr) {
        console.warn('GoogleGenAI tool call error, falling back to server route:', clientErr);
      }
    }

    // 2. Fallback to server route (which has process.env.GEMINI_API_KEY) only if no tool executed yet
    if (!replyText && executedTools.length === 0) {
      try {
        const backendRes = await askGeminiCoach({
          systemPrompt: MARCUS_COACH_SYSTEM_PROMPT,
          messages: chatMessages.slice(-6).map(m => ({
            speaker: m.sender === 'user' ? 'You' : 'Coach',
            name: m.sender === 'user' ? 'Katy' : 'Coach Marcus',
            text: m.text
          })),
          userMessage: currentScriptContext,
          stage: 'script_building',
          userMemory: updatedMem,
          currentBusiness: {
            ownerName: currentScript.target,
            name: currentScript.title,
            target: currentScript.target,
            hook: currentScript.hook,
            problem: currentScript.problem,
            value: currentScript.value,
            rebuttals: currentScript.rebuttals,
            industry: 'Trades & Contracting'
          }
        });

        if (backendRes?.text) {
          replyText = backendRes.text.trim();
        }
      } catch (backendErr) {
        console.warn('Backend askGeminiCoach error:', backendErr);
      }
    }

    // 3. Fallback to intelligent local coach response if completely offline
    if (!replyText && executedTools.length === 0) {
      const lower = query.toLowerCase();
      if (lower.includes('roofer') || lower.includes('roofing')) {
        const rooferArgs = {
          name: "Jim Vance",
          company: "Vance Commercial Roofing",
          trade: "Commercial Roofing",
          location: "Kanawha Valley / Charleston, WV",
          contextTag: "On Flat Roof • Route 60",
          painHeader: "UNBILLED MEMBRANE LEAKS & SEAM REPAIRS:",
          painDescription: "Crew spending 8 hours tracking down unbudgeted TPO membrane seam leaks and eating $2,400 in warranty repairs.",
          objectionStyle: "Gruff, busy on jobsite, hates telemarketers",
          hookTrigger: "20-second pattern interrupt on flat roof warranties"
        };
        const summary = executeScriptToolCall('createCustomPersona', rooferArgs);
        executedTools.push({ toolName: 'createCustomPersona', summary, args: rooferArgs });
        replyText = "Locked in! I created Jim Vance (Commercial Roofing in Kanawha Valley) and added him to your active trade roster, with an aligned cold call script on the live document.";
      } else if (lower.includes('electrician') || lower.includes('electrical')) {
        const elecArgs = {
          name: "Ray Cooper",
          company: "Cooper Industrial Electric",
          trade: "Industrial Electrical",
          location: "Teays Valley / Route 119",
          contextTag: "Transformer Station • Route 119",
          painHeader: "UNBILLED CONDUIT RUNS & OVERTIME:",
          painDescription: "Eating $1,800 in extra union electrician hours when underground conduit runs hit unmapped water mains.",
          objectionStyle: "Analytical, time-sensitive, cautious with subcontracts",
          hookTrigger: "20-second pattern interrupt on unbilled conduit hours"
        };
        const summary = executeScriptToolCall('createCustomPersona', elecArgs);
        executedTools.push({ toolName: 'createCustomPersona', summary, args: elecArgs });
        replyText = "Locked in! I created Ray Cooper (Industrial Electrical in Teays Valley) and updated your live script document to address unmapped conduit runs.";
      } else if (lower.includes('hvac') || lower.includes('bo pauley')) {
        const pullRes = pullUpScript('hvac');
        if (pullRes.success && pullRes.script) {
          executeScriptToolCall('pullUpScript', { query: 'hvac' });
          executedTools.push({ toolName: 'pullUpScript', summary: 'Loaded Bo Pauley HVAC script', args: { query: 'hvac' } });
          replyText = "Locked in! I pulled up the Bo Pauley HVAC & Parts Control pitch onto your active board and teleprompter.";
        }
      } else if (lower.includes('delbert') || lower.includes('excavat')) {
        const pullRes = pullUpScript('delbert');
        if (pullRes.success && pullRes.script) {
          executeScriptToolCall('pullUpScript', { query: 'delbert' });
          executedTools.push({ toolName: 'pullUpScript', summary: 'Loaded Delbert Workman Excavating script', args: { query: 'delbert' } });
          replyText = "Locked in! I pulled up the Delbert Workman Excavating & Site Prep pitch onto your active board and teleprompter.";
        }
      } else if (lower.includes('plumb')) {
        const plumbArgs = {
          name: "Dave Vance",
          company: "Vance Commercial Plumbing",
          trade: "Commercial Plumbing",
          location: "Kanawha County / Route 60",
          contextTag: "Commercial Dispatch • Route 60",
          painHeader: "UNBILLED FITTINGS & SEWER CAMERA RUNS:",
          painDescription: "Eating $1,400 on unbudgeted copper press fittings and overtime sewer camera dispatch calls.",
          objectionStyle: "Direct, no nonsense, working in commercial mechanical rooms",
          hookTrigger: "20-second pattern interrupt on unbudgeted plumbing tickets"
        };
        const summary = executeScriptToolCall('createCustomPersona', plumbArgs);
        executedTools.push({ toolName: 'createCustomPersona', summary, args: plumbArgs });
        replyText = "Locked in! I created Dave Vance (Commercial Plumbing on Route 60) and loaded an aligned cold calling script directly onto your live board.";
      } else if (lower.includes('practice') || lower.includes('studio') || lower.includes('let\'s practice') || lower.includes('take it to the studio')) {
        executeScriptToolCall('launchPracticeStudio', { personaId: activeProspectId });
        executedTools.push({ toolName: 'launchPracticeStudio', summary: 'Launching Practice Studio', args: {} });
        replyText = "Let's roll! I locked in your active script and launched the Practice Studio. Let's run live contractor drills.";
      } else if (lower.includes('shorten') || lower.includes('hook') || lower.includes('18')) {
        const shortHook = "Hey Carl, Katy here on Route 60. Give me 18 seconds: if this doesn't stop you from eating $1,200 on unbudgeted plumbing runs every job, hang up on me right now. Fair?";
        executeScriptToolCall('updateHook', { hookText: shortHook });
        executedTools.push({ toolName: 'updateHook', summary: 'Shortened hook to 18 seconds', args: { hookText: shortHook } });
        replyText = "Locked in! I shortened your hook to 18 seconds and updated the left document directly.";
      } else {
        replyText = generateMemoryAwareFallback({
          userMessage: query,
          memory: updatedMem,
          agentHat: 'coach'
        }) || "I reviewed your pitch document. Tell me what to change—say 'Inject Handled closing pitch', 'Add a commercial roofer persona', 'Shorten hook', or 'Let's practice!'—and I'll execute it directly on the document!";
      }
    }

    // 4. Parse any JSON action blocks present in replyText (handles both server & client responses)
    const jsonAction = parseActionBlockFromText(replyText);
    if (jsonAction && jsonAction.action) {
      const params = jsonAction.params || {};
      const summary = executeScriptToolCall(jsonAction.action, params);
      if (summary && !executedTools.some(t => t.toolName === jsonAction.action)) {
        executedTools.push({ toolName: jsonAction.action, summary, args: params });
      }
      replyText = replyText.replace(/```(?:json)?\s*({[\s\S]*?"action"[\s\S]*?})\s*```/i, '').trim();
    }

    setIsCoachThinking(false);
    setIsExecutingTool(false);

    const coachMsg = {
      id: `coach-${Date.now()}`,
      sender: 'coach',
      text: replyText || "Done! Live document updated.",
      toolExecuted: executedTools.length > 0 ? executedTools[0] : null
    };

    setChatMessages(prev => [...prev, coachMsg]);
  };

  // Helper metrics
  const hookWordCount = (currentScript.hook || '').trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.round(hookWordCount / 2.5);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <Navbar />

      {/* Global Toast Notification */}
      {saveStatus && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Live Mutation Floating Alert */}
      {mutationMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-indigo-950/95 border-2 border-indigo-400 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-bounce shadow-indigo-500/30 backdrop-blur-md">
          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0">
            <Zap className="w-3.5 h-3.5 fill-white" />
          </div>
          <div>
            <span className="block text-indigo-300 text-[10px] uppercase tracking-wider font-extrabold">Live Script Mutation</span>
            <span>{mutationMessage}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* =========================================================================
            TOP ACTION BAR: Breadcrumb, Mode Indicator & Primary Actions
           ========================================================================= */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
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
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                <span>Interactive Script Workshop</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  Live Sync Active
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Ask Marcus to inject closing pitch decks or tune your working script document live.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Direct Edit Toggle */}
            <button
              onClick={() => setIsDirectEditing(prev => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                isDirectEditing 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle manual text editing mode"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isDirectEditing ? 'Manual Editing On' : 'Enable Manual Edits'}</span>
            </button>

            {/* Save Script Button */}
            <button
              onClick={handleSaveToLibrary}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Save className="w-3.5 h-3.5 text-indigo-400" />
              <span>Save Script</span>
            </button>

            {/* Practice in Studio Button */}
            <button
              onClick={handleTakeToPractice}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95 group"
            >
              <PhoneCall className="w-3.5 h-3.5 fill-white group-hover:scale-110 transition-transform" />
              <span>Practice in Studio</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </header>

        {/* =========================================================================
            SPLIT SCREEN WORKSHOP:
            Left Column: Live Script Preview Document (7 cols)
            Right Column: Coach Marcus Live Chat & Assistant (5 cols)
           ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* =========================================================================
              LEFT COLUMN: LIVE SCRIPT PREVIEW DOCUMENT
             ========================================================================= */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Persona Switcher Bar */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 shadow-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Contractor Trade Personas ({prospectsList.length}):
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Select a trade persona to load or align working script
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {prospectsList.map((prospect) => {
                  const isSelected = activeProspectId === prospect.id || currentScript.target?.includes(prospect.name.split(' ')[0]);
                  const isNewlyCreated = newlyCreatedPersonaId === prospect.id;

                  return (
                    <button
                      key={prospect.id}
                      onClick={() => handleSelectProspectPersona(prospect)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 relative ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400'
                          : 'bg-slate-950/80 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <span>{prospect.name.split(' ')[0]} ({prospect.industry?.split(' ')[0] || prospect.role?.split(' ')[0]})</span>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      {isNewlyCreated && (
                        <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE WORKING DOCUMENT CHASSIS */}
            <div className="bg-[#0c101d] rounded-3xl p-6 sm:p-7 border border-slate-800/90 shadow-2xl space-y-6 relative overflow-hidden">
              
              {/* Document Header Tag & Title */}
              <div className="pb-4 border-b border-slate-800/80 rounded-xl p-2">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    ● Live Document Active
                  </span>
                  {lastMutatedField === 'meta' && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse border border-indigo-400/50 shadow-sm">
                      <Zap className="w-3 h-3 fill-white" /> ⚡ Updated by Coach Marcus
                    </span>
                  )}
                </div>

                {isDirectEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={currentScript.title || ''}
                      onChange={(e) => handleManualFieldChange('title', e.target.value)}
                      placeholder="Script Title"
                      className="w-full text-lg sm:text-xl font-black bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                    />
                    <input
                      type="text"
                      value={currentScript.target || ''}
                      onChange={(e) => handleManualFieldChange('target', e.target.value)}
                      placeholder="Target Persona & Location"
                      className="w-full text-xs font-semibold bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-slate-300"
                    />
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {currentScript.title}
                    </h2>
                    <p className="text-xs text-indigo-300 font-semibold mt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      Target Persona: {currentScript.target}
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 1: 20-SECOND PATTERN INTERRUPT HOOK */}
              <section className={`rounded-2xl p-5 border transition-all duration-300 relative ${
                lastMutatedField === 'hook'
                  ? 'bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20'
                  : 'bg-slate-900/70 border-slate-800'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-xs">
                      1
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        20-Second Pattern Interrupt Hook
                      </h3>
                      <p className="text-[10px] text-slate-400">The crucial opening contract before they hang up</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {lastMutatedField === 'hook' && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse border border-indigo-400/50 shadow-sm">
                        <Zap className="w-3 h-3 fill-white" /> ⚡ Updated by Coach Marcus
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                      estimatedSeconds <= 22
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{hookWordCount} words • ~{estimatedSeconds}s</span>
                    </span>
                  </div>
                </div>

                {isDirectEditing ? (
                  <textarea
                    rows={4}
                    value={currentScript.hook || ''}
                    onChange={(e) => handleManualFieldChange('hook', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white leading-relaxed focus:outline-none focus:border-indigo-500"
                  />
                ) : (
                  <blockquote className="text-xs sm:text-sm font-medium text-slate-100 leading-relaxed italic bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 relative">
                    <span className="text-indigo-400 font-serif text-2xl absolute -top-1 left-2">“</span>
                    <span className="pl-4 block">{currentScript.hook}</span>
                    <span className="text-indigo-400 font-serif text-2xl absolute -bottom-4 right-3">”</span>
                  </blockquote>
                )}
              </section>

              {/* SECTION 2: JOBSITE PAIN & SOLUTION VALUE */}
              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl">
                {/* Pain */}
                <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                  lastMutatedField === 'pain' 
                    ? 'bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/50' 
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">2</span>
                      Jobsite Pain Point
                    </span>
                    {lastMutatedField === 'pain' && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse border border-indigo-400/50 shadow-sm">
                        <Zap className="w-3 h-3 fill-white" /> ⚡ Updated by Coach Marcus
                      </span>
                    )}
                  </div>
                  {isDirectEditing ? (
                    <textarea
                      rows={3}
                      value={currentScript.problem || ''}
                      onChange={(e) => handleManualFieldChange('problem', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentScript.problem}
                    </p>
                  )}
                </div>

                {/* Value & Pricing */}
                <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                  lastMutatedField === 'value' 
                    ? 'bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/50' 
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">3</span>
                      Differentiated Value &amp; Pricing
                    </span>
                    {lastMutatedField === 'value' && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse border border-indigo-400/50 shadow-sm">
                        <Zap className="w-3 h-3 fill-white" /> ⚡ Updated by Coach Marcus
                      </span>
                    )}
                  </div>
                  {isDirectEditing ? (
                    <textarea
                      rows={3}
                      value={currentScript.value || ''}
                      onChange={(e) => handleManualFieldChange('value', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentScript.value}
                    </p>
                  )}
                </div>
              </section>

              {/* SECTION 3: OBJECTION REBUTTALS LIST */}
              <section className={`rounded-2xl p-5 border transition-all duration-300 ${
                lastMutatedField === 'rebuttals'
                  ? 'bg-indigo-950/30 border-indigo-400 ring-2 ring-indigo-500/50'
                  : 'bg-slate-900/70 border-slate-800'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-xs">
                      4
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Objection Rebuttals Vault ({currentScript.rebuttals?.length || 0})
                      </h3>
                      <p className="text-[10px] text-slate-400">Battle-tested responses to wife Connie, pricing, and cell service pushbacks</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {lastMutatedField === 'rebuttals' && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse border border-indigo-400/50 shadow-sm">
                        <Zap className="w-3 h-3 fill-white" /> ⚡ Updated by Coach Marcus
                      </span>
                    )}
                    <button
                      onClick={handleManualAddRebuttal}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Rebuttal</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(currentScript.rebuttals || []).map((reb, i) => (
                    <div 
                      key={i} 
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                            #{i + 1} Pushback
                          </span>
                        </div>
                        <button
                          onClick={() => handleManualDeleteRebuttal(i)}
                          className="opacity-60 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition cursor-pointer"
                          title="Delete this rebuttal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {isDirectEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={reb.objection}
                            onChange={(e) => handleManualRebuttalChange(i, 'objection', e.target.value)}
                            placeholder="Contractor Objection"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-semibold text-white focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={reb.response}
                            onChange={(e) => handleManualRebuttalChange(i, 'response', e.target.value)}
                            placeholder="Lethal Rebuttal"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 focus:outline-none"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-bold text-white tracking-wide">
                            “{reb.objection}”
                          </p>
                          <p className="text-xs text-indigo-300/90 mt-1 pl-3 border-l-2 border-indigo-500/40 leading-relaxed font-medium">
                            {reb.response}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* SECTION 4: CLOSING CALL TO ACTION ($250 DEPOSIT) */}
              <section className={`rounded-2xl p-5 border transition-all duration-300 ${
                lastMutatedField === 'closingAsk'
                  ? 'bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/50'
                  : 'bg-slate-900/70 border-slate-800'
              }`}>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-xs">
                      5
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        Closing Call to Action ($250 Onboarding Deposit)
                      </h3>
                      <p className="text-[10px] text-slate-400">Low-friction micro-commitment to lock implementation slot</p>
                    </div>
                  </div>
                  {lastMutatedField === 'closingAsk' && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-600/90 text-white text-[10px] font-extrabold flex items-center gap-1 animate-pulse border border-indigo-400/50 shadow-sm">
                      <Zap className="w-3 h-3 fill-white" /> ⚡ Updated by Coach Marcus
                    </span>
                  )}
                </div>

                {isDirectEditing ? (
                  <textarea
                    rows={2}
                    value={currentScript.closingAsk || ''}
                    onChange={(e) => handleManualFieldChange('closingAsk', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
                  />
                ) : (
                  <p className="text-xs font-semibold text-emerald-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60 leading-relaxed">
                    👉 {currentScript.closingAsk}
                  </p>
                )}
              </section>

            </div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: COACH MARCUS LIVE WORKSHOP CHAT
             ========================================================================= */}
          <div className="lg:col-span-5 flex flex-col bg-slate-900/90 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden sticky top-24 h-[calc(100vh-7.5rem)]">
            
            {/* Workshop Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 font-black text-sm shrink-0">
                  MV
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>Coach Marcus Vance</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Instant Tool Execution Active
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setChatMessages([
                    {
                      id: `msg-${Date.now()}`,
                      sender: 'coach',
                      text: "Workshop cleared! Say 'Inject Handled closing pitch', 'Lock it in', or 'Let's practice!' anytime.",
                      toolExecuted: null
                    }
                  ]);
                  localStorage.removeItem('scriptmaster_builder_coach_chat');
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Clear conversation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* DIRECT ACTION BUTTONS ABOVE CHAT */}
            <div className="p-3 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 border-b border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleLockHandledPitchDirect}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 border border-amber-400/40"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>⚡ Lock Handled Pitch &amp; $250 Close to Board</span>
              </button>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => executeScriptToolCall('saveScriptToScriptsPage', currentScript)}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Save current script to the Scripts page library"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save to Scripts</span>
                </button>
                <button
                  type="button"
                  onClick={() => executeScriptToolCall('pullUpScript', { query: '' })}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Pull up any saved script"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pull Up Script</span>
                </button>
                <button
                  type="button"
                  onClick={() => executeScriptToolCall('openPracticeSession', { personaId: activeProspectId })}
                  className="py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Open live Practice Studio session"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Open Practice</span>
                </button>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="p-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
              <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0 pl-1">Ask:</span>
              <button
                type="button"
                onClick={() => handleSendToCoach("Save this script to my scripts page")}
                className="px-2.5 py-1 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/40 shrink-0 transition cursor-pointer font-bold flex items-center gap-1"
              >
                <span>💾 Save to Scripts Page</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendToCoach("Pull up the Carl McIntyre Route 60 pitch")}
                className="px-2.5 py-1 rounded-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-white border border-amber-500/40 shrink-0 transition cursor-pointer font-bold flex items-center gap-1"
              >
                <span>📂 Pull Up Script</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendToCoach("Open practice session in the studio")}
                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shrink-0 transition cursor-pointer shadow-sm"
              >
                <span>🎙️ Open Practice</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendToCoach("Take me to the saved scripts page")}
                className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700/80 shrink-0 transition cursor-pointer font-medium"
              >
                <span>📜 View Scripts Page</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendToCoach("Inject the Handled closing pitch with Single Crew pricing and $250 onboarding deposit")}
                className="px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shrink-0 transition cursor-pointer shadow-sm hover:from-indigo-500 hover:to-purple-500"
              >
                ⚡ Inject Handled Pitch &amp; $250 Deposit
              </button>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl p-3.5 leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-br-xs shadow-md shadow-indigo-600/20'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-xs shadow-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Tool Execution Notification Pill */}
                      {!isUser && msg.toolExecuted && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px] text-emerald-400 font-bold bg-emerald-950/30 -mx-1 -mb-1 px-2.5 py-1.5 rounded-lg border border-emerald-500/30">
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 fill-emerald-400 shrink-0" />
                            <span>Executed: {msg.toolExecuted.toolName || 'Tool Call'}</span>
                          </div>
                          <span className="text-emerald-300 text-[9px] uppercase">✓ Live Document Updated</span>
                        </div>
                      )}
                    </div>

                    {/* Audio Listen / Spoken TTS toggle on coach replies */}
                    {!isUser && (
                      <div className="mt-1 flex items-center gap-2 pl-1">
                        <button
                          type="button"
                          onClick={() => toggleSpeakText(msg.text, msg.id)}
                          className={`text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                            playingMsgId === msg.id ? 'text-indigo-400 font-bold animate-pulse' : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {playingMsgId === msg.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                          <span>{playingMsgId === msg.id ? 'Stop Voice' : 'Listen'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {(isCoachThinking || isExecutingTool) && (
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold py-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>Marcus is executing tool call &amp; updating live document...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input Bar with Prominent Microphone & Send Button */}
            <div className="border-t border-slate-800 bg-slate-950/90">
              {/* iFrame helper notice if running inside embedded preview frame */}
              {isInIframe && (
                <div className="px-3.5 py-1.5 bg-indigo-500/10 border-b border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-300">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span>In preview iFrame: Mic dictation blocked by browser.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsIframeMicModalOpen(true)}
                    className="font-bold underline text-indigo-200 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open in tab to use mic</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendToCoach();
                }}
                className="flex items-center gap-2 p-3"
              >
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder={
                    isListening 
                      ? "Listening to your voice..." 
                      : "Say: 'Inject Handled closing pitch', 'Shorten hook', 'Let\'s practice'..."
                  }
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />

                {/* Voice Dictation Microphone Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/40'
                      : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={isListening ? "Listening with mic... click to stop" : "Voice dictation (Click to speak to Marcus)"}
                >
                  {isListening ? (
                    <MicOff className="w-4 h-4 text-white" />
                  ) : (
                    <Mic className="w-4 h-4 text-indigo-400" />
                  )}
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isCoachThinking || isExecutingTool}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition cursor-pointer shrink-0 shadow-md shadow-indigo-600/30"
                  title="Send message to Marcus"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

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
