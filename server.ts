import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '15mb' }));

// Shared server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const isApiKeyConfigured = Boolean(apiKey && apiKey.trim().length > 15 && !apiKey.includes('YOUR_'));
const deepgramApiKey = process.env.DEEPGRAM_API_KEY || '';
const isDeepgramConfigured = Boolean(deepgramApiKey && deepgramApiKey.trim().length > 10 && !deepgramApiKey.includes('YOUR_'));

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// 1. Coach Dialogue & Reasoning API
app.post('/api/gemini/coach', async (req, res) => {
  const { 
    systemPrompt, 
    messages, 
    userMessage = '', 
    currentBusiness, 
    stage,
    userMemory = {}
  } = req.body;

  const firstName = currentBusiness?.ownerName ? currentBusiness.ownerName.split(' ')[0] : 'Hank';
  const company = currentBusiness?.name || 'Miller HVAC';
  const text = (userMessage || '').toLowerCase();
  const userName = userMemory?.userName || 'there';
  const userProduct = userMemory?.productOrService || '';
  const userTarget = userMemory?.targetProspect || '';
  const userObjections = (userMemory?.objectionsToMaster || []).join(', ');

  // Intelligent memory-aware fallback if API key is not ready or fails
  const getFallbackReply = () => {
    // If roleplaying as prospect during active call
    if (stage === 'call_active') {
      if (text.includes('deposit') || text.includes('50%')) {
        return `Hold on, ${userName !== 'there' ? userName : ''}. 50% upfront before you've delivered working software? I've been burned by agencies before. Why shouldn't I pay when it's done?`;
      }
      if (text.includes('20 second') || text.includes('jump in a lake') || text.includes('quick')) {
        return `(Chuckles) Alright, you got 20 seconds before I head into this job site. What's this about?`;
      }
      return `Look, my guys lose paper tickets all the time and unbilled materials cost us thousands. What exactly does your system do about that?`;
    }

    if (text.includes('script') || text.includes('build') || text.includes('write')) {
      const subject = userProduct ? userProduct : company;
      return `Let's build this dynamic branching script for **${subject}**!\n\n1. **Pattern Interrupt:** "Hey ${firstName}, ${userName !== 'there' ? userName : 'Alex'} here. Give me 20 seconds before you head into your next job site: if this isn't relevant to stopping unbilled materials on your vans, tell me to jump in a lake. Fair?"\n2. **Bleeding Neck Pain:** "When your technicians finish an emergency dispatch on-site, how do you guarantee all extra copper, freon, and labor hours get billed before they drive off?"\n3. **Branch 1 (Busy):** "I know you're busy running calls. Are your techs losing paper slips under truck seats? If not, I'll hang up right now."\n4. **Branch 2 (Email):** "I could send an email, but your inbox is slammed. Give me 20 seconds right now..."\n5. **Branch 3 (50% Deposit):** "The 50% deposit locks in your sprint, and we milestone-stage it: you inspect Milestone 1 before releasing the second half."\n\nI've generated this interactive dynamic branching script below for you to inspect and drill!`;
    }

    if (text.includes('busy') || text.includes('no time')) {
      return `I hear you, ${userName}! When prospects say "I'm too busy", it's an automatic reflex. Don't fight it—agree and pivot:\n*"I know you're slammed—that's exactly why I called. Give me 20 seconds: if this doesn't help you stop unbilled change orders, I'll hang up right now. Deal?"*\n\nTap my avatar or the mic to practice delivering that line to me!`;
    }

    if (text.includes('email') || text.includes('send me')) {
      return `Great objection to tackle, ${userName}. "Just send me an email" is the #1 brush-off. If you say yes, you're dead in spam.\n\nInstead say: *"I could email you, but your inbox is buried with vendor spam. Give me 30 seconds: if you don't find this valuable, you can hang up on me right now."*\n\nTap my avatar and try delivering that with confidence!`;
    }

    if (userProduct || text.includes('sell') || text.includes('calling')) {
      return `Got it, ${userName}! I've locked in what you're working on: **${userProduct || 'your product'}**${userTarget ? ` pitched to **${userTarget}**` : ''}.\n\nWhen cold calling in this space, remember the **Commonalities & Friendship Principle**: people bond over shared background, regional familiarity, and everyday language—not corporate buzzwords.\n\nTap my avatar or mic right now and deliver your 15-second opening pitch. Let's calibrate your tone!`;
    }

    return `Got it, ${userName}! I've noted: *"${userMessage}"*.\n\n• **Direct Feedback:** Keep your delivery punchy, peer-to-peer, and avoid sounding like a telemarketer.\n• **The Commonalities Principle:** People bond over similarities (like recommending favorite TV shows). Weave in shared trade or regional details to disarm defenses instantly.\n\nTap my avatar anytime to speak to me, or dial our live practice call!`;
  };

  try {
    if (!isApiKeyConfigured) {
      return res.json({ text: getFallbackReply() });
    }

    const conversationHistory = (messages || []).map((m: any) => 
      `${m.speaker || (m.hat === 'prospect' ? 'Prospect' : 'Coach')}: ${m.text}`
    ).join('\n');

    const memoryDossier = `
User Memory & Profile:
Name: ${userName}
Product / Service Sold: ${userProduct || 'Not specified yet'}
Target Prospect Persona: ${userTarget || currentBusiness?.ownerName || 'Business Owner'}
Known Stated Objections: ${userObjections || 'General cold calling'}
User's Stated Goals: ${(userMemory?.goals || []).join('; ') || 'Mastering cold calls'}
`;

    const prompt = `
${systemPrompt || 'You are an elite, cut-the-BS AI Sales Coach & Prospect Simulator.'}

${memoryDossier}

Target Prospect Context:
Name: ${currentBusiness?.ownerName || 'Prospect'}
Company: ${currentBusiness?.name || 'Target Business'}
Industry: ${currentBusiness?.industry || 'Trade'}
City: ${currentBusiness?.city || 'Local'}
Bleeding Neck Pain: ${currentBusiness?.bleedingNeckPain || 'Losing money on unbilled materials and change orders'}

Recent Conversation Transcript:
${conversationHistory}

Latest User Input:
${userMessage}

CRITICAL INSTRUCTIONS:
1. You MUST remember and explicitly reference what the user said, including their name (${userName}), product/industry (${userProduct || 'their offering'}), and specific objections.
2. If roleplaying as the prospect, stay in character with realistic dialogue (1-2 sentences).
3. If speaking as Coach, provide punchy, high-impact, actionable guidance. Prompt them to speak back to you via the avatar.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt || 'You are an authentic, direct Sales Coach and Prospect Simulator with deep conversational memory.',
        temperature: 0.7,
      }
    });

    res.json({
      text: response.text || getFallbackReply()
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

  // 1. Primary: Gemini Live Neural TTS
  if (isApiKeyConfigured) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 400),
                speechMetadata: {
                  style: gender === 'female' 
                    ? 'Clear, articulate American female executive delivery' 
                    : 'Clear, authentic, confident American male coach delivery'
                }
              }
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName }
            }
          }
        }
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ audioBase64: base64Audio, mimeType: 'audio/wav', engine: 'gemini-live' });
      }
    } catch (_) {
      // Intentionally silent: seamlessly proceed to Deepgram fallback
    }
  }

  // 2. Secondary: Deepgram Aura Fallback Voice Agent (Matches gender of avatar)
  if (isDeepgramConfigured) {
    try {
      const deepgramModel = gender === 'female'
        ? (personaKey === 'sarah' ? 'aura-asteria-en' : 'aura-stella-en')
        : (personaKey === 'hank' ? 'aura-arcas-en' : 'aura-orion-en');

      const dgRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(deepgramModel)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text.slice(0, 450) })
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
      // Intentionally silent: proceed to browser speech fallback
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
      body: JSON.stringify({ text: text.slice(0, 450) })
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

// Setup Vite middleware in dev or serve static files
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
