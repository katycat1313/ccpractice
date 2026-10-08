import express from 'express';
import { createServer as createViteServer, loadEnv } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the project-root .env for the Express-side Gemini routes too.
// Vite loads it for the browser automatically, but the custom server does not.
const loadedEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
Object.assign(process.env, loadedEnv);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Set Permissions-Policy header to allow microphone and camera in parent iframes
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=*, camera=*, display-capture=*, autoplay=*');
  next();
});

app.use(express.json({ limit: '15mb' }));

// Shared server-side Gemini client helper
function getValidGeminiKey(explicitKey?: string): string {
  const candidates = [
    explicitKey,
    process.env.VITE_GEMINI_API_KEY,
    process.env.GEMINI_API_KEY
  ];
  for (const k of candidates) {
    if (k && typeof k === 'string' && k.trim().length > 20 && !k.includes('YOUR_')) {
      return k.trim();
    }
  }
  return '';
}

const serverApiKey = getValidGeminiKey();
const isApiKeyConfigured = Boolean(serverApiKey);
const deepgramApiKey = process.env.DEEPGRAM_API_KEY || '';
const isDeepgramConfigured = Boolean(deepgramApiKey && deepgramApiKey.trim().length > 10 && !deepgramApiKey.includes('YOUR_'));

function pcm16ToWav(input: Buffer, sampleRate = 24000, channels = 1) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + input.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(input.length, 40);
  return Buffer.concat([header, input]);
}

function getGenAI(explicitKey?: string) {
  const key = getValidGeminiKey(explicitKey);
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

const ai = getGenAI();

app.get('/api/debug/keys', (req, res) => {
  res.json({
    hasValidGeminiKey: Boolean(getValidGeminiKey()),
    geminiKeyLength: getValidGeminiKey().length,
    isApiKeyConfigured,
    deepgramKeyLength: (process.env.DEEPGRAM_API_KEY || '').length,
  });
});

// 1. Coach Dialogue & Reasoning API
app.post('/api/gemini/coach', async (req, res) => {
  const { 
    systemPrompt, 
    messages = [], 
    userMessage = '', 
    currentBusiness, 
    stage,
    userMemory = {},
    geminiApiKey: clientKey
  } = req.body;

  const activeKey = getValidGeminiKey(clientKey);

  const firstName = currentBusiness?.ownerName ? currentBusiness.ownerName.split(' ')[0] : 'Hank';
  const company = currentBusiness?.name || 'Miller HVAC';
  const text = (userMessage || '').toLowerCase();
  const userName = userMemory?.userName || 'there';
  const userProduct = userMemory?.productOrService || '';
  const userTarget = userMemory?.targetProspect || '';
  const userObjections = (userMemory?.objectionsToMaster || []).join(', ');

  // Multi-tier Intelligent Fallback Engine that NEVER repeats itself
  const getFallbackReply = () => {
    const historyText = ((messages || []).map((m: any) => m.text || '')).join(' ').toLowerCase();

    // If roleplaying as prospect during active practice call
    if (stage === 'call_active') {
      if (text.includes('deposit') || text.includes('50%')) {
        return `Hold on, ${userName !== 'there' ? userName : ''}. 50% upfront before you've delivered working software? I've been burned by agencies before. Why shouldn't I pay when it's done?`;
      }
      if (text.includes('20 second') || text.includes('jump in a lake') || text.includes('quick')) {
        return `(Chuckles) Alright, you got 20 seconds before I head into this job site. What's this about?`;
      }
      if (text.includes('price') || text.includes('cost') || text.includes('how much')) {
        return `Give me the ballpark figure right now. I don't have time for a 45-minute demo just to find out it's out of my budget.`;
      }
      if (text.includes('busy') || text.includes('no time')) {
        return `Look, my guys have three emergency calls lined up right now. Why shouldn't I just hang up?`;
      }
      return `Look, my guys lose paper tickets all the time and unbilled materials cost us thousands. What exactly does your system do about that?`;
    }

    // Action Intent 1: Save script to scripts page
    if (text.includes('save') && (text.includes('script') || text.includes('page') || text.includes('library') || text.includes('it') || text.includes('this') || text.includes('board'))) {
      return `Locked in! I saved your script directly to your Scripts page (/saved-scripts). You can pull it up or review your saved templates there anytime!\n\n\`\`\`json\n{\n  "action": "saveScriptToScriptsPage",\n  "params": {\n    "title": "${currentBusiness?.name ? currentBusiness.name + ' Closer' : 'Handled & Buddy - Field Ops Closer'}"\n  }\n}\n\`\`\``;
    }

    // Action Intent 2: Pull up script
    if (text.includes('pull up') || text.includes('load script') || text.includes('open script') || text.includes('show saved') || (text.includes('load') && (text.includes('carl') || text.includes('hvac') || text.includes('delbert') || text.includes('roof')))) {
      return `Pulled up your script onto the active board and teleprompter!\n\n\`\`\`json\n{\n  "action": "pullUpScript",\n  "params": {\n    "query": "${userMessage.replace(/"/g, '')}"\n  }\n}\n\`\`\``;
    }

    // Action Intent 3: Open Practice Session
    if (text.includes('open practice') || text.includes('start practice') || text.includes('let\'s practice') || text.includes('take it to the studio') || text.includes('take this to practice') || text.includes('drill')) {
      return `Opening your Practice Studio session now with your teleprompter!\n\n\`\`\`json\n{\n  "action": "openPracticeSession",\n  "params": {}\n}\n\`\`\``;
    }

    // Action Intent 4: Navigate across app
    if ((text.includes('go to') || text.includes('take me to') || text.includes('open') || text.includes('show') || text.includes('view')) && (text.includes('recording') || text.includes('dashboard') || text.includes('setting') || text.includes('saved scripts') || text.includes('scripts page') || text.includes('builder'))) {
      return `Navigating there now!\n\n\`\`\`json\n{\n  "action": "navigateToPage",\n  "params": {\n    "page": "${userMessage.replace(/"/g, '')}"\n  }\n}\n\`\`\``;
    }

    // Normal mentor conversation progression (Step-by-Step Discovery)
    // Step 1: Discover what they sell
    const mentionsProduct = userProduct || text.includes('sell') || text.includes('roof') || text.includes('hvac') || text.includes('solar') || text.includes('software') || text.includes('service') || text.includes('company') || text.includes('contract');
    if (mentionsProduct) {
      if (!historyText.includes('who is your primary target')) {
        return `Got it, ${userName}! Selling ${userProduct || 'your solution'} has serious upside when pitched properly. Who is your primary target when you pick up the phone—are you calling owners, general contractors, or operations directors?`;
      }
      if (!historyText.includes('biggest roadblock')) {
        return `That makes total sense, ${userName}. Those decision makers get pitched constantly, so our hook has to be razor sharp. What's the biggest roadblock you run into right now—is it getting hung up on in the first 10 seconds, or handling objections like "send an email" or price?`;
      }
    }

    // Step 2: Discover target prospect & deal dynamics
    if (!userTarget || text.includes('owner') || text.includes('contractor') || text.includes('director') || text.includes('manager') || text.includes('client') || text.includes('customer')) {
      if (!historyText.includes('biggest roadblock')) {
        return `That makes total sense. Those decision makers get pitched constantly, so our hook has to be razor sharp. What's the biggest roadblock you run into right now—is it getting hung up on in the first 10 seconds, or handling objections like "send an email" or price?`;
      }
    }

    // Step 3: Handle specific sales objections / advice
    if (text.includes('busy') || text.includes('no time')) {
      return `Man, I hear that all the time. When prospects say "I'm busy", it's an automatic reflex shield. The secret is agreeing immediately and flipping the clock: *"I know you're slammed running your business—that's exactly why I called. Give me 20 seconds: if this isn't relevant, you can hang up right now."* That disarms them instantly.`;
    }

    if (text.includes('email') || text.includes('send an email') || text.includes('send me info')) {
      return `The classic "just send me an email" brush-off kills so many deals because it's a polite way to say no. Instead of agreeing, say: *"I could email you, but your inbox gets 50 vendor pitches a day. Give me 30 seconds: if you don't like what you hear, tell me to jump in a lake. Fair?"* Works like a charm.`;
    }

    if (text.includes('gatekeeper') || text.includes('receptionist') || text.includes('front desk')) {
      return `Gatekeepers are just doing their job protecting the boss's calendar. Never treat them like an obstacle—treat them like an ally. Use calm, peer-to-peer familiarity: *"Hey, is Hank around or is he out in the field today?"* Low pitch, high confidence, zero salesperson cadence.`;
    }

    // Step 4: Ready to practice / baseline pitch
    if (text.includes('ready') || text.includes('practice') || text.includes('baseline') || text.includes('pitch') || text.includes('start') || text.includes('call') || text.includes('try')) {
      return `Love the confidence, ${userName}! Let's establish your baseline score. Hit the **"Start Practice Call (Hank Miller)"** button below whenever you're ready. I'll pick up the phone in character as your prospect, and you deliver your natural opening. Let's hear what you've got!`;
    }

    // Step 5: Natural alternating mentor follow-ups (Never repeat identical string)
    const mentorFollowups = [
      `That's great insight, ${userName}. In cold calling, the first 7 seconds are everything. Before we test it with a live practice drill, what do you think is your strongest hook right now?`,
      `I really appreciate you breaking that down, ${userName}. That gives us a solid foundation to build our dynamic script. When you're ready to test your delivery against a tough contractor, we can fire up a practice call with Hank Miller. Are you ready to try a quick run, or do you want to polish your hook first?`,
      `Spot on, ${userName}. One big rule I always teach reps: never ask "How are you today?" on a cold call—it flags you as an unsolicited telemarketer in 2 seconds. Instead, lead with peer-to-peer relevance. Whenever you feel ready to establish your baseline score, let me know or tap the practice call button!`,
      `Got it, ${userName}. You've got the right instincts here. My goal as your coach is to make sure your 50% deposit closer and pattern interrupts become second nature. Tell me what you'd like to dive into next, or we can start a 30-second practice drill right now!`
    ];

    // Pick a followup that hasn't been said in recent history
    for (const followup of mentorFollowups) {
      const snippet = followup.slice(0, 30).toLowerCase();
      if (!historyText.includes(snippet)) {
        return followup;
      }
    }

    return mentorFollowups[0];
  };

  try {
    if (!activeKey) {
      return res.json({ text: getFallbackReply() });
    }

    const conversationHistory = (messages || []).map((m: any) => 
      `${m.speaker || (m.hat === 'prospect' ? 'Prospect' : 'Coach')}: ${m.text}`
    ).join('\n');

    const memoryDossier = `
Rep Profile & Context Known So Far:
- Name: ${userName}
- Product / Service Sold: ${userProduct || 'Not yet stated'}
- Target Prospect / Decision Maker: ${userTarget || 'Not yet stated'}
- Key Objections Struggled With: ${userObjections || 'Not yet stated'}
- Goals: ${(userMemory?.goals || []).join('; ') || 'Not yet stated'}
`;

    let stageInstructions = '';
    if (stage === 'call_active') {
      stageInstructions = `
ACTIVE ROLEPLAY PRACTICE CALL IN PROGRESS:
- You are strictly roleplaying as the prospect: ${currentBusiness?.ownerName || 'Hank'}, owner of ${currentBusiness?.name || 'Miller HVAC'}.
- You are a busy, skeptical contractor/owner pulling up to a job site.
- Respond realistically in character in 1-2 conversational sentences.
`;
    } else if (stage === 'script_building') {
      stageInstructions = `
YOU ARE COACH MARCUS VANCE:
An aggressive, practical B2B Cold Calling Coach specializing in blue-collar trade contractors (general contractors, residential remodelers, HVAC, plumbing, excavation).
- Critique opening hooks ruthlessly: cut corporate fluff, eliminate weak telemarketer greetings like "How are you today?", and enforce high-converting pattern interrupts using the 20-second contract.
- Provide concise, lethal rebuttals tailored to local blue-collar jobsite objections (e.g., lack of cell service in the hollows, reliance on Sunday legal pad quotes, receipts faded under truck seats, buying on account at Ferguson, machine operators with muddy work gloves).
- ALWAYS provide actionable, spoken lines enclosed in quotation marks so the user can click to apply them directly into their script with one click.
`;
    } else {
      stageInstructions = `
MENTORSHIP & DISCOVERY CONVERSATION (NOT A PRACTICE PITCH):
- You are Marcus, a warm, energetic, experienced sales mentor sitting across from the rep.
- TALK WITH THE USER LIKE A REAL HUMAN MENTOR, NOT A ROBOT!
- CRITICAL: DO NOT treat ordinary user sentences as a pitch! If they say "I sell software" or "I'm calling plumbers", DO NOT critique them as if they just delivered a bad cold call pitch! Instead, acknowledge what they said with genuine interest, share a quick relatable mentor insight, and have a two-way dialogue.
- If we haven't established what they sell, ask them.
- If we haven't established who they target or their biggest hurdle, ask them.
- If what they sell and who they target are clear, ask if they are ready to run a short practice pitch drill to establish their baseline, or if they want to brainstorm their hook first.
- Keep the tone encouraging, conversational, direct, and empathetic. No markdown asterisks or bullet dumps in conversational speech.
`;
    }

    const prompt = `
${stageInstructions}

${memoryDossier}

Target Prospect Context:
Name: ${currentBusiness?.ownerName || currentBusiness?.target || 'West Virginia Contractor'}
Company: ${currentBusiness?.name || currentBusiness?.companyName || 'Target Business'}
Industry: ${currentBusiness?.industry || 'Construction & Trades'}
City: ${currentBusiness?.city || 'West Virginia'}
Bleeding Neck Pain: ${currentBusiness?.bleedingNeckPain || currentBusiness?.problem || 'Losing money on unbilled materials and change orders'}

Recent Conversation History:
${conversationHistory}

Latest User Input:
"${userMessage}"

Marcus, you have full power to take real actions on the application:
1. When the user asks to save a script or add it to the scripts page (/saved-scripts), or you finalize a pitch, append:
\`\`\`json
{ "action": "saveScriptToScriptsPage", "params": { "title": "${currentBusiness?.name ? currentBusiness.name + ' Pitch' : 'Contractor Cold Call Pitch'}" } }
\`\`\`
2. When the user asks to pull up or load a script, append:
\`\`\`json
{ "action": "pullUpScript", "params": { "query": "${userMessage.replace(/"/g, '')}" } }
\`\`\`
3. When the user wants to practice ("let's practice", "open practice session"), append:
\`\`\`json
{ "action": "openPracticeSession", "params": {} }
\`\`\`
4. When the user wants to navigate to another page (recordings, dashboard, saved scripts, settings), append:
\`\`\`json
{ "action": "navigateToPage", "params": { "page": "${userMessage.replace(/"/g, '')}" } }
\`\`\`
5. When building or updating the script based on conversation (hook, problem, value, closingAsk), append:
\`\`\`json
{ "action": "updateActiveScript", "params": { "hook": "...", "problem": "...", "value": "...", "closingAsk": "..." } }
\`\`\`

Generate your natural, spoken-friendly response:
`;

    // Multi-model cascade: Prioritize gemini-3.8-flash for modern features and tool calling
    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let generatedText = '';
    const effectiveGenAi = getGenAI(activeKey);

    for (const modelName of modelsToTry) {
      try {
        const response = await effectiveGenAi.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            systemInstruction: stage === 'script_building' 
              ? 'You are Marcus Vance, an aggressive, practical B2B Cold Calling Coach specializing in blue-collar trade contractors. Provide punchy lines in quotation marks.'
              : 'You are Marcus, an elite, warm, authentic Human Sales Mentor. You speak naturally, conversationally, and empathetically like a supportive sales director.',
            temperature: 0.7,
          }
        });
        if (response?.text?.trim()) {
          generatedText = response.text.trim();
          break;
        }
      } catch (modelErr: any) {
        console.warn(`Model ${modelName} notice:`, modelErr.message);
      }
    }

    res.json({
      text: generatedText || getFallbackReply()
    });
  } catch (error: any) {
    console.warn('Gemini coach API notice, using intelligent fallback:', error.message);
    res.json({ text: getFallbackReply() });
  }
});

// 2. Screen Vision & Co-Browsing Intel API (Agent sees user's screen!)
app.post('/api/gemini/screen-analyze', async (req, res) => {
  const fallbackAnalysis = `### 🔍 Screen Intel Detected:
• Identified target prospect company and regional service footprint.
• Located key decision maker profile and public customer feedback.

### 🤝 Personalization & Commonalities Principle:
Remember: **People bond over similarities and feel connected to people who share the same likes and beliefs** (just like recommending TV shows to close friends). When you call, reference their specific city, trade nuances, and regional cues.

### 🎯 Recommended Opening Line:
*"Hey Hank, Alex here. I noticed you guys have been covering the Austin north sector since 1998. Give me 20 seconds before you head into your next job site: if this isn't directly relevant to stopping unbilled change orders on your vans, tell me to jump in a lake. Fair?"*

### 💡 Coach Advice:
Deliver this in a calm, confident, peer-to-peer tone. Don't rush or sound like an over-excited telemarketer.`;

  try {
    const { imageBase64 } = req.body;

    if (!isApiKeyConfigured || !imageBase64) {
      return res.json({ analysis: fallbackAnalysis });
    }

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `
You are the AI Sales Co-Pilot looking at the sales rep's active screen in real-time.
Analyze what is visible on this screen (such as a prospect's website, LinkedIn profile, Google reviews, company 'About Us' page, or CRM lead entry).

Your goal:
1. Extract 3-4 KEY PERSONALIZATION DETAILS & SIMILARITIES:
   - Identify shared similarities (geography, language, hometown, sports, schooling, shared experiences).
   - Identify recent company events, customer reviews, or specific pains mentioned.
2. Teach the user WHY this works using the Friendship/Commonalities principle:
   - Explain how bonding over similarities builds instant connection.
3. Formulate a natural, authentic 1-2 sentence opening hook that blends these details without sounding dumb, gimmicky, or overly technical.

Return your response in clean markdown format:
### 🔍 Screen Intel Detected
(List the key markers found)
### 🤝 Personalization & Similarity Angle
(Explain the bond/commonality)
### 🎯 Recommended Opening Line
(Authentic, natural wording)
### 💡 Coach Advice
(Field tip on how to deliver it smoothly)
`;

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Data,
      },
    };

    const textPart = {
      text: prompt,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [imagePart, textPart] },
    });

    res.json({
      analysis: response.text || fallbackAnalysis
    });
  } catch (error: any) {
    console.warn('Gemini screen analysis notice, using fallback:', error.message);
    res.json({ analysis: fallbackAnalysis });
  }
});

// 3. Web & Prospect Research Intel API (Personalization & Commonalities Engine)
app.post('/api/gemini/research-prospect', async (req, res) => {
  const { query, website, companyName, city, trade } = req.body;
  const name = companyName || website || query || 'Apex Commercial Solutions';
  const c = city || 'Dallas, TX';

  const fallbackIntel = {
    companyName: name,
    decisionMaker: 'Dave Campbell',
    role: 'Owner & General Contractor',
    city: c,
    personalizationMarkers: [
      `Local ${c} presence and established trade reputation`,
      'Fleet of dispatched service trucks serving regional clients',
      'Recent customer reviews emphasizing fast emergency turnaround'
    ],
    friendshipAnalogy: 'Bonding over commonalities: Most people bond over similarities and feel connected to people who share the same likes and beliefs (like recommending favorite shows to friends). Match their regional dialect, Austin/Dallas references, and trade background.',
    dumbVsTechnicalComparison: {
      dumb: 'Are you the man who signs the software checks?',
      overlyTechnical: 'We deploy an automated telemetry pipeline via microservices architecture.',
      sweetSpot: 'Dave, are your techs handwriting extra copper on paper tickets that get lost under truck seats?'
    },
    bleedingNeckPain: 'Losing thousands every month on field technician unbilled materials and paperwork delays',
    branchingScript: {
      opener: `Hey Dave, Alex here. I know you weren't expecting my call and you're probably in your truck, but give me 20 seconds: if this isn't relevant to stopping unbilled materials on your vans, tell me to jump in a lake. Fair?`,
      painHook: 'When your technicians finish an emergency dispatch on-site, how do you guarantee all extra copper and labor hours get billed before they drive off?',
      branches: [
        { objection: "Busy in my truck", response: "I know you're busy running calls. Are your techs losing paper slips under truck seats? If not, I'll hang up right now." },
        { objection: "Just send an email", response: "I could send an email, but your inbox is slammed with vendor pitches. Give me 20 seconds right now..." },
        { objection: "50% deposit pushback", response: "The 50% deposit locks in your sprint, and we milestone-stage it: you inspect Milestone 1 before releasing the second half." }
      ],
      closingAsk: "Let's do 10 minutes tomorrow morning at 8:30 AM before your guys roll out. What's your direct cell?"
    }
  };

  try {
    if (!isApiKeyConfigured) {
      return res.json(fallbackIntel);
    }

    const prompt = `
You are an expert Sales Intelligence Researcher.
Analyze the target business or query:
Company / Website: ${name}
Location: ${c}
Trade: ${trade || 'Commercial / Residential Services'}

Provide a rich Sales Intelligence Dossier focused on PERSONALIZATION and COMMONALITY BONDING:
1. Decision Maker Profile & Probable Persona.
2. 3 Specific Personalization Anchors (Local sports/neighborhoods, native language/region, typical daily bottlenecks).
3. The Friendship & Commonalities Analogy: Show how finding common ground (like recommending a shared TV show or shared background) disarms resistance.
4. "Goldilocks Vocabulary" Guide: Provide examples of:
   - What sounds DUMB / amateurish (e.g., "Are you the man who signs the checks?")
   - What sounds TOO TECHNICAL / robotic (e.g., "We leverage synergistic multi-tenant SaaS architectures")
   - The PERFECT NATURAL SWEET SPOT (e.g., "Hank, are your guys in the trucks handwriting extra copper on paper tickets that get lost under the seat?")
5. Suggested 5-Step Dynamic Script with 3 objection branches.

Return as JSON matching this format:
{
  "companyName": "...",
  "decisionMaker": "...",
  "role": "...",
  "city": "...",
  "personalizationMarkers": ["marker 1", "marker 2", "marker 3"],
  "friendshipAnalogy": "...",
  "dumbVsTechnicalComparison": {
    "dumb": "...",
    "overlyTechnical": "...",
    "sweetSpot": "..."
  },
  "bleedingNeckPain": "...",
  "branchingScript": {
    "opener": "...",
    "painHook": "...",
    "branches": [
      { "objection": "Busy in my truck", "response": "..." },
      { "objection": "Just send an email", "response": "..." },
      { "objection": "50% deposit pushback", "response": "..." }
    ],
    "closingAsk": "..."
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    let data = {};
    try {
      data = JSON.parse(response.text || '{}');
    } catch {
      data = fallbackIntel;
    }

    res.json(data);
  } catch (error: any) {
    console.warn('Gemini research API notice, using fallback:', error.message);
    res.json(fallbackIntel);
  }
});

// 4. Server-Side TTS using Gemini Live (gemini-3.8-flash-lite-tts) with Deepgram Aura Fallback
app.post('/api/gemini/tts', async (req, res) => {
  const { text, voiceName = 'Fenrir', gender = 'male', personaKey = 'marcus' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required for TTS' });
  }

  const customApiKey = (req.headers['x-gemini-api-key'] || req.body?.geminiApiKey) as string;
  const effectiveKey = getValidGeminiKey(customApiKey);

  // 1. Primary: Gemini Live Neural TTS (Studio Quality, Natural Human Voice)
  try {
    const genAiClient = getGenAI(effectiveKey);
    const effectiveVoice = voiceName || (gender === 'female' ? 'Aoede' : 'Fenrir');
    const response = await genAiClient.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 1500),
              speechMetadata: {
                style: gender === 'female' 
                  ? 'Natural, articulate, warm American female voice with human breath and natural cadence' 
                  : 'Natural, authentic, confident American male voice with human breath and natural cadence'
              }
            }
          ]
        }
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: effectiveVoice }
          }
        }
      }
    });

    const inlineAudio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const base64Audio = inlineAudio?.data;
    if (base64Audio) {
      const rawAudio = Buffer.from(base64Audio, 'base64');
      const wavAudio = pcm16ToWav(rawAudio, 24000, 1);
      return res.json({ audioBase64: wavAudio.toString('base64'), mimeType: 'audio/wav', engine: 'gemini-live', sourceMimeType: inlineAudio?.mimeType || 'audio/L16;rate=24000' });
    }
  } catch (err: any) {
    console.warn('Gemini Live TTS notice, trying Deepgram fallback:', err?.message || err);
    // Continue to Tier 2 Deepgram
  }

  // 2. Secondary: Deepgram Aura Fallback Voice Agent (Matches gender of avatar)
  const customDgKey = (req.headers['x-deepgram-api-key'] || req.body?.deepgramApiKey) as string;
  const effectiveDgKey = (customDgKey && typeof customDgKey === 'string' && customDgKey.trim().length > 10)
    ? customDgKey.trim()
    : deepgramApiKey;

  if (effectiveDgKey && effectiveDgKey.length > 10 && !effectiveDgKey.includes('YOUR_')) {
    try {
      const deepgramModel = gender === 'female'
        ? (personaKey === 'sarah' ? 'aura-asteria-en' : 'aura-stella-en')
        : (personaKey === 'hank' ? 'aura-arcas-en' : 'aura-orion-en');

      const dgRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(deepgramModel)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${effectiveDgKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text.slice(0, 1500) })
      });

      if (dgRes.ok) {
        const buffer = Buffer.from(await dgRes.arrayBuffer());
        return res.json({
          audioBase64: buffer.toString('base64'),
          mimeType: 'audio/mp3',
          engine: 'deepgram-fallback'
        });
      }
    } catch (_) {
      // Intentionally silent
    }
  }

  // 3. Tertiary: Browser speech synthesis fallback
  res.json({ fallback: true, message: 'Using natural browser speech synthesis' });
});

// 5. Deepgram Aura Fallback TTS (Ultra-Human Realistic Voices)
app.post('/api/deepgram/tts', async (req, res) => {
  try {
    const { text, model = 'aura-orion-en' } = req.body;

    if (!isDeepgramConfigured) {
      return res.json({ fallback: true, message: 'Deepgram API key not configured on server' });
    }

    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const dgRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: text.slice(0, 1500) })
    });

    if (!dgRes.ok) {
      return res.json({ fallback: true, message: `Deepgram status ${dgRes.status}` });
    }

    const arrayBuffer = await dgRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');
    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/mp3'
    });
  } catch (error: any) {
    res.json({ fallback: true, message: 'Deepgram TTS fallback' });
  }
});

// 6. Deepgram Agents Endpoint - Retrieves Agent IDs & Projects
app.get('/api/deepgram/agents', async (req, res) => {
  try {
    const key = (req.headers.authorization?.replace('Token ', '').replace('Bearer ', '') || deepgramApiKey || '').trim();
    if (!key) {
      return res.status(400).json({ error: 'No Deepgram API key available' });
    }

    const projRes = await fetch('https://api.deepgram.com/v1/projects', {
      headers: { 'Authorization': `Token ${key}` }
    });

    if (!projRes.ok) {
      return res.status(projRes.status).json({ error: 'Failed to fetch projects from Deepgram' });
    }

    const projData = await projRes.json() as any;
    const projects = projData.projects || [];
    const allAgents: any[] = [];
    const primaryProjectId = projects[0]?.project_id || '1add87dc-1582-4d89-9a7d-d2cee44bf542';

    for (const proj of projects) {
      try {
        const agentRes = await fetch(`https://api.deepgram.com/v1/projects/${proj.project_id}/agents`, {
          headers: { 'Authorization': `Token ${key}` }
        });
        if (agentRes.ok) {
          const agents = await agentRes.json() as any[];
          for (const a of agents) {
            allAgents.push({
              agent_uuid: a.agent_uuid,
              projectId: proj.project_id,
              projectName: proj.name,
              title: a.metadata?.title || 'Voice Agent',
              config: typeof a.config === 'string' ? JSON.parse(a.config) : a.config
            });
          }
        }
      } catch (err) {
        console.warn(`Could not fetch agents for project ${proj.project_id}:`, err);
      }
    }

    const recommended = allAgents.find(a => 
      a.title?.toLowerCase().includes('scriptmaster') || 
      a.agent_uuid === 'fd7da684-2c9c-433d-ab0c-1ed2f8b061e4'
    ) || allAgents[0];

    res.json({
      success: true,
      projectId: primaryProjectId,
      projects,
      agents: allAgents,
      recommendedAgentId: recommended?.agent_uuid || 'fd7da684-2c9c-433d-ab0c-1ed2f8b061e4',
      recommendedAgentTitle: recommended?.title || 'ScriptMaster AI Sales Coach & Prospect Simulator'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error querying Deepgram agents' });
  }
});

// 7. Test Deepgram Agent ID Endpoint
app.post('/api/deepgram/agent/test', async (req, res) => {
  const startTime = Date.now();
  try {
    const key = (req.headers.authorization?.replace('Token ', '').replace('Bearer ', '') || deepgramApiKey || '').trim();
    if (!key) {
      return res.status(400).json({ success: false, error: 'Deepgram API key not provided' });
    }

    const { 
      agentId = 'fd7da684-2c9c-433d-ab0c-1ed2f8b061e4', 
      projectId = '1add87dc-1582-4d89-9a7d-d2cee44bf542' 
    } = req.body || {};

    // 1. Fetch agent configuration from Deepgram
    const agentRes = await fetch(`https://api.deepgram.com/v1/projects/${encodeURIComponent(projectId)}/agents/${encodeURIComponent(agentId)}`, {
      headers: { 'Authorization': `Token ${key}` }
    });

    if (!agentRes.ok) {
      return res.status(agentRes.status).json({
        success: false,
        error: `Deepgram Agent verification failed (HTTP ${agentRes.status}). Check Agent UUID.`
      });
    }

    const agentData = await agentRes.json() as any;
    let parsedConfig: any = {};
    try {
      parsedConfig = typeof agentData.config === 'string' ? JSON.parse(agentData.config) : (agentData.config || {});
    } catch (_) {}

    const agentTitle = agentData.metadata?.title || 'ScriptMaster Voice Agent';
    const voiceModel = parsedConfig.speak?.provider?.model || 'aura-2-jupiter-en';
    const greetingText = parsedConfig.greeting || 'Hey there! Ready to run your cold call drill or tackle an objection?';
    const listenModel = parsedConfig.listen?.provider?.model || 'flux-general-en';

    // 2. Synthesize agent greeting audio using agent's configured Aura voice
    const ttsRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(voiceModel)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: greetingText })
    });

    let audioBase64 = '';
    if (ttsRes.ok) {
      const buffer = Buffer.from(await ttsRes.arrayBuffer());
      audioBase64 = buffer.toString('base64');
    }

    const latencyMs = Date.now() - startTime;

    res.json({
      success: true,
      agentId,
      projectId,
      agentTitle,
      voiceModel,
      listenModel,
      greeting: greetingText,
      latencyMs,
      audioBase64,
      mimeType: 'audio/mp3',
      message: `Deepgram Agent "${agentTitle}" verified successfully (${latencyMs}ms)!`
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to verify Deepgram Voice Agent'
    });
  }
});

// Setup Vite middleware in dev or serve static files
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProd = hasDist && (process.env.NODE_ENV === 'production' || process.env.K_SERVICE !== undefined);

  if (!isProd) {
    console.log('Starting Vite server in middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production build from dist...');
    app.use(express.static(distPath));
    // In Express 5, catch-all must not use '*' directly
    app.use((_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
