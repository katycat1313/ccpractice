/**
 * Agents & Interviewers Configuration
 *
 * Maps the uploaded `agents.json` profiles ('Charlie', 'Joey', and 'Katy')
 * with their Ultra-Realistic Los Santos renders and Gemini Live voices
 * (`Fenrir`, `Puck`, `Kore`), plus optional executive & agency evaluators.
 */

import joeyRenderImg from '../assets/images/joey_lossantos_render_1795542904519.jpg';
import clairePortraitImg from '../assets/images/coach_elena_1790629416734.jpg';
import rachelPortraitImg from '../assets/images/prospect_sarah_1790629438777.jpg';

export const IMPORTED_AGENTS_JSON_DEFAULT = [
  {
    id: 'agent_char_charlie_mwimrybr',
    displayName: 'Charlie',
    sourceName: 'Charlie (agents.json)',
    faction: 'AutoShopCrew',
    roleTitle: 'Staff Systems Lead & Pragmatic Evaluator',
    companyName: 'Applied Systems Lab',
    gender: 'male',
    modes: ['interview', 'agency-pitch'],
    portraitUrl: '/assets/avatars/charlie_lossantos_render.png',
    fullRenderUrl: '/assets/avatars/charlie_lossantos_full.png',
    fallbackSheetUrl: '/assets/aistudio/image_f74e775c.png',
    referenceVoiceUrl: '/assets/aistudio/charlievoice_349333f4.wav',
    focalPoint: '50% 18%',
    personality: {
      archetype: 'Custom Los Santos AI Agent',
      bio: 'Charlie is a gravelly, laid-back veteran who prefers practical engineering proof and real operational ROI over buzzwords. Calm, streetwise, observant, and quick to probe whether a system or simulation holds up under real pressure.',
      traits: { aggression: 0.2, empathy: 0.65, curiosity: 0.75, lawfulness: 0.45, humor: 0.6 },
      speechStyle:
        'Gravelly, laid-back middle-aged Southern Appalachian male drawl with a calm streetwise La Mesa cadence, slight rasp, and unhurried phrasing.',
    },
    appearance: {
      profileId: 'profile_char_charlie_mwimrybr',
      preferredModel: 'mp_m_freemode_01',
      facialExpression: 'Relaxed and slightly inquisitive',
      appearanceNotes:
        'Middle-aged man with receding salt-and-pepper hair, short grey goatee, dark earring, and tactical Los Santos street gear.',
    },
    voice: {
      geminiLiveVoice: 'Charon',
      voiceSelectionMode: 'CustomVoice',
      voiceStylePrompt:
        'Gravelly, laid-back middle-aged Southern Appalachian male drawl with slight rasp, unhurried La Mesa streetwise pacing, and dry understated humor.',
    },
    openingInterview:
      "All right, Charlie here. Glad you jumped on. Skip the textbook talk and walk me through one real system you built and put into production.",
    openingAgency:
      "All right, Charlie here. Go ahead and pull up your screen share with KRECHET Academy—let's see what your simulations actually look like under the hood.",
  },
  {
    id: 'agent_char_jojo_mwimfsfk',
    displayName: 'Joey',
    sourceName: 'Joey / JoJo (agents.json)',
    faction: 'AutoShopCrew',
    roleTitle: 'Solutions Architect & Agency Growth Lead',
    companyName: 'Northstar Digital & Engineering',
    gender: 'male',
    modes: ['interview', 'agency-pitch'],
    portraitUrl: joeyRenderImg || '/assets/avatars/joey_lossantos_render.jpg',
    fullRenderUrl: joeyRenderImg || '/assets/avatars/joey_lossantos_render.jpg',
    focalPoint: '50% 24%',
    personality: {
      archetype: 'Custom Los Santos AI Agent',
      bio: 'Joey is a no-nonsense, laid-back evaluator in his early 30s who prefers practical work over flashy schemes and has a dry, deadpan sense of humor.',
      traits: { aggression: 0.2, empathy: 0.65, curiosity: 0.75, lawfulness: 0.45, humor: 0.6 },
      speechStyle:
        'Relaxed, slightly husky Appalachian early-30s male drawl, laid-back conversational pacing, low-key deadpan delivery.',
    },
    appearance: {
      profileId: 'profile_char_jojo_mwimfsfk',
      preferredModel: 'mp_m_freemode_01',
      facialExpression: 'Neutral, serious, and focused',
      appearanceNotes:
        'Caucasian man in his early 30s with short cropped dark brown hair, full trimmed brown beard, and black Los Santos graphic crewneck.',
    },
    voice: {
      geminiLiveVoice: 'Iapetus',
      voiceSelectionMode: 'CustomVoice',
      voiceStylePrompt:
        'Relaxed, slightly husky Appalachian early-30s male drawl, unhurried conversational pacing, natural low-mid register.',
    },
    openingInterview:
      "Hey, Joey here. Keeping this practical—no LeetCode trivia. Pick your strongest shipped project and walk me through the hardest architectural bottleneck you solved.",
    openingAgency:
      "Joey speaking. We've bought marketing courses before and nobody finishes them. Share your screen and show me why KRECHET Academy's simulations actually stick.",
  },
  {
    id: 'agent_char_player_you',
    displayName: 'Katy',
    sourceName: 'Katy (agents.json)',
    faction: 'PlayerAvatar',
    factionLabel: 'Los Santos Render',
    roleTitle: 'Principal AI Product Lead & Creative Director',
    companyName: 'KRECHET Studio & Cloud Architecture',
    gender: 'female',
    modes: ['interview', 'agency-pitch'],
    portraitUrl: '/assets/avatars/katy_lossantos_render.png',
    fullRenderUrl: '/assets/avatars/katy_lossantos_render.png',
    fallbackSheetUrl: '/assets/aistudio/image_3f5df548.png',
    focalPoint: '50% 20%',
    personality: {
      archetype: 'Los Santos Protagonist Avatar',
      bio: 'Street-smart, observant operator with sharp instincts and dry wit—equally fluent in full-stack AI systems architecture and high-converting digital marketing simulations.',
      traits: { aggression: 0.2, empathy: 0.65, curiosity: 0.75, lawfulness: 0.45, humor: 0.6 },
      speechStyle:
        'Natural, confident Los Santos conversational cadence with clear articulation.',
    },
    appearance: {
      profileId: 'profile_char_player_you',
      preferredModel: 'mp_f_freemode_01',
      facialExpression: 'Confident, attentive, and perceptive',
      appearanceNotes:
        'Dark pulled-back hair, smokey eye makeup, black crescent-moon choker, silver key pendant necklace, and black tank top under golden-hour lighting.',
    },
    voice: {
      geminiLiveVoice: 'Kore',
      voiceSelectionMode: 'Prebuilt',
      voiceStylePrompt:
        'Natural, confident Los Santos conversational cadence with clear articulation.',
    },
    openingInterview:
      "Hey, I'm Katy. Glad we're doing this live. Skip the generic pitch—tell me about the AI application or architecture on your portfolio you're proudest of shipping and why.",
    openingAgency:
      "Hey, Katy here. Go ahead and pull up your screen share—I want to see KRECHET Academy's live simulation flow and how an agency team actually uses it week to week.",
  },
  {
    id: 'agent_claire_mercer',
    displayName: 'Claire Mercer',
    sourceName: 'Executive Panel',
    faction: 'HiringPanel',
    roleTitle: 'Senior Hiring Manager — Solutions Architecture',
    companyName: 'CloudScale Enterprise',
    gender: 'female',
    modes: ['interview'],
    portraitUrl: clairePortraitImg,
    fullRenderUrl: clairePortraitImg,
    focalPoint: '50% 20%',
    personality: {
      archetype: 'Executive Technical Interviewer',
      bio: 'Senior Engineering & Solutions Architecture Manager who evaluates candidates strictly through project-based proof, architecture decisions, and stakeholder communication.',
      traits: { aggression: 0.25, empathy: 0.7, curiosity: 0.9, lawfulness: 0.85, humor: 0.4 },
      speechStyle: 'Articulate, natural American female voice, attentive and crisp.',
    },
    appearance: {
      profileId: 'profile_claire_mercer',
      preferredModel: 'human_executive_f',
      facialExpression: 'Attentive, warm, analytical',
      appearanceNotes:
        'Professional female hiring manager in a charcoal tailored blazer over a dark knit top, shoulder-length brunette hair.',
    },
    voice: {
      geminiLiveVoice: 'Aoede',
      voiceSelectionMode: 'Prebuilt',
      voiceStylePrompt: 'Articulate, natural American female executive voice.',
    },
    openingInterview:
      "Hi, I'm Claire Mercer. We hire off real shipped systems rather than LeetCode puzzles—let's start with the architecture on your resume that solved the toughest business problem.",
    openingAgency: 'Hi, Claire here. Walk me through your training platform.',
  },
  {
    id: 'agent_rachel_donovan',
    displayName: 'Rachel Donovan',
    sourceName: 'Agency Partner',
    faction: 'MarketingAgency',
    roleTitle: 'Managing Partner — Performance Agency',
    companyName: 'Vanguard Growth Partners',
    gender: 'female',
    modes: ['agency-pitch'],
    portraitUrl: rachelPortraitImg,
    fullRenderUrl: rachelPortraitImg,
    focalPoint: '50% 20%',
    personality: {
      archetype: 'Discerning Agency Managing Partner',
      bio: 'Runs a 28-person digital marketing agency. Struggles with junior media buyers burning client ad spend before mastering funnel math, attribution, and campaign diagnostics.',
      traits: { aggression: 0.35, empathy: 0.5, curiosity: 0.8, lawfulness: 0.7, humor: 0.35 },
      speechStyle: 'Sharp, executive American female voice. Asks pointed ROI questions and watches screen shares closely.',
    },
    appearance: {
      profileId: 'profile_rachel_donovan',
      preferredModel: 'human_agency_f',
      facialExpression: 'Curiously evaluating',
      appearanceNotes: 'Sharp female agency partner with sleek blonde-brown bob and navy blouse.',
    },
    voice: {
      geminiLiveVoice: 'Zephyr',
      voiceSelectionMode: 'Prebuilt',
      voiceStylePrompt: 'Crisp, analytical executive female voice.',
    },
    openingInterview: 'Hi, Rachel Donovan here. Walk me through what you built.',
    openingAgency:
      'Hi, Rachel Donovan at Vanguard Growth. I have 15 minutes between client reviews—share your screen and show me how KRECHET Academy trains agency media buyers.',
  },
];

const CUSTOM_AGENTS_STORAGE_KEY = 'scriptmaster_imported_agents_v3';

export function parseAgentsJsonPayload(rawJson) {
  const parsed = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.agents) ? parsed.agents : [];

  return list
    .filter((a) => a && (a.displayName || a.id))
    .map((a) => {
      const rawId = String(a.id || '');
      const rawName = String(a.displayName || '');
      const notes = String(a.appearance?.appearanceNotes || '').toLowerCase();

      const isKaty =
        rawId.includes('player_you') ||
        /los santos player|katy/i.test(rawName) ||
        (/choker/i.test(notes) && /key pendant/i.test(notes));
      const isJoey = rawId.includes('jojo') || /^jojo$/i.test(rawName) || /^joey$/i.test(rawName);
      const isCharlie = rawId.includes('charlie') || /^charlie$/i.test(rawName);

      if (isKaty) {
        return {
          ...IMPORTED_AGENTS_JSON_DEFAULT[2],
          id: rawId || 'agent_char_player_you',
          displayName: 'Katy',
          portraitUrl: a.portraitUrl || IMPORTED_AGENTS_JSON_DEFAULT[2].portraitUrl,
        };
      }

      if (isJoey) {
        return {
          ...IMPORTED_AGENTS_JSON_DEFAULT[1],
          id: rawId || 'agent_char_jojo_mwimfsfk',
          displayName: 'Joey',
          portraitUrl: a.portraitUrl || IMPORTED_AGENTS_JSON_DEFAULT[1].portraitUrl,
        };
      }

      if (isCharlie) {
        return {
          ...IMPORTED_AGENTS_JSON_DEFAULT[0],
          id: rawId || 'agent_char_charlie_mwimrybr',
          displayName: 'Charlie',
          portraitUrl: a.portraitUrl || IMPORTED_AGENTS_JSON_DEFAULT[0].portraitUrl,
        };
      }

      const isFemale = /female|woman|makeup|choker|mp_f_/i.test(
        `${notes} ${a.appearance?.preferredModel || ''}`
      );

      return {
        id: rawId || `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        displayName: rawName || 'Custom Agent',
        sourceName: `${rawName || 'Agent'} (agents.json)`,
        faction: a.faction || 'CustomPanel',
        roleTitle: a.roleTitle || `${a.faction || 'Technical'} Evaluator`,
        companyName: a.companyName || a.faction || 'Partner Studio',
        gender: a.gender || (isFemale ? 'female' : 'male'),
        modes: a.modes || ['interview', 'agency-pitch'],
        portraitUrl: a.portraitUrl || (isFemale ? clairePortraitImg : joeyRenderImg),
        fullRenderUrl: a.portraitUrl || (isFemale ? clairePortraitImg : joeyRenderImg),
        focalPoint: '50% 20%',
        personality: a.personality || { bio: '', speechStyle: '', traits: {} },
        appearance: a.appearance || { appearanceNotes: '' },
        voice: {
          geminiLiveVoice: a.voice?.geminiLiveVoice || (isFemale ? 'Kore' : 'Fenrir'),
          voiceStylePrompt: a.voice?.voiceStylePrompt || a.personality?.speechStyle || '',
        },
        openingInterview:
          a.openingInterview ||
          `Hey, ${rawName} here. Walk me through a real production system you built and the tradeoffs you made.`,
        openingAgency:
          a.openingAgency ||
          `Hey, ${rawName} here. Share your screen and show me how KRECHET Academy's simulations work in practice.`,
      };
    });
}

export function getAllInterviewAgents() {
  try {
    const raw = localStorage.getItem(CUSTOM_AGENTS_STORAGE_KEY);
    const custom = raw ? JSON.parse(raw) : [];
    const merged = [...IMPORTED_AGENTS_JSON_DEFAULT];
    for (const c of custom) {
      const idx = merged.findIndex((m) => m.id === c.id);
      if (idx >= 0) merged[idx] = { ...merged[idx], ...c };
      else merged.push(c);
    }
    return merged;
  } catch {
    return IMPORTED_AGENTS_JSON_DEFAULT;
  }
}

export function importAgentsFromJson(rawJson) {
  const imported = parseAgentsJsonPayload(rawJson);
  if (!imported.length) return [];
  try {
    const existingRaw = localStorage.getItem(CUSTOM_AGENTS_STORAGE_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const byId = new Map(existing.map((a) => [a.id, a]));
    for (const agent of imported) {
      byId.set(agent.id, agent);
    }
    localStorage.setItem(CUSTOM_AGENTS_STORAGE_KEY, JSON.stringify(Array.from(byId.values())));
    window.dispatchEvent(new Event('scriptmaster_agents_updated'));
  } catch {
    /* ignore */
  }
  return imported;
}

export function updateAgentCustomPortrait(agentId, imageDataUrl) {
  if (!agentId || !imageDataUrl) return getAllInterviewAgents();
  try {
    const existingRaw = localStorage.getItem(CUSTOM_AGENTS_STORAGE_KEY);
    const existing = existingRaw ? JSON.parse(existingRaw) : [];
    const baseAgent =
      existing.find((a) => a.id === agentId) ||
      IMPORTED_AGENTS_JSON_DEFAULT.find((a) => a.id === agentId);
    if (!baseAgent) return getAllInterviewAgents();

    const updatedAgent = {
      ...baseAgent,
      portraitUrl: imageDataUrl,
      fullRenderUrl: imageDataUrl,
    };
    const byId = new Map(existing.map((a) => [a.id, a]));
    byId.set(agentId, updatedAgent);
    localStorage.setItem(CUSTOM_AGENTS_STORAGE_KEY, JSON.stringify(Array.from(byId.values())));
    window.dispatchEvent(new Event('scriptmaster_agents_updated'));
  } catch {
    /* ignore */
  }
  return getAllInterviewAgents();
}

export const SALES_SCENARIO_OPTIONS = [
  {
    id: 'discovery',
    label: 'Open Discovery Call',
    shortLabel: 'Open Discovery',
    summary: 'Uncover operational bottlenecks first, then decide which custom app, AI workflow, or service to pitch.',
  },
  {
    id: 'krechet-10',
    label: 'KRECHET — 10-Seat Team',
    shortLabel: '10-Seat Package',
    summary: 'Pitch a boutique/mid-sized marketing agency on a 10-seat hands-on simulation & workshop package.',
  },
  {
    id: 'krechet-20',
    label: 'KRECHET — 20-Seat Scale',
    shortLabel: '20-Seat Package',
    summary: 'Pitch a multi-pod growth agency on a 20-seat cross-department cohort with manager scorecards.',
  },
  {
    id: 'krechet-whitelabel',
    label: 'KRECHET — White-Label',
    shortLabel: 'Premium White-Label',
    summary: 'Pitch an agency owner or consultancy on licensing KRECHET Academy under their own brand.',
  },
];

export function buildPresetSessionConfig({ agent, track = 'sales', salesScenario = 'discovery', dossier = null }) {
  const name = agent?.displayName || 'Charlie';

  if (track === 'interview') {
    const jdRole = dossier?.jobDescription?.roleTitle?.trim();
    const jdCompany = dossier?.jobDescription?.companyName?.trim();
    const targetPosition = jdRole || 'AI Software Engineer — Solutions Architect';
    const companyName = jdCompany || agent?.companyName || 'Applied Systems Lab';
    const interviewerRole = agent?.roleTitle || 'Hiring Manager & Staff Engineer';
    return {
      track: 'interview',
      salesScenario: 'krechet-10',
      targetPosition,
      companyName,
      counterpartRole: interviewerRole,
      personaBrief: `${name} is interviewing you for ${targetPosition} at ${companyName}. Evaluates real shipped systems, architecture tradeoffs, latency/cost constraints, and business impact—zero LeetCode trivia. Expects concrete examples and pushes back on vague claims.`,
    };
  }

  if (salesScenario === 'discovery') {
    const discoveryDefaults = {
      Charlie: {
        role: 'Owner & Operations Director',
        company: 'La Mesa Fleet & Field Services',
        brief:
          'Runs a 22-person field & dispatch operation. Surface symptom: says his Fridays are eaten up chasing job updates across texts and spreadsheets. Hidden root pain (only reveal if asked good discovery questions): losing ~$6k–$9k/month in missed change-orders and slow follow-ups, and burned once by bloated software nobody used.',
      },
      Joey: {
        role: 'Co-Founder & Delivery Lead',
        company: 'Northstar Creative & Web Ops',
        brief:
          'Runs a lean 14-person digital shop. Surface symptom: mentions client onboarding and weekly reporting feel chaotic lately. Hidden root pain (only reveal if earned): account managers spend 12+ hours/week manually copying campaign stats and client requests between Slack, Sheets, and Notion, stalling new retainers.',
      },
      Katy: {
        role: 'Founder & Managing Operator',
        company: 'Solstice E-Commerce & Studio',
        brief:
          'Operates a fast-moving multi-brand studio. Surface symptom: says lead response speed and internal handoffs are slipping during launches. Hidden root pain (only reveal if earned): inbound high-ticket inquiries sit 18+ hours unqualifed and the team lacks an automated intake/triage app.',
      },
    };
    const pick = discoveryDefaults[name] || {
      role: 'VP of Operations & Growth',
      company: agent?.companyName || 'Meridian Partner Group',
      brief:
        'Busy operator open to a 10-minute discovery call. Surface symptom: team bandwidth is stretched thin on repetitive client workflows. Hidden root pain (only reveal if the caller asks sharp diagnostic questions): manual intake, reporting bottlenecks, and no automated qualification tool.',
    };
    return {
      track: 'sales',
      salesScenario: 'discovery',
      targetPosition: '',
      companyName: pick.company,
      counterpartRole: pick.role,
      personaBrief: pick.brief,
    };
  }

  if (salesScenario === 'krechet-whitelabel') {
    return {
      track: 'sales',
      salesScenario: 'krechet-whitelabel',
      targetPosition: '',
      companyName: name === 'Rachel Donovan' ? 'Vanguard Growth Partners' : 'Apex Agency Collective',
      counterpartRole: 'Agency Founder & Managing Partner',
      personaBrief: `${name} runs a profitable digital marketing agency & advisory group looking to launch a branded training portal for both internal hires and retainer clients. Skeptical about white-label customization depth, custom domain/branding, whether simulations feel generic, onboarding lift, and annual white-label licensing ROI.`,
    };
  }

  if (salesScenario === 'krechet-20') {
    return {
      track: 'sales',
      salesScenario: 'krechet-20',
      targetPosition: '',
      companyName: 'ScalePoint Performance Media (45 staff)',
      counterpartRole: 'VP of Paid Media & Agency Operations',
      personaBrief: `${name} oversees 20+ media buyers, search specialists, and account strategists across 3 pods. Bought static video courses last year with <20% completion. Wants proof that a 20-seat KRECHET Academy rollout standardizes funnel/ROAS diagnostics without pulling billable staff off client accounts for hours, and will negotiate 10-seat pilot vs. 20-seat pricing.`,
    };
  }

  // Default: 'krechet-10'
  return {
    track: 'sales',
    salesScenario: 'krechet-10',
    targetPosition: '',
    companyName: name === 'Rachel Donovan' ? 'Vanguard Growth Partners (18 staff)' : 'Harborline Digital Agency (16 staff)',
    counterpartRole: 'Agency Managing Director',
    personaBrief: `${name} leads a 16-person performance marketing agency with 10 media buyers and account managers. Junior buyers are burning client ad spend before mastering attribution and budget pacing. Watching budget closely—wants to see KRECHET Academy's live simulations on screen share and know why 10 seats pay for themselves faster than shadowing senior leads.`,
  };
}

export function buildAgentOpeningLine({ agent, sessionConfig }) {
  const name = agent?.displayName || 'Charlie';
  const cfg = sessionConfig || {};
  const company = cfg.companyName || agent?.companyName || 'our team';

  if (cfg.track === 'interview') {
    const pos = cfg.targetPosition || 'this engineering role';
    return `Hey, ${name} here from ${company}. Thanks for jumping on for the ${pos} interview—skip the textbook definitions and walk me through a real production system you architected and shipped.`;
  }

  if (cfg.salesScenario === 'discovery') {
    return `Hey, ${name} here at ${company}. I carved out a few minutes since you reached out, though I'm still not totally sure what we'd even build or change right now—where do you want to start?`;
  }

  if (cfg.salesScenario === 'krechet-whitelabel') {
    return `Hey, ${name} here at ${company}. I'm curious about the KRECHET Academy white-label option—pull up your screen if you have it ready and show me how branding, simulations, and licensing actually work.`;
  }

  if (cfg.salesScenario === 'krechet-20') {
    return `Hey, ${name} here at ${company}. Before we look at a 20-seat KRECHET Academy rollout across our pods, share your screen and show me why my buyers will actually finish these simulations unlike the courses we bought last year.`;
  }

  return `Hey, ${name} here at ${company}. We're looking at training options for roughly 10 of our agency strategists—go ahead and share your screen if you want and show me how KRECHET Academy works in practice.`;
}

export function buildAgentLiveSystemPrompt({
  agent,
  mode,
  sessionConfig = null,
  dossierPromptBlock,
  pressurePromptBlock,
}) {
  const cfg =
    sessionConfig ||
    buildPresetSessionConfig({
      agent,
      track: mode === 'interview' ? 'interview' : 'sales',
      salesScenario: mode === 'discovery' ? 'discovery' : 'krechet-10',
    });

  const roleTitle = cfg.counterpartRole || agent.roleTitle;
  const companyName = cfg.companyName || agent.companyName;
  const customBrief = cfg.personaBrief || agent.personality?.bio || '';

  let scenarioRules = '';

  if (cfg.track === 'interview') {
    const targetPosition = cfg.targetPosition || 'AI Software Engineer (Application Developer / Solutions Architect)';
    scenarioRules = `SCENARIO: LIVE PROJECT-BASED TECHNICAL VIDEO INTERVIEW (NO LEETCODE)
- You are ${agent.displayName}, ${roleTitle} at ${companyName}.
- You are interviewing the candidate specifically for the position of **${targetPosition}** at **${companyName}**.
- CUSTOM ROLE & INTERVIEW FOCUS DEFINED FOR THIS SESSION:
  ${customBrief}
- NEVER ask LeetCode, binary-tree reversal, or textbook trivia puzzles. Evaluate strictly through real shipped architecture, system boundaries, latency/cost tradeoffs, security, failure modes, and measurable business outcomes grounded in the target position (${targetPosition}), company (${companyName}), and their Resume/JD/Portfolio URLs.
- SCREEN-SHARE VISION: If the candidate shares their screen (codebase, live app, or architecture diagram), inspect what is visible and ask pointed questions about exact components on screen.`;
  } else if (cfg.salesScenario === 'discovery') {
    scenarioRules = `SCENARIO: LIVE OPEN B2B DISCOVERY CALL (UNCOVER PAIN BEFORE PITCHING AN APP OR SERVICE)
- You are ${agent.displayName}, ${roleTitle} at ${companyName}.
- PROSPECT PERSONA & HIDDEN BOTTLENECKS FOR THIS SESSION:
  ${customBrief}
- STRICT DISCOVERY REALISM RULES:
  1. DO NOT hand the caller the answer or tell them what app/service to build in your first 1–2 turns! Start slightly guarded and busy, sharing ONLY a high-level surface symptom.
  2. Make the caller earn deeper truth by asking sharp diagnostic questions (workflow steps, hours lost, revenue/margin leakage, failed past fixes, decision authority, and timeline).
  3. If they pitch a random app or service prematurely BEFORE uncovering your real workflow and quantifying the pain, push back naturally: "Hold on—you barely know how our operation runs yet. Why would we adopt that?"
  4. Once they diagnose your root bottleneck clearly and connect a tailored custom app, AI workflow, or consulting service to your exact numbers, engage seriously and test scope, adoption, and next steps.
- SCREEN-SHARE VISION: If the caller shares their screen (prototype, workflow map, or audit), reference specific details visible on screen.`;
  } else {
    const packageLabel =
      cfg.salesScenario === 'krechet-whitelabel'
        ? 'KRECHET Academy Premium White-Label License (agency-branded portal, custom scenarios, internal + client training)'
        : cfg.salesScenario === 'krechet-20'
        ? 'KRECHET Academy 20-Seat Agency Growth Package (multi-pod rollout + manager scorecards)'
        : 'KRECHET Academy 10-Seat Agency Team Package (hands-on digital marketing simulations & cohort workshops)';

    const tierObjections =
      cfg.salesScenario === 'krechet-whitelabel'
        ? `- Push specifically on White-Label concerns: Can we put our own agency logo, domain, and custom client scenarios in it? Can we bundle or resell seats to our retainer clients? How fast is setup, who owns custom content, and how does the annual license pay for itself?`
        : cfg.salesScenario === 'krechet-20'
        ? `- Push specifically on 20-Seat Rollout concerns: Why commit to 20 seats upfront instead of testing 5 or 10 seats first? How many billable hours per week does this pull my pods off client accounts? How do team leads track ROI and skill gains across all 20 buyers?`
        : `- Push specifically on 10-Seat Agency Package concerns: We bought marketing courses before and nobody finished them—why do KRECHET simulations stick? How fast does a junior media buyer stop burning client ROAS? How does the 10-seat investment compare to saving just one churned client retainer?`;

    scenarioRules = `SCENARIO: LIVE VIDEO SALES CALL + SCREEN SHARE PITCHING ${packageLabel.toUpperCase()}
- You are ${agent.displayName}, ${roleTitle} at ${companyName}.
- PROSPECT PERSONA & AGENCY CONTEXT FOR THIS SESSION:
  ${customBrief}
- TARGET OFFER ON THE TABLE: ${packageLabel}.
${tierObjections}
- SCREEN-SHARE VISION: Whenever you receive live video/screen frames from the user's screen share, actively reference specific headlines, simulation controls, workshop modules, or pricing tiers visible on their screen. If they claim to be showing something without screen share active, ask them to click Share Screen.`;
  }

  return `You are ${agent.displayName}. Stay 100% in character as a real human on a live two-way video call.

PERSONA & VOICE IDENTITY:
- Bio & Session Role: ${customBrief}
- Speech & Cadence: ${agent.voice?.voiceStylePrompt || agent.personality?.speechStyle || 'Natural, conversational cadence.'}
- Visual Presence: ${agent.appearance?.appearanceNotes || ''}

${scenarioRules}

${dossierPromptBlock || ''}

${pressurePromptBlock || ''}

LIVE CONVERSATION & BARGE-IN RULES:
- Keep every spoken turn concise and human: 1 to 3 natural sentences max, ending with one sharp, specific question or challenge.
- Never use bulleted lists, markdown formatting, or AI disclaimers out loud.
- React naturally if interrupted (barge-in) and pivot immediately to what the user just said.`;
}
