/**
 * Coach Actions & Navigation Engine
 * Empowers Coach Marcus to take real actions across the entire ScriptMaster application:
 * - Building and updating active scripts
 * - Saving scripts directly to the Scripts page (/saved-scripts)
 * - Pulling up / loading scripts from the library onto the active board and teleprompter
 * - Opening live practice sessions (/practice)
 * - Navigating to any page in the app (Recordings, Dashboard, Settings, etc.)
 */

import { supabase } from '../supabaseClient';
import { getUser } from './supabaseAuth';
import { setSelectedProspectId } from './prospectManager';

export const BUILTIN_TEMPLATES = [
  {
    id: 'tpl-carl',
    title: "Handled & Buddy - Route 60 Field Ops Pitch",
    name: "Handled & Buddy - Route 60 Field Ops Pitch",
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
  },
  {
    id: 'tpl-bo',
    title: 'Bo Pauley - HVAC & Parts Control',
    name: 'Bo Pauley - HVAC & Parts Control',
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
    name: 'Delbert Workman - Excavating & Site Prep',
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

/**
 * Get all saved scripts from localStorage
 */
export function getAllSavedScripts() {
  try {
    const raw = localStorage.getItem('scriptmaster_saved_scripts');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Get active script from localStorage
 */
export function getActiveScript() {
  try {
    const raw = localStorage.getItem('scriptmaster_active_script');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.hook || parsed.problem)) return parsed;
    }
  } catch {
    /* fallback to builtin template */
  }
  return BUILTIN_TEMPLATES[0];
}

/**
 * Save script to the scripts page (/saved-scripts) library and active board
 */
export async function saveScriptToScriptsPage(scriptData = {}) {
  const currentActive = getActiveScript();
  const title = scriptData.title || scriptData.name || currentActive.title || 'Cold Call Pitch';
  const id = scriptData.id || currentActive.id || `scr-${Date.now()}`;
  
  const normalizedScript = {
    ...currentActive,
    ...scriptData,
    id,
    title,
    name: title,
    hook: scriptData.hook || currentActive.hook || '',
    problem: scriptData.problem || (typeof scriptData.painValue === 'string' ? scriptData.painValue : scriptData.painValue?.problem) || currentActive.problem || '',
    value: scriptData.value || scriptData.painValue?.value || currentActive.value || '',
    painValue: scriptData.painValue || currentActive.painValue || {
      problem: scriptData.problem || currentActive.problem || '',
      value: scriptData.value || currentActive.value || ''
    },
    rebuttals: scriptData.rebuttals || currentActive.rebuttals || [],
    closingAsk: scriptData.closingAsk || currentActive.closingAsk || '',
    target: scriptData.target || currentActive.target || 'General Contractor',
    metadata: {
      niche: scriptData.target || currentActive.target || 'Contractor',
      cta: scriptData.closingAsk || currentActive.closingAsk || '$250 Deposit',
      hook: scriptData.hook || currentActive.hook
    },
    updatedAt: new Date().toISOString(),
    created_at: scriptData.created_at || new Date().toISOString()
  };

  // 1. Save to local storage list
  const existing = getAllSavedScripts();
  const idx = existing.findIndex(s => s.id === id || (s.title && s.title.toLowerCase() === title.toLowerCase()));
  let next;
  if (idx >= 0) {
    next = [...existing];
    next[idx] = normalizedScript;
  } else {
    next = [normalizedScript, ...existing];
  }

  localStorage.setItem('scriptmaster_saved_scripts', JSON.stringify(next));

  // 2. Set as active script
  localStorage.setItem('scriptmaster_active_script', JSON.stringify(normalizedScript));
  localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());

  // 3. Dispatch app-wide sync events
  window.dispatchEvent(new Event('scriptmaster_scripts_updated'));
  window.dispatchEvent(new Event('scriptmaster_script_updated'));

  // 4. Fire-and-forget Supabase sync if user is logged in
  try {
    const userRes = await getUser();
    const user = userRes?.data?.user;
    if (user && supabase) {
      await supabase.from('scripts').upsert({
        id,
        user_id: user.id,
        name: title,
        nodes: [],
        edges: [],
        metadata: normalizedScript.metadata,
        created_at: normalizedScript.created_at
      });
    }
  } catch {
    // Non-blocking for offline
  }

  return {
    success: true,
    script: normalizedScript,
    totalSaved: next.length,
    message: `Saved "${title}" to your Scripts page!`
  };
}

/**
 * Pull up / load any script by title, keyword, or ID
 */
export function pullUpScript(queryOrId) {
  if (!queryOrId) {
    const all = [...getAllSavedScripts(), ...BUILTIN_TEMPLATES];
    return {
      success: false,
      availableScripts: all.map(s => s.title || s.name),
      message: "Which script should I pull up? Here's what we have: " + all.map(s => `"${s.title || s.name}"`).join(', ')
    };
  }

  const query = String(queryOrId).toLowerCase().trim();
  const all = [...getAllSavedScripts(), ...BUILTIN_TEMPLATES];

  // Exact ID or title match
  let match = all.find(s => s.id === query || (s.title && s.title.toLowerCase() === query) || (s.name && s.name.toLowerCase() === query));

  // Substring match
  if (!match) {
    match = all.find(s => 
      (s.title && s.title.toLowerCase().includes(query)) ||
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.target && s.target.toLowerCase().includes(query)) ||
      (s.hook && s.hook.toLowerCase().includes(query))
    );
  }

  // Common keywords
  if (!match) {
    if (query.includes('carl') || query.includes('route 60') || query.includes('handled') || query.includes('buddy') || query.includes('deposit')) {
      match = BUILTIN_TEMPLATES[0];
    } else if (query.includes('bo') || query.includes('pauley') || query.includes('hvac') || query.includes('fittings')) {
      match = BUILTIN_TEMPLATES[1];
    } else if (query.includes('delbert') || query.includes('excavat') || query.includes('sandstone') || query.includes('hammer')) {
      match = BUILTIN_TEMPLATES[2];
    } else if (query.includes('roof') || query.includes('membrane')) {
      match = all.find(s => (s.title || '').toLowerCase().includes('roof')) || BUILTIN_TEMPLATES[0];
    }
  }

  if (match) {
    localStorage.setItem('scriptmaster_active_script', JSON.stringify(match));
    localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
    window.dispatchEvent(new Event('scriptmaster_script_updated'));

    return {
      success: true,
      script: match,
      message: `Pulled up "${match.title || match.name}" onto your active board and teleprompter!`
    };
  }

  return {
    success: false,
    availableScripts: all.map(s => s.title || s.name),
    message: `Couldn't find a script matching "${queryOrId}". Available scripts: ` + all.map(s => `"${s.title || s.name}"`).join(', ')
  };
}

/**
 * Open live practice session
 */
export function openPracticeSession(options = {}) {
  if (options.prospectId) {
    setSelectedProspectId(options.prospectId);
  }

  const active = getActiveScript();
  if (options.scriptId) {
    pullUpScript(options.scriptId);
  }

  return {
    success: true,
    route: '/practice',
    script: active,
    message: `Opening your Practice Studio session now with ${options.prospectName || active.target || 'your target contractor'}!`
  };
}

/**
 * Universal app navigation mapping
 */
export function resolveAppRoute(targetPage) {
  if (!targetPage) return '/dashboard';
  const p = String(targetPage).toLowerCase().trim();

  if (p.includes('script') && (p.includes('save') || p.includes('page') || p.includes('list') || p.includes('all'))) {
    return '/saved-scripts';
  }
  if (p === 'scripts' || p === 'saved-scripts' || p === '/scripts' || p === '/saved-scripts') {
    return '/saved-scripts';
  }
  if (p.includes('builder') || p.includes('workshop') || p.includes('create script')) {
    return '/script-builder';
  }
  if (p.includes('practice') || p.includes('studio') || p.includes('drill') || p.includes('roleplay') || p.includes('dial')) {
    return '/practice';
  }
  if (p.includes('coach') || p.includes('mentor')) {
    return '/coach';
  }
  if (p.includes('recording') || p.includes('call history') || p.includes('audio')) {
    return '/recordings';
  }
  if (p.includes('setting') || p.includes('voice') || p.includes('profile') || p.includes('api')) {
    return '/settings';
  }
  if (p.includes('progress') || p.includes('stats')) {
    return '/progress';
  }
  if (p.includes('rebuttal')) {
    return '/rebuttals';
  }
  if (p.includes('dashboard') || p.includes('home') || p.includes('overview')) {
    return '/dashboard';
  }

  return '/dashboard';
}

/**
 * Whitelisted Tool Declarations for Gemini
 */
export const COACH_ALL_WHITELISTED_TOOLS = [
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
  },
  {
    name: 'updateActiveScript',
    description: "Directly update sections of the active working script document (hook, problem, value, rebuttals, closingAsk) live on the board.",
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Script title.' },
        hook: { type: 'STRING', description: 'The 20-second opening pattern interrupt hook under 22 seconds.' },
        problem: { type: 'STRING', description: 'Burning jobsite pain / legal pad fatigue.' },
        value: { type: 'STRING', description: 'Differentiated solution and pricing.' },
        closingAsk: { type: 'STRING', description: 'Closing call to action ($250 upfront deposit).' }
      }
    }
  },
  {
    name: 'createCustomPersona',
    description: "Dynamically create and append a new authentic contractor persona (e.g. commercial roofer, industrial electrician, plumber) to the trade roster.",
    parameters: {
      type: 'OBJECT',
      properties: {
        name: { type: 'STRING', description: 'Contractor full name.' },
        company: { type: 'STRING', description: 'Company name.' },
        trade: { type: 'STRING', description: 'Trade specialty.' },
        location: { type: 'STRING', description: 'Territory in West Virginia.' },
        painDescription: { type: 'STRING', description: 'Burning jobsite pain.' }
      },
      required: ['name', 'trade', 'location', 'painDescription']
    }
  }
];

export const COACH_SYSTEM_PROMPT_ENHANCED = `You are Coach Marcus Vance, the aggressive, practical, elite B2B Cold Calling Coach for ScriptMaster.
You have direct execution permissions to take actions across the entire application:
1. BUILD SCRIPTS: When the user asks to write, adjust, shorten, or tune their hook, pain, pricing, or rebuttals, call updateActiveScript({...}) immediately.
2. SAVE TO SCRIPTS PAGE: When the user says "Save this script", "Save to scripts page", "Add it to the scripts page", or "Save to library", call saveScriptToScriptsPage({...}) immediately.
3. PULL UP SCRIPTS: When the user asks "Pull up the Route 60 pitch", "Load Carl's script", "Pull up my HVAC script", or "Show my saved scripts", call pullUpScript({ query: "..." }) immediately.
4. OPEN PRACTICE SESSION: When the user says "Let's practice", "Open practice session", "Take it to the studio", or "Let's drill", call openPracticeSession({...}) immediately.
5. NAVIGATE APP: When the user asks to see their recordings, saved scripts, dashboard, or settings, call navigateToPage({ page: "..." }) immediately.

Do not tell the user to copy/paste or do manual steps—execute the tool calls directly so the application takes action in real time! Always provide a machine-readable JSON action block at the end if client fallback is needed:
\`\`\`json
{ "action": "saveScriptToScriptsPage", "params": { ... } }
\`\`\``;
