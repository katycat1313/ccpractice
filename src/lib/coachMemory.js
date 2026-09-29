/**
 * Coach Memory & Context System
 * Stores, extracts, and maintains conversational memory of the user's name,
 * industry, target prospect, stated objections, and coaching goals across sessions.
 */

const STORAGE_KEY = 'scriptmaster_user_memory';

export const defaultMemory = {
  userName: '',
  productOrService: '',
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
  // e.g. "I'm Katy", "My name is Katy", "Call me Katy", "I am Katy"
  const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+|[a-z]+)/i);
  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    if (!['a', 'an', 'the', 'calling', 'selling', 'working', 'trying', 'here', 'just'].includes(candidate.toLowerCase())) {
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
  // e.g. "I sell dental marketing", "I sell commercial solar", "We offer SaaS for logistics", "My company does roofing"
  const productMatch = text.match(/(?:i sell|we sell|i'm selling|we provide|we offer|my company does|i do|i work in)\s+([^.,;?!]+)/i);
  if (productMatch && productMatch[1]) {
    const prod = productMatch[1].trim().slice(0, 50);
    if (prod.length > 2 && !prod.toLowerCase().startsWith('to ')) {
      memory.productOrService = prod;
    }
  }

  // 3. Extract Target Prospect
  // e.g. "I sell to dentists", "calling factory owners", "targeting general contractors", "pitching homeowners"
  const prospectMatch = text.match(/(?:sell to|selling to|calling|call|pitching|target|targeting|pitch to)\s+([^.,;?!]+)/i);
  if (prospectMatch && prospectMatch[1]) {
    const target = prospectMatch[1].trim().slice(0, 50);
    if (target.length > 2 && !['it', 'them', 'this', 'more'].includes(target.toLowerCase())) {
      memory.targetProspect = target;
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
  const target = memory.targetProspect || currentProspect?.ownerName || 'the prospect';

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

  // Coach Hat - memory-aware coaching
  const greetings = [
    `Got it, ${name}!`,
    `I hear you, ${name}.`,
    `Great point, ${name}. Let's break that down.`
  ];
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];

  // If user mentioned what they sell or an objection
  if (lower.includes('sell') || lower.includes('calling') || lower.includes('work in')) {
    return `${greeting} When you're selling **${product}** to **${target}**, your biggest trap is sounding like an unsolicited vendor reading a script. 
    
Here's how we execute the Pattern Interrupt:
*"Hey, ${name} here. Give me 15 seconds before you step into your next meeting: if this isn't relevant to how you handle [biggest headache], tell me to hang up right now. Fair?"*

Notice that? It respects their time and disarms the reflex hang-up. Tap my avatar or the mic and try delivering that hook to me right now!`;
  }

  if (lower.includes('busy') || lower.includes('too busy') || lower.includes('no time')) {
    return `${greeting} When prospects tell you *"I'm too busy"*, they're not actually busy—it's an automatic defense shield to get off the phone. 

Never apologize or say "Sorry to bother you." Instead, agree and flip the clock:
*"I know you're slammed running your business—that's exactly why I called. Give me 20 seconds right now, and if this isn't worth your time, I'll never call you again."*

Tap my avatar to drill that objection with me right now!`;
  }

  if (lower.includes('email') || lower.includes('send an email')) {
    return `${greeting} *"Just send me an email"* is the #1 brush-off in sales. If you say "Sure, what's your email?", your pitch is dead in their spam folder.

Instead, pivot with honesty:
*"I could send an email, but your inbox gets 50 vendor pitches a day and it'll get lost. Give me 30 seconds: if you hate what I say, you can hang up on me. Deal?"*

Tap my avatar to speak that line out loud!`;
  }

  if (lower.includes('budget') || lower.includes('money') || lower.includes('expensive')) {
    return `${greeting} On *"no budget"*, remember: businesses always find budget for bleeding neck pain that stops lost revenue.

Counter with value contrast:
*"I don't expect you to have budget for something you didn't plan for today. But if this saves you $3,000 every month on lost field orders, when would make sense to look at it?"*

Tap my avatar and practice that tone!`;
  }

  if (lower.includes('deposit') || lower.includes('50%')) {
    return `${greeting} Closing the **50% deposit** requires the Milestone Escrow principle:
*"We split it 50/50: the 50% deposit reserves our dedicated sprint, and we tie the second half to you approving Milestone 1. You inspect the work before releasing the rest."*

This completely eliminates their risk while protecting your cash flow.`;
  }

  // General coaching acknowledging user's input
  return `${greeting} I've noted that: *"${text}"*. 

Remember the core rule: **People bond over similarities** (like recommending a favorite TV show to a friend). When you cold call, match their pace, use their industry vocabulary without being overly technical, and focus entirely on solving their immediate friction.

Tap my avatar to speak your pitch or objection right to me!`;
}
