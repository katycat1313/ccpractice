/**
 * Coach Memory & Context System
 * Stores, extracts, and maintains conversational memory of the user's name,
 * industry, target prospect, stated objections, and coaching goals across sessions.
 */

const STORAGE_KEY = 'scriptmaster_user_memory';

export const defaultMemory = {
  userName: '',
  productOrService: '',
  offerOptions: [],
  targetProspect: '',
  coreWeaknesses: [],
  goals: [],
  objectionsToMaster: [],
  conversationHighlights: [],
  lastUpdated: null
};

/**
 * Loads current memory from localStorage
 */
export function getCoachMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check if user has saved name in user profile
      const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
      return {
        ...defaultMemory,
        userName: user.name && user.name !== 'Sales Rep' ? user.name.split(' ')[0] : ''
      };
    }
    return { ...defaultMemory, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Failed to load coach memory:', err);
    return defaultMemory;
  }
}

/**
 * Saves updated memory to localStorage
 */
export function saveCoachMemory(memory) {
  try {
    const updated = {
      ...memory,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save coach memory:', err);
    return memory;
  }
}

/**
 * Dynamically analyzes user input (spoken or typed) to extract and update memory
 * @param {string} userText 
 * @param {object} currentMemory 
 * @returns {object} updatedMemory
 */
export function extractMemoryFromInput(userText, currentMemory = null) {
  const memory = currentMemory ? { ...currentMemory } : getCoachMemory();
  if (!userText || typeof userText !== 'string') return memory;

  const text = userText.trim();
  const lower = text.toLowerCase();

  // 1. Extract Name
  // e.g. "My name is John", "I'm Katy", "Call me Alex"
  const nameMatch = text.match(/(?:my name is|call me)\s+([A-Z][a-z]+|[a-z]+)/i) ||
                    text.match(/(?:i'm|i am)\s+([A-Z][a-z]+)(?:\s+and|\s*,|\s*\.|\s*$)/i);
  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    const disallowedWords = [
      'a', 'an', 'the', 'calling', 'selling', 'working', 'trying', 'here', 'just',
      'in', 'doing', 'offering', 'pitching', 'reaching', 'with', 'from', 'at', 'on',
      'ready', 'new', 'good', 'talking', 'looking', 'struggling', 'hoping',
      'commercial', 'roofing', 'solar', 'software', 'contractor', 'plumber', 'electrician'
    ];
    if (!disallowedWords.includes(candidate.toLowerCase()) && candidate.length > 1) {
      memory.userName = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
      
      // Also sync to scriptmaster_user
      try {
        const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
        user.name = memory.userName;
        localStorage.setItem('scriptmaster_user', JSON.stringify(user));
      } catch (e) {
        console.warn('Could not sync user name to profile:', e);
      }
    }
  }

  // 2. Extract Product or Service Sold
  // e.g. "I sell commercial roofing", "I am selling dental marketing", "We offer SaaS for logistics", "My company does roofing"
  const productMatch = text.match(/(?:i sell|we sell|i'm selling|i am selling|what i sell is|what we sell is|we provide|i provide|we offer|i offer|my company does|our company does|i do|i work in|i'm in|i am in|we do|selling|my product is|our service is|i specialize in)\s+([^.,;?!]+)/i);
  if (productMatch && productMatch[1]) {
    const prod = productMatch[1].trim().slice(0, 60);
    if (prod.length > 2 && !prod.toLowerCase().startsWith('to ')) {
      memory.productOrService = prod;
    }
  } else {
    // Keyword fallback for common sales industries
    const industries = [
      'commercial roofing', 'roofing maintenance', 'roofing', 'hvac', 'commercial solar',
      'solar', 'plumbing', 'electrical', 'landscaping', 'saas', 'software',
      'logistics', 'cybersecurity', 'consulting', 'digital marketing', 'marketing',
      'recruiting', 'staffing', 'real estate', 'commercial insurance', 'insurance',
      'merchant services', 'payment processing'
    ];
    for (const ind of industries) {
      if (lower.includes(ind)) {
        memory.productOrService = ind.charAt(0).toUpperCase() + ind.slice(1);
        break;
      }
    }
  }

  // Preserve product/package options so the Coach can reuse them later.
  const optionsMatch = text.match(/(?:options?|offerings?|packages?|services?)\s*(?:are|include|:)?\s+([^.!?]+)/i);
  if (optionsMatch && optionsMatch[1]) {
    const options = optionsMatch[1].split(/,|\bor\b|\band\b/i).map(item => item.trim()).filter(item => item.length > 1).slice(0, 8);
    memory.offerOptions = Array.from(new Set([...(memory.offerOptions || []), ...options])).slice(-8);
  }

  // 3. Extract Target Prospect
  // e.g. "I sell to building owners", "calling factory owners", "targeting general contractors", "pitching homeowners"
  const prospectMatch = text.match(/(?:sell to|selling to|calling on|calling|call|pitching to|pitching|pitch to|target|targeting|work with|deal with|focus on)\s+([^.,;?!]+)/i);
  if (prospectMatch && prospectMatch[1]) {
    const target = prospectMatch[1].trim().slice(0, 50);
    if (target.length > 2 && !['it', 'them', 'this', 'more'].includes(target.toLowerCase())) {
      memory.targetProspect = target;
    }
  } else {
    // Target prospect keyword detection
    const targets = [
      'building owners', 'property managers', 'facility managers', 'facility directors',
      'general contractors', 'homeowners', 'business owners', 'operations directors',
      'dentists', 'doctors', 'c-level', 'executives'
    ];
    for (const t of targets) {
      if (lower.includes(t)) {
        memory.targetProspect = t.charAt(0).toUpperCase() + t.slice(1);
        break;
      }
    }
  }

  // 4. Extract Objections & Challenges
  // e.g. "They always say they're too busy", "People say send an email", "Gatekeepers hang up", "No budget"
  if (lower.includes('busy') || lower.includes('no time')) {
    if (!memory.objectionsToMaster.includes('"Too busy / No time"')) {
      memory.objectionsToMaster.push('"Too busy / No time"');
    }
  }
  if (lower.includes('email') || lower.includes('send me info')) {
    if (!memory.objectionsToMaster.includes('"Send an email"')) {
      memory.objectionsToMaster.push('"Send an email"');
    }
  }
  if (lower.includes('budget') || lower.includes('no money') || lower.includes('too expensive') || lower.includes('price')) {
    if (!memory.objectionsToMaster.includes('"No budget / Price pushback"')) {
      memory.objectionsToMaster.push('"No budget / Price pushback"');
    }
  }
  if (lower.includes('gatekeeper') || lower.includes('receptionist') || lower.includes('hang up') || lower.includes('hung up')) {
    if (!memory.objectionsToMaster.includes('Gatekeeper navigation')) {
      memory.objectionsToMaster.push('Gatekeeper navigation');
    }
  }
  if (lower.includes('deposit') || lower.includes('50%')) {
    if (!memory.objectionsToMaster.includes('50% Deposit Closing')) {
      memory.objectionsToMaster.push('50% Deposit Closing');
    }
  }

  // 5. Extract Goals
  // e.g. "My goal is to book 5 meetings", "I want to sound more confident", "I want to get better at closing"
  const goalMatch = text.match(/(?:my goal is to|i want to|i'm hoping to|hoping to|goal is|trying to)\s+([^.,;?!]+)/i);
  if (goalMatch && goalMatch[1]) {
    const goalText = goalMatch[1].trim().slice(0, 60);
    if (goalText.length > 4 && !memory.goals.includes(goalText)) {
      memory.goals.push(goalText);
    }
  }

  // Keep a short list of memorable user statements (max 5)
  if (text.length > 8) {
    const snippet = text.slice(0, 100);
    if (!memory.conversationHighlights.includes(snippet)) {
      memory.conversationHighlights.unshift(snippet);
      if (memory.conversationHighlights.length > 5) {
        memory.conversationHighlights.pop();
      }
    }
  }

  return saveCoachMemory(memory);
}

/**
 * Formats a memory dossier string for AI system prompts
 */
export function formatMemoryForPrompt(memory) {
  if (!memory) return '';
  const parts = [];
  if (memory.userName) parts.push(`User's Name: ${memory.userName}`);
  if (memory.productOrService) parts.push(`User Sells: ${memory.productOrService}`);
  if (memory.offerOptions && memory.offerOptions.length > 0) parts.push(`Available Offer Options: ${memory.offerOptions.join(', ')}`);
  if (memory.targetProspect) parts.push(`Target Prospect: ${memory.targetProspect}`);
  if (memory.objectionsToMaster && memory.objectionsToMaster.length > 0) {
    parts.push(`Known Objections User Struggles With: ${memory.objectionsToMaster.join(', ')}`);
  }
  if (memory.goals && memory.goals.length > 0) {
    parts.push(`User's Stated Goals: ${memory.goals.join('; ')}`);
  }
  if (memory.conversationHighlights && memory.conversationHighlights.length > 0) {
    parts.push(`Key User Statements Remembered: "${memory.conversationHighlights.slice(0, 3).join('", "')}"`);
  }

  return parts.join('\n');
}

/**
 * Generates an intelligent, memory-aware client-side response if backend is offline or fallback is needed
 */
export function generateMemoryAwareFallback({
  userMessage,
  memory,
  currentProspect,
  isCallActive = false,
  agentHat = 'coach'
}) {
  const text = (userMessage || '').trim();
  const lower = text.toLowerCase();
  const name = memory.userName || 'there';
  const product = memory.productOrService || 'your service';
  const _target = memory.targetProspect || currentProspect?.ownerName || 'the prospect';

  // In-character prospect simulator during active call
  if (isCallActive || agentHat === 'prospect') {
    const prospectName = currentProspect?.ownerName?.split(' ')[0] || 'Hank';
    if (lower.includes('deposit') || lower.includes('50%')) {
      return `Hold on. 50% upfront before you've proved anything? I've been burned by vendors before, ${name}. Why wouldn't I pay when the job is done?`;
    }
    if (lower.includes('busy') || lower.includes('quick') || lower.includes('20 second')) {
      return `(${prospectName} sighs) Alright, you got 20 seconds before I head into this job site. What's this about?`;
    }
    if (lower.includes('email') || lower.includes('information')) {
      return `Just send me an email with your pricing and I'll look at it when I get back to the office.`;
    }
    if (memory.productOrService) {
      return `Look, we get pitched ${memory.productOrService} all the time. What makes your setup any different from what we already have?`;
    }
    return `Look, I've got crews on the road and jobs backed up. What's the bottom line here?`;
  }

  // Coach Hat - warm, conversational mentorship (holding two-way dialogue, NOT assuming user is pitching)
  const mentionsProduct = memory.productOrService || lower.includes('sell') || lower.includes('roof') || lower.includes('hvac') || lower.includes('solar') || lower.includes('software') || lower.includes('service') || lower.includes('company');

  if (mentionsProduct) {
    if (memory.targetProspect) {
      return `Understood, ${name}. Targeting ${memory.targetProspect} with ${product} requires an instant pattern interrupt. Whenever you're ready to test your 30-second opening, hit "Start Practice Call" to practice with Hank Miller, or let me know what objection you'd like to work on!`;
    }
    return `Awesome, ${name}. Selling ${product} has huge potential, but it takes the right approach. Who do you usually pitch—are you calling owners, general contractors, or directors? And what is the biggest headache you hear from them?`;
  }

  if (text.length > 15) {
    return `Got it, ${name}. That's really helpful context for us to build on. As your mentor, I want to make sure we lock in your target and message before we do live reps. Tell me more about who you call on, or whenever you're ready, let me know and we'll start our practice pitch!`;
  }

  if (!memory.productOrService && (lower.includes('hi') || lower.includes('hello') || lower.includes('hey') || text.length < 15)) {
    return `Hey ${name}! Good to connect with you. Before we run any practice calls, let's talk for a minute so I understand your world. What product or service are you selling, and who is your ideal customer?`;
  }

  if (lower.includes('busy') || lower.includes('too busy') || lower.includes('no time')) {
    return `Man, I hear you, ${name}. When prospects say "I'm busy", it's almost always an automatic reflex to get off the phone. When we practice our call, we'll use a 15-second pattern interrupt to disarm that right out of the gate. Are you ready to test that in a quick practice call, or do you want to talk through the script first?`;
  }

  if (lower.includes('email') || lower.includes('send an email')) {
    return `Totally get it, ${name}. The classic "just send an email" brush-off kills so many deals. The secret is acknowledging that their inbox is slammed, and asking for just 20 seconds. Whenever you're ready, we can run a baseline drill to see how you naturally handle that!`;
  }

  if (lower.includes('ready') || lower.includes('practice') || lower.includes('baseline') || lower.includes('pitch') || lower.includes('start')) {
    return `Love the energy, ${name}! Let's establish your baseline score. Hit the "Start Practice Call / Baseline Pitch" button below whenever you're ready. I'll pick up the phone as your prospect, and you deliver your natural 30-second opening. Let's do this!`;
  }

  return `Got it, ${name}. That's really helpful context for us to build on. As your mentor, I want to make sure we lock in your target and message before we do live reps. Tell me more about what you want to achieve today, or whenever you're ready, let me know and we'll start our practice pitch!`;
}
