import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer, loadEnv } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Modality, Type, ThinkingLevel, LiveServerMessage } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load project-root .env for Express + WebSocket routes
const loadedEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
Object.assign(process.env, loadedEnv);

const app = express();
const cliPortIdx = process.argv.indexOf('--port');
const port =
  cliPortIdx !== -1 && process.argv[cliPortIdx + 1]
    ? parseInt(process.argv[cliPortIdx + 1], 10)
    : process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

// Allow microphone, camera, and screen share (display-capture) inside frames
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=*, camera=*, display-capture=*, autoplay=*');
  next();
});

app.use(express.json({ limit: '25mb' }));

function getCandidateGeminiKeys(explicitKey?: string): string[] {
  // Prioritize server-side GEMINI_API_KEY and VITE_GEMINI_API_KEY ahead of any cached client key,
  // and filter out placeholder values like MY_GEMINI_API_KEY or YOUR_API_KEY.
  const raw = [
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    explicitKey,
  ];
  const valid: string[] = [];
  for (const k of raw) {
    const trimmed = typeof k === 'string' ? k.trim() : '';
    const upper = trimmed.toUpperCase();
    if (
      trimmed.length > 20 &&
      !upper.includes('YOUR_') &&
      !upper.includes('MY_GEMINI') &&
      !upper.includes('PLACEHOLDER') &&
      !valid.includes(trimmed)
    ) {
      valid.push(trimmed);
    }
  }
  return valid;
}

function getValidGeminiKey(explicitKey?: string): string {
  return getCandidateGeminiKeys(explicitKey)[0] || '';
}

const serverApiKey = getValidGeminiKey();
const isApiKeyConfigured = Boolean(serverApiKey);
const deepgramApiKey = process.env.DEEPGRAM_API_KEY || '';
const isDeepgramConfigured = Boolean(
  deepgramApiKey && deepgramApiKey.trim().length > 10 && !deepgramApiKey.includes('YOUR_')
);

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
      },
    },
  });
}

function isSafePublicHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.startsWith('169.254.')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

app.get('/api/debug/keys', (_req, res) => {
  res.json({
    hasValidGeminiKey: Boolean(getValidGeminiKey()),
    geminiKeyLength: getValidGeminiKey().length,
    isApiKeyConfigured,
    deepgramKeyLength: (process.env.DEEPGRAM_API_KEY || '').length,
  });
});

// ============================================================================
// 1. Open Coach Chat & Strategy Dialogue API (Text + Career Dossier Aware)
// ============================================================================
app.post('/api/gemini/coach', async (req, res) => {
  const {
    systemPrompt,
    messages = [],
    userMessage = '',
    currentBusiness,
    stage,
    userMemory = {},
    careerDossier = null,
    adaptiveProfile = null,
    geminiApiKey: clientKey,
  } = req.body || {};

  const activeKey = getValidGeminiKey(clientKey);
  if (!activeKey) {
    return res.status(503).json({
      error: 'Gemini API key is not configured on the server. Check Settings > Secrets.',
    });
  }

  try {
    const conversationHistory = (messages || [])
      .slice(-16)
      .map((m: any) => `${m.speaker || (m.hat === 'prospect' ? 'Prospect' : 'Coach')}: ${m.text}`)
      .join('\n');

    const dossierBlock = careerDossier
      ? `
USER CAREER & INTERVIEW DOSSIER (LIVE CONTEXT):
- Candidate Role Target: ${careerDossier.candidateTitle || 'AI Software Engineer (Application Developer / Solutions Architect)'}
- Proof Style: Project-based architecture & real production systems (NOT LeetCode trivia)
- Target Job Description: ${careerDossier.jobDescription?.roleTitle ? `${careerDossier.jobDescription.roleTitle} at ${careerDossier.jobDescription.companyName || 'Target Company'}` : 'Not uploaded yet'}
${careerDossier.jobDescription?.rawText ? `  JD Excerpt: ${careerDossier.jobDescription.rawText.slice(0, 2200)}` : ''}
- Uploaded Resume: ${careerDossier.resume?.fileName || (careerDossier.resume?.rawText ? 'Pasted Resume' : 'Not uploaded yet')}
${careerDossier.resume?.rawText ? `  Resume Excerpt: ${careerDossier.resume.rawText.slice(0, 2200)}` : ''}
- Portfolio & Live Project URLs:
${(careerDossier.portfolioUrls || []).map((u: any) => `  * ${u.label || 'Project'}: ${u.url}${u.summary ? ` — ${u.summary}` : ''}`).join('\n') || '  (None added yet)'}
- KRECHET Academy Pitch Offer: ${careerDossier.krechet?.tagline || 'KRECHET Academy teaches digital marketing through hands-on simulations and interactive team workshops for agencies.'}
`
      : '';

    const weakAreasBlock = adaptiveProfile?.weakAreas?.length
      ? `
LEARNED WEAK AREAS FROM PAST SESSIONS (COACH AWARENESS):
${adaptiveProfile.weakAreas.map((w: any) => `- ${w.skill} (score: ${w.score}/100): ${w.note}`).join('\n')}
`
      : '';

    const defaultSystem =
      stage === 'open_coach'
        ? `You are Marcus Vance, an elite, grounded, candid Career & Executive Sales Coach who speaks directly with the user outside the interview and sales sandboxes.
The user is an AI Software Engineer applying for Application Developer and Solutions Architect roles using project-based proof (real systems, production architecture, business outcomes—not LeetCode puzzles), AND is also building and pitching KRECHET Academy (digital marketing education via interactive simulations and workshops) to marketing agencies via video calls and screen share.

COACHING RULES:
- Talk like a sharp, supportive, straight-talking human mentor—never robotic, never generic filler.
- You can discuss ANYTHING the user brings up: dissecting an uploaded Job Description, tightening Resume / project stories, rehearsing architecture trade-offs, refining their KRECHET Academy agency pitch, practicing objections, or working through interview anxiety.
- Reference their actual uploaded Resume, Job Description, Portfolio URLs, and learned weak areas whenever relevant.
- Keep responses focused, crisp, and actionable. Use clear short paragraphs or crisp bullet points when breaking down feedback or rewrites.`
        : systemPrompt ||
          'You are Marcus Vance, an elite Sales & Interview Coach. Be direct, practical, warm, and conversational.';

    const prompt = `${dossierBlock}${weakAreasBlock}
${currentBusiness ? `Context Target: ${currentBusiness.ownerName || currentBusiness.name || ''} (${currentBusiness.industry || ''})` : ''}
${userMemory?.userName ? `User Name: ${userMemory.userName}` : ''}

Recent Conversation:
${conversationHistory || '(Start of conversation)'}

Latest User Message:
"${userMessage}"

Respond directly and helpfully as their coach.`;

    const effectiveGenAi = getGenAI(activeKey);
    const response = await effectiveGenAi.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: defaultSystem,
      },
    });

    const text = (response.text || '').trim();
    if (!text) {
      return res.status(502).json({ error: 'Model returned an empty response. Please try again.' });
    }
    res.json({ text });
  } catch (error: any) {
    console.error('Gemini coach API error:', error?.message || error);
    res.status(502).json({
      error: error?.message || 'Unable to reach Gemini right now. Please try again.',
    });
  }
});

// ============================================================================
// 2. Document Upload Parser (Resume & Job Description — PDF, TXT, MD, Image)
// ============================================================================
app.post('/api/gemini/parse-document', async (req, res) => {
  const { fileName = 'document.txt', mimeType = 'text/plain', base64Data = '', rawText = '', docType = 'resume' } = req.body || {};
  const activeKey = getValidGeminiKey();

  try {
    let extractedText = (rawText || '').trim();

    if (!extractedText && base64Data) {
      const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
      if (mimeType.startsWith('text/') || /\.(txt|md|json|csv)$/i.test(fileName)) {
        extractedText = Buffer.from(cleanBase64, 'base64').toString('utf-8').trim();
      } else if (activeKey) {
        const genAi = getGenAI(activeKey);
        const prompt =
          docType === 'job_description'
            ? 'Extract the full readable text from this Job Description document accurately. Preserve role title, company name, responsibilities, required skills, and architecture/experience criteria.'
            : 'Extract the full readable text from this Resume/CV accurately. Preserve candidate name, title, work history, projects, tech stack, metrics, and URLs.';
        const response = await genAi.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              { inlineData: { mimeType: mimeType || 'application/pdf', data: cleanBase64 } },
              { text: prompt },
            ],
          },
        });
        extractedText = (response.text || '').trim();
      }
    }

    if (!extractedText) {
      return res.status(400).json({ error: 'Could not extract text from the uploaded file. Try a PDF, TXT, or Markdown file, or paste the text directly.' });
    }

    // Also extract structured metadata using gemini-4-hydrogen when configured
    let metadata: any = {
      summary: extractedText.slice(0, 320),
      roleTitle: '',
      companyName: '',
      keySkills: [],
      notableProjects: [],
      keyRequirements: [],
    };

    if (activeKey) {
      try {
        const genAi = getGenAI(activeKey);
        const metaPrompt =
          docType === 'job_description'
            ? `Analyze this Job Description and return structured JSON with roleTitle, companyName, a 2-sentence summary, keySkills (up to 8), and keyRequirements (up to 6 concrete requirements an interviewer will probe in a project-based interview).\n\n${extractedText.slice(0, 8000)}`
            : `Analyze this Resume and return structured JSON with roleTitle (candidate headline), companyName (most recent employer or independent), a 2-sentence summary, keySkills (up to 10), and notableProjects (up to 6 specific projects/systems with impact that an interviewer should ask deep questions about).\n\n${extractedText.slice(0, 8000)}`;

        const metaRes = await genAi.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: metaPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                roleTitle: { type: Type.STRING },
                companyName: { type: Type.STRING },
                summary: { type: Type.STRING },
                keySkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                notableProjects: { type: Type.ARRAY, items: { type: Type.STRING } },
                keyRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
        });
        const parsed = JSON.parse((metaRes.text || '{}').trim());
        metadata = { ...metadata, ...parsed };
      } catch (metaErr: any) {
        console.warn('Metadata extraction notice:', metaErr?.message);
      }
    }

    res.json({
      fileName,
      docType,
      rawText: extractedText.slice(0, 20000),
      ...metadata,
    });
  } catch (error: any) {
    console.error('Document parse error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to parse document.' });
  }
});

// ============================================================================
// 3. Portfolio / GitHub / Live Project URL Context Fetcher
// ============================================================================
app.post('/api/gemini/fetch-url-context', async (req, res) => {
  const { url = '', label = '' } = req.body || {};
  const trimmed = String(url).trim();
  const normalizedUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  if (!isSafePublicHttpUrl(normalizedUrl)) {
    return res.status(400).json({ error: 'Please enter a valid public http(s) URL.' });
  }

  let pageSnippet = '';
  let pageTitle = label || normalizedUrl;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    const fetchRes = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScriptMasterDossierBot/1.0)',
        Accept: 'text/html,application/json,text/plain,*/*',
      },
    });
    clearTimeout(timeout);

    if (fetchRes.ok) {
      const html = await fetchRes.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch?.[1]) {
        pageTitle = label || titleMatch[1].trim().slice(0, 90);
      }
      const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
      const stripped = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      pageSnippet = [metaDesc, stripped].filter(Boolean).join(' — ').slice(0, 4500);
    }
  } catch (err: any) {
    console.warn('URL fetch notice:', err?.message);
  }

  let summary = pageSnippet
    ? pageSnippet.slice(0, 260)
    : `Linked credential/project URL (${normalizedUrl}) added to interviewer dossier.`;

  const activeKey = getValidGeminiKey();
  if (activeKey && pageSnippet.length > 60) {
    try {
      const genAi = getGenAI(activeKey);
      const sumRes = await genAi.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Summarize this portfolio/project/product webpage in 2 concise sentences focused on technical architecture, product capabilities, and concrete talking points an interviewer or prospect should ask about.\n\nURL: ${normalizedUrl}\nContent:\n${pageSnippet}`,
      });
      if (sumRes.text?.trim()) {
        summary = sumRes.text.trim();
      }
    } catch {
      /* keep raw snippet summary */
    }
  }

  res.json({
    url: normalizedUrl,
    label: pageTitle,
    summary,
    fetched: Boolean(pageSnippet),
  });
});

// ============================================================================
// 4. Adaptive Post-Call Video Debrief & Weak-Area Learning Engine
// ============================================================================
app.post('/api/gemini/video-call-debrief', async (req, res) => {
  const {
    mode = 'interview', // 'interview' | 'agency-pitch' | 'discovery'
    personaName = 'Interviewer',
    personaRole = 'Hiring Manager',
    sessionConfig = null,
    durationSeconds = 0,
    transcriptTurns = [],
    screenShared = false,
    bargeInCount = 0,
    careerDossier = null,
    previousWeakAreas = [],
  } = req.body || {};

  const userTurns = (transcriptTurns || []).filter(
    (t: any) => t.speaker === 'You' && t.text && t.text.trim().length > 0
  );
  const totalUserWords = userTurns.reduce(
    (sum: number, t: any) => sum + t.text.trim().split(/\s+/).filter(Boolean).length,
    0
  );

  if (userTurns.length === 0 || totalUserWords < 3) {
    return res.json({
      overallScore: 0,
      grade: 'F',
      isSilentFailure: true,
      summary: 'No spoken or typed responses were detected during this call. Check your microphone input and permissions before rejoining.',
      competencies: [],
      weakAreas: [],
      strengths: [],
      nextCallPressurePlan: 'Confirm microphone input works and deliver at least 2–3 full conversational turns.',
      rewrites: [],
    });
  }

  const activeKey = getValidGeminiKey();
  if (!activeKey) {
    return res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
  }

  const salesScenario = sessionConfig?.salesScenario || (mode === 'discovery' ? 'discovery' : 'krechet-10');
  const isDiscovery = mode === 'discovery' || (sessionConfig?.track === 'sales' && salesScenario === 'discovery');
  const isAgencyPitch =
    !isDiscovery && (mode === 'agency-pitch' || sessionConfig?.track === 'sales');

  const competencyList = isDiscovery
    ? [
        { key: 'rapport_frame', label: 'Opening Frame & Agenda Control' },
        { key: 'symptom_to_root', label: 'Surface-to-Root Pain Discovery' },
        { key: 'quantifying_pain', label: 'Quantifying Cost of Inaction' },
        { key: 'tailored_solution_fit', label: 'Tailored App / Service Positioning' },
        { key: 'discovery_objections', label: 'Skepticism & Timing Navigation' },
        { key: 'next_step_commitment', label: 'Scoped Next-Step Commitment' },
      ]
    : isAgencyPitch
    ? [
        { key: 'agency_discovery', label: 'Agency Pain Discovery' },
        { key: 'screen_share_demo', label: 'Screen-Share & Demo Flow' },
        { key: 'krechet_value', label: 'Simulation & Workshop Proof' },
        { key: 'package_roi_defense', label: 'Seat / White-Label ROI Defense' },
        { key: 'executive_frame', label: 'Executive Frame & Barge-In Recovery' },
        { key: 'closing_control', label: 'Closing & Next-Step Control' },
      ]
    : [
        { key: 'architecture_depth', label: 'Project Architecture Depth' },
        { key: 'solutions_framing', label: 'Solutions Discovery & Framing' },
        { key: 'concise_clarity', label: 'Concise Executive Clarity' },
        { key: 'tradeoff_defense', label: 'Trade-off & Constraint Defense' },
        { key: 'impact_proof', label: 'Project Impact & Metrics Proof' },
        { key: 'vocal_composure', label: 'Vocal Presence & Barge-In Composure' },
      ];

  const scenarioDescription = isDiscovery
    ? `Open B2B Sales Discovery Call — Goal: diagnose root workflow pain BEFORE pitching a tailored app, automation, or service`
    : isAgencyPitch
    ? salesScenario === 'krechet-whitelabel'
      ? `B2B Agency Sales Call pitching KRECHET Academy Premium White-Label License`
      : salesScenario === 'krechet-20'
      ? `B2B Agency Sales Call pitching KRECHET Academy 20-Seat Agency Growth Package`
      : `B2B Agency Sales Call pitching KRECHET Academy 10-Seat Agency Team Package`
    : `Live Project-Based Job Interview for ${sessionConfig?.targetPosition || careerDossier?.jobDescription?.roleTitle || 'AI Software Engineer / Solutions Architect'} at ${sessionConfig?.companyName || careerDossier?.jobDescription?.companyName || 'Target Company'}`;

  const transcriptText = (transcriptTurns || [])
    .map((t: any) => `[${t.time || '00:00'}] ${t.speaker}: ${t.text}`)
    .join('\n');

  const prompt = `You are an elite, candid executive performance evaluator reviewing a completed LIVE VIDEO CALL.

CALL METADATA:
- Scenario: ${scenarioDescription}
- Counterpart: ${personaName} (${sessionConfig?.counterpartRole || personaRole} at ${sessionConfig?.companyName || 'Company'})
${sessionConfig?.personaBrief ? `- Defined Session Persona & Context: ${sessionConfig.personaBrief}` : ''}
- Duration: ${durationSeconds} seconds
- User Spoken/Typed Words: ${totalUserWords}
- Screen Share Used: ${screenShared ? 'YES (Live screen/deck presented)' : 'NO'}
- Live Barge-In Interruptions Handled: ${bargeInCount}
- Prior Weak Areas Under Pressure Test: ${previousWeakAreas.length ? previousWeakAreas.map((w: any) => `${w.label} (${w.score}/100): ${w.note}`).join(' | ') : 'First baseline session'}

EXACT CALL TRANSCRIPT:
${transcriptText}

EVALUATION MANDATE:
1. Be strictly honest and grounded ONLY in what the user actually said. Never inflate scores on short, premature, or vague answers.
   ${isDiscovery ? '- In Open Discovery, penalize premature feature-pitching if the caller pitched an app/service before uncovering root workflow pain and cost of inaction.' : ''}
   ${isAgencyPitch ? `- Evaluate specifically how well the caller positioned and defended the ${salesScenario === 'krechet-whitelabel' ? 'Premium White-Label license' : salesScenario === 'krechet-20' ? '20-Seat package' : '10-Seat package'} against agency objections.` : ''}
2. Score EACH of these exact 6 competencies (0 to 100) using their exact keys:
${competencyList.map((c) => `   - key: "${c.key}", label: "${c.label}"`).join('\n')}
3. Identify the top 2-3 WEAK AREAS with concrete evidence from the transcript and an explicit **pressureDirective** telling the AI counterpart EXACTLY how to push harder on that weak area in the NEXT live call!
4. Identify 2-3 concrete STRENGTHS grounded in the transcript.
5. Provide 2 concrete "What You Said -> Stronger Version" rewrites.
6. Provide a concise **nextCallPressurePlan** summarizing what the AI will drill harder next session.`;

  try {
    const genAi = getGenAI(activeKey);
    const response = await genAi.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            grade: { type: Type.STRING },
            summary: { type: Type.STRING },
            competencies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  label: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  feedback: { type: Type.STRING },
                },
              },
            },
            weakAreas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  label: { type: Type.STRING },
                  score: { type: Type.INTEGER },
                  evidence: { type: Type.STRING },
                  pressureDirective: { type: Type.STRING },
                },
              },
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            nextCallPressurePlan: { type: Type.STRING },
            rewrites: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  moment: { type: Type.STRING },
                  strongerVersion: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text || '{}').trim());
    res.json({
      ...parsed,
      isSilentFailure: false,
      wordCount: totalUserWords,
      durationSeconds,
      screenShared,
    });
  } catch (error: any) {
    console.error('Video debrief API error:', error?.message || error);
    res.status(502).json({
      error: error?.message || 'Failed to generate post-call debrief.',
    });
  }
});

// ============================================================================
// 5. Screen Vision & Co-Browsing Intel API
// ============================================================================
app.post('/api/gemini/screen-analyze', async (req, res) => {
  const { imageBase64 } = req.body || {};
  const activeKey = getValidGeminiKey();
  if (!activeKey || !imageBase64) {
    return res.status(400).json({ error: 'Screen capture image and Gemini API key are required.' });
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const genAi = getGenAI(activeKey);
    const response = await genAi.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          {
            text: 'You are a live Sales & Interview Co-Pilot viewing the user screen. Briefly summarize what is visible on screen, identify 3 high-leverage talking points, and suggest 1 crisp question or hook to deliver right now.',
          },
        ],
      },
    });
    res.json({ analysis: response.text || '' });
  } catch (error: any) {
    res.status(502).json({ error: error?.message || 'Screen analysis failed.' });
  }
});

// ============================================================================
// 6. Prospect Research API
// ============================================================================
app.post('/api/gemini/research-prospect', async (req, res) => {
  const { query, website, companyName, city, trade } = req.body || {};
  const name = companyName || website || query || 'Target Company';
  const activeKey = getValidGeminiKey();
  if (!activeKey) {
    return res.status(503).json({ error: 'Gemini API key is not configured.' });
  }

  try {
    const genAi = getGenAI(activeKey);
    const response = await genAi.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this target prospect or agency: ${name} (${city || 'US'}, ${trade || 'Digital Marketing / Services'}). Return concise JSON with companyName, decisionMaker, role, city, personalizationMarkers (3 strings), bleedingNeckPain, and branchingScript ({ opener, painHook, closingAsk, branches: [{ objection, response }] }).`,
      config: { responseMimeType: 'application/json' },
    });
    res.json(JSON.parse(response.text || '{}'));
  } catch (error: any) {
    res.status(502).json({ error: error?.message || 'Prospect research failed.' });
  }
});

// ============================================================================
// 7. Server-Side TTS using gemini-3.8-flash-lite-tts
// ============================================================================
const PERSONA_SPEECH_STYLES: Record<string, string> = {
  charlie:
    'Gravelly, laid-back middle-aged Southern Appalachian male drawl, calm streetwise cadence, slight rasp, unhurried phrasing',
  joey:
    'Relaxed, slightly husky Appalachian early-30s male drawl, laid-back unhurried conversational pacing, natural low-mid register',
  katy:
    'Confident, street-smart American female voice, clear articulation and natural warmth',
  claire:
    'Articulate, composed executive American female hiring manager voice',
  rachel:
    'Crisp, fast-moving agency managing partner female voice',
  marcus:
    'Warm, grounded, authoritative executive sales & career mentor male voice',
  elena:
    'Sharp, encouraging enterprise sales coach female voice',
  hank:
    'Gruff, skeptical blue-collar contractor male voice on a jobsite',
  carl:
    'Blunt, busy HVAC/roofing owner male voice',
  delbert:
    'Weathered, old-school West Virginia contractor male drawl',
  bo:
    'Direct, fast-talking field estimator male voice',
  sarah:
    'Polished, analytical commercial operations director female voice',
};

const PERSONA_DEEPGRAM_MODELS: Record<string, string> = {
  charlie: 'aura-zeus-en',
  joey: 'aura-perseus-en',
  katy: 'aura-luna-en',
  claire: 'aura-athena-en',
  rachel: 'aura-asteria-en',
  marcus: 'aura-helios-en',
  elena: 'aura-stella-en',
  hank: 'aura-orion-en',
  carl: 'aura-orion-en',
  delbert: 'aura-arcas-en',
  bo: 'aura-angus-en',
  sarah: 'aura-asteria-en',
};

const VALID_GEMINI_VOICES = [
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Aoede',
  'Zephyr',
  'Orus',
  'Leda',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
  'Autonoe',
];

app.post('/api/gemini/tts', async (req, res) => {
  const { text, voiceName = 'Orus', gender = 'male', personaKey = 'marcus' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Text is required for TTS' });

  const normalizedPersona = String(personaKey || '').toLowerCase();
  const requestedVoice = String(voiceName || '').trim();

  const customDgKey = (req.headers['x-deepgram-api-key'] || req.body?.deepgramApiKey) as string;
  const effectiveDgKey =
    customDgKey && typeof customDgKey === 'string' && customDgKey.trim().length > 10 && !customDgKey.includes('YOUR_')
      ? customDgKey.trim()
      : deepgramApiKey;

  // 1. If user explicitly chose a Deepgram Aura voice (`aura-*`), call Deepgram directly with that exact voice!
  if (requestedVoice.startsWith('aura-') && effectiveDgKey && effectiveDgKey.length > 10 && !effectiveDgKey.includes('YOUR_')) {
    try {
      const dgRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(requestedVoice)}`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${effectiveDgKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.slice(0, 1500) }),
      });
      if (dgRes.ok) {
        const buffer = Buffer.from(await dgRes.arrayBuffer());
        return res.json({
          audioBase64: buffer.toString('base64'),
          mimeType: 'audio/mp3',
          engine: 'deepgram-direct',
          voiceUsed: requestedVoice,
        });
      }
    } catch (dgErr: any) {
      console.warn('Direct Deepgram voice notice:', dgErr?.message);
    }
  }

  // 2. Gemini 3.8 TTS (`gemini-3.8-flash-lite-tts`) with multi-key fallback and RIFF WAV detection
  const customApiKey = (req.headers['x-gemini-api-key'] || req.body?.geminiApiKey) as string;
  const candidateKeys = getCandidateGeminiKeys(customApiKey);
  const effectiveGeminiVoice = VALID_GEMINI_VOICES.includes(requestedVoice)
    ? requestedVoice
    : gender === 'female'
    ? 'Kore'
    : 'Orus';

  const stylePrompt =
    PERSONA_SPEECH_STYLES[normalizedPersona] ||
    (gender === 'female'
      ? 'Natural, articulate American female voice with conversational rhythm'
      : 'Natural, authentic American male voice with conversational rhythm');

  for (const keyCandidate of candidateKeys) {
    try {
      const genAiClient = new GoogleGenAI({
        apiKey: keyCandidate,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const response = await genAiClient.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 1500),
                speechMetadata: {
                  style: stylePrompt,
                },
              } as any,
            ],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: effectiveGeminiVoice },
            },
          },
        },
      });

      const inlineAudio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineAudio?.data;
      if (base64Audio) {
        const rawAudio = Buffer.from(base64Audio, 'base64');
        // Unary gemini-3.8-flash-lite-tts already returns a complete RIFF WAV file.
        // Only wrap in pcm16ToWav if headerless raw PCM was returned.
        const isAlreadyWav = rawAudio.length > 44 && rawAudio.subarray(0, 4).toString('ascii') === 'RIFF';
        const wavAudio = isAlreadyWav ? rawAudio : pcm16ToWav(rawAudio, 24000, 1);
        return res.json({
          audioBase64: wavAudio.toString('base64'),
          mimeType: 'audio/wav',
          engine: 'gemini-3.8-tts',
          voiceUsed: effectiveGeminiVoice,
          sourceMimeType: inlineAudio?.mimeType || 'audio/wav',
        });
      }
    } catch (err: any) {
      console.warn('Gemini TTS key attempt notice:', err?.message || err);
    }
  }

  // 3. Distinct Persona Deepgram Aura Fallback (11 distinct voices — never just 2!)
  if (effectiveDgKey && effectiveDgKey.length > 10 && !effectiveDgKey.includes('YOUR_')) {
    try {
      const voiceToDgMap: Record<string, string> = {
        Charon: 'aura-zeus-en',
        Puck: 'aura-perseus-en',
        Orus: 'aura-helios-en',
        Fenrir: 'aura-orion-en',
        Enceladus: 'aura-arcas-en',
        Iapetus: 'aura-angus-en',
        Kore: 'aura-luna-en',
        Aoede: 'aura-stella-en',
        Zephyr: 'aura-asteria-en',
        Leda: 'aura-athena-en',
      };
      const deepgramModel =
        (requestedVoice.startsWith('aura-') ? requestedVoice : voiceToDgMap[requestedVoice]) ||
        PERSONA_DEEPGRAM_MODELS[normalizedPersona] ||
        (gender === 'female' ? 'aura-luna-en' : 'aura-helios-en');

      const dgRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(deepgramModel)}`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${effectiveDgKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.slice(0, 1500) }),
      });

      if (dgRes.ok) {
        const buffer = Buffer.from(await dgRes.arrayBuffer());
        return res.json({
          audioBase64: buffer.toString('base64'),
          mimeType: 'audio/mp3',
          engine: 'deepgram-fallback',
          voiceUsed: deepgramModel,
        });
      }
    } catch {
      /* silent */
    }
  }

  res.json({ fallback: true, message: 'Using browser speech synthesis' });
});

app.post('/api/deepgram/tts', async (req, res) => {
  try {
    const { text, model = 'aura-helios-en' } = req.body || {};
    const customDgKey = (req.headers['x-deepgram-api-key'] || req.body?.deepgramApiKey) as string;
    const effectiveDgKey =
      customDgKey && typeof customDgKey === 'string' && customDgKey.trim().length > 10 && !customDgKey.includes('YOUR_')
        ? customDgKey.trim()
        : deepgramApiKey;

    if (!effectiveDgKey || effectiveDgKey.length < 10 || effectiveDgKey.includes('YOUR_')) {
      return res.json({ fallback: true, message: 'Deepgram API key not configured' });
    }
    if (!text) return res.status(400).json({ error: 'Text is required for TTS' });

    const dgRes = await fetch(`https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${effectiveDgKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.slice(0, 1500) }),
    });
    if (!dgRes.ok) return res.json({ fallback: true, message: `Deepgram status ${dgRes.status}` });
    const buffer = Buffer.from(await dgRes.arrayBuffer());
    res.json({ audioBase64: buffer.toString('base64'), mimeType: 'audio/mp3', voiceUsed: model });
  } catch {
    res.json({ fallback: true, message: 'Deepgram TTS fallback' });
  }
});

// ============================================================================
// 8. Server-Side Gemini Live Bidirectional WebSocket Bridge (/ws/live)
//    Supports: 16kHz PCM Audio In, 24kHz PCM Audio Out, True Barge-In,
//    1 FPS Screen-Share / Video JPEG Frames, Input & Output Audio Transcriptions
// ============================================================================
async function synthesizePcm24k(
  text: string,
  voiceName: string,
  activeGeminiKey: string,
  effectiveDgKey: string
): Promise<Buffer | null> {
  const cleanText = text.trim().slice(0, 1400);
  if (!cleanText) return null;

  const voiceToPersona: Record<string, { persona: string; gender: 'male' | 'female'; dg: string }> = {
    Charon: { persona: 'charlie', gender: 'male', dg: 'aura-zeus-en' },
    Iapetus: { persona: 'joey', gender: 'male', dg: 'aura-angus-en' },
    Puck: { persona: 'bo', gender: 'male', dg: 'aura-perseus-en' },
    Orus: { persona: 'marcus', gender: 'male', dg: 'aura-helios-en' },
    Fenrir: { persona: 'hank', gender: 'male', dg: 'aura-orion-en' },
    Enceladus: { persona: 'delbert', gender: 'male', dg: 'aura-arcas-en' },
    Kore: { persona: 'katy', gender: 'female', dg: 'aura-luna-en' },
    Aoede: { persona: 'claire', gender: 'female', dg: 'aura-stella-en' },
    Zephyr: { persona: 'rachel', gender: 'female', dg: 'aura-asteria-en' },
    Leda: { persona: 'claire', gender: 'female', dg: 'aura-athena-en' },
  };

  const meta = voiceToPersona[voiceName] || { persona: 'charlie', gender: 'male', dg: 'aura-zeus-en' };

  // 1. Try Gemini 3.8 Flash Lite TTS (returns 24kHz 16-bit mono WAV -> strip 44-byte RIFF header)
  if (activeGeminiKey) {
    try {
      const genAi = getGenAI(activeGeminiKey);
      const response = await genAi.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText,
                speechMetadata: {
                  style: PERSONA_SPEECH_STYLES[meta.persona] || 'Natural conversational cadence',
                },
              } as any,
            ],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: VALID_GEMINI_VOICES.includes(voiceName) ? voiceName : 'Charon' },
            },
          },
        },
      });
      const b64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) {
        const raw = Buffer.from(b64, 'base64');
        const isWav = raw.length > 44 && raw.subarray(0, 4).toString('ascii') === 'RIFF';
        return isWav ? raw.subarray(44) : raw;
      }
    } catch {
      /* fall through to Deepgram linear16 24kHz PCM */
    }
  }

  // 2. Deepgram Aura raw 24kHz 16-bit mono little-endian PCM (container=none)
  if (effectiveDgKey && effectiveDgKey.length > 10 && !effectiveDgKey.includes('YOUR_')) {
    try {
      const dgUrl = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(meta.dg)}&encoding=linear16&sample_rate=24000&container=none`;
      const dgRes = await fetch(dgUrl, {
        method: 'POST',
        headers: {
          Authorization: `Token ${effectiveDgKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: cleanText }),
      });
      if (dgRes.ok) {
        return Buffer.from(await dgRes.arrayBuffer());
      }
    } catch {
      /* ignore */
    }
  }

  return null;
}

async function transcribePcm16k(
  pcm16Buffer: Buffer,
  activeGeminiKey: string,
  effectiveDgKey: string
): Promise<string> {
  if (!pcm16Buffer || pcm16Buffer.length < 3200) return '';

  // 1. Fast low-latency Deepgram Nova-2 STT on raw linear16 16kHz PCM when configured
  if (effectiveDgKey && effectiveDgKey.length > 10 && !effectiveDgKey.includes('YOUR_')) {
    try {
      const dgRes = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&encoding=linear16&sample_rate=16000&channels=1',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${effectiveDgKey}`,
            'Content-Type': 'audio/raw',
          },
          body: new Uint8Array(pcm16Buffer),
        }
      );
      if (dgRes.ok) {
        const data: any = await dgRes.json();
        const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || '';
        if (transcript) return transcript;
      }
    } catch {
      /* fall through to Gemini 3.5 Transcribe */
    }
  }

  // 2. Gemini 3.5 Transcribe (`gemini-3.5-transcribe`) using WAV-wrapped 16kHz PCM
  if (activeGeminiKey) {
    try {
      const wav16k = pcm16ToWav(pcm16Buffer, 16000, 1);
      const genAi = getGenAI(activeGeminiKey);
      const res = await genAi.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/wav', data: wav16k.toString('base64') } },
            { text: 'Transcribe only the exact spoken English words. Return empty string if only background noise.' },
          ],
        },
      });
      return (res.text || '').trim();
    } catch {
      /* ignore */
    }
  }

  return '';
}

function createGenAiForLive(apiKey: string) {
  const isDirectGoogleKey = apiKey.startsWith('AIza');
  const client = new GoogleGenAI({
    apiKey,
    httpOptions: {
      ...(isDirectGoogleKey ? { baseUrl: 'https://generativelanguage.googleapis.com' } : {}),
      headers: { 'User-Agent': 'aistudio-build' },
    },
  });
  // Fix @google/genai@3.6.1 trailing-slash bug where new URL(baseUrl).toString()
  // ends with '/' and Live.connect appends '/ws/...', producing '//ws/...' -> HTTP 404.
  const apiClient = (client as any).apiClient;
  if (apiClient && typeof apiClient.getWebsocketBaseUrl === 'function') {
    const origGetWsUrl = apiClient.getWebsocketBaseUrl.bind(apiClient);
    apiClient.getWebsocketBaseUrl = () => String(origGetWsUrl()).replace(/\/+$/, '');
  }
  return client;
}

function attachGeminiLiveBridge(httpServer: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const urlPath = (request.url || '').split('?')[0];
    if (urlPath === '/ws/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (clientWs: WebSocket) => {
    let liveSession: any = null;
    let fallbackEngine: {
      activeKey: string;
      dgKey: string;
      voiceName: string;
      systemInstruction: string;
      history: Array<{ role: 'user' | 'model'; text: string }>;
      latestVideoFrameB64: string;
      speechBuffers: Buffer[];
      silenceTimer: ReturnType<typeof setTimeout> | null;
      generationToken: number;
      isProcessingTurn: boolean;
    } | null = null;
    let isClosed = false;

    // Keep WebSocket alive across Cloud Run / reverse proxies
    const pingInterval = setInterval(() => {
      if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.ping();
        } catch {
          /* ignore */
        }
      }
    }, 20000);

    const sendSafe = (payload: Record<string, any>) => {
      if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify(payload));
        } catch {
          /* ignore */
        }
      }
    };

    const runFallbackModelTurn = async (userText: string, isInitialGreeting = false) => {
      if (!fallbackEngine || isClosed) return;
      const myToken = ++fallbackEngine.generationToken;
      fallbackEngine.isProcessingTurn = true;

      try {
        if (!isInitialGreeting && userText) {
          fallbackEngine.history.push({ role: 'user', text: userText });
        }

        const genAi = getGenAI(fallbackEngine.activeKey);
        const convoText = fallbackEngine.history
          .slice(-14)
          .map((h) => `${h.role === 'user' ? 'Candidate/Caller' : 'You'}: ${h.text}`)
          .join('\n');

        const promptText = isInitialGreeting
          ? `${userText}\n\nRespond directly in character in 1 to 2 natural spoken sentences (plain spoken text only, no markdown or stage directions).`
          : `Conversation so far:\n${convoText}\n\nRespond naturally in character to the Candidate/Caller's latest message in 1 to 3 concise spoken sentences, ending with one sharp follow-up question or challenge. Plain spoken words only—no markdown, asterisks, or stage directions.`;

        const parts: any[] = [];
        if (fallbackEngine.latestVideoFrameB64) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: fallbackEngine.latestVideoFrameB64,
            },
          });
        }
        parts.push({ text: promptText });

        const response = await genAi.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: { parts },
          config: {
            systemInstruction: fallbackEngine.systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        if (isClosed || !fallbackEngine || fallbackEngine.generationToken !== myToken) return;

        const replyText = (response.text || '')
          .replace(/[*_#`~>]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (!replyText) {
          sendSafe({ type: 'turnComplete' });
          return;
        }

        fallbackEngine.history.push({ role: 'model', text: replyText });
        sendSafe({ type: 'outputTranscript', text: replyText });

        const pcm24k = await synthesizePcm24k(
          replyText,
          fallbackEngine.voiceName,
          fallbackEngine.activeKey,
          fallbackEngine.dgKey || deepgramApiKey
        );

        if (isClosed || !fallbackEngine || fallbackEngine.generationToken !== myToken) return;

        if (pcm24k && pcm24k.length > 0) {
          const chunkSize = 16384; // ~0.34s per 24kHz 16-bit mono chunk
          for (let offset = 0; offset < pcm24k.length; offset += chunkSize) {
            if (isClosed || !fallbackEngine || fallbackEngine.generationToken !== myToken) return;
            const slice = pcm24k.subarray(offset, Math.min(offset + chunkSize, pcm24k.length));
            sendSafe({
              type: 'audio',
              data: slice.toString('base64'),
              mimeType: 'audio/pcm;rate=24000',
            });
          }
        }

        sendSafe({ type: 'turnComplete' });
      } catch (turnErr: any) {
        console.error('[RealtimeBridge] Turn error:', turnErr?.message || turnErr);
        sendSafe({
          type: 'error',
          message: turnErr?.message || 'Error generating live response.',
        });
      } finally {
        if (fallbackEngine && fallbackEngine.generationToken === myToken) {
          fallbackEngine.isProcessingTurn = false;
        }
      }
    };

    const flushFallbackSpeechBuffer = async () => {
      if (!fallbackEngine || isClosed) return;
      if (fallbackEngine.silenceTimer) {
        clearTimeout(fallbackEngine.silenceTimer);
        fallbackEngine.silenceTimer = null;
      }
      if (fallbackEngine.speechBuffers.length === 0) return;

      const combined = Buffer.concat(fallbackEngine.speechBuffers);
      fallbackEngine.speechBuffers = [];

      // Require at least ~0.25s of voiced audio (8000 bytes @ 16kHz 16-bit)
      if (combined.length < 8000) return;

      const transcript = await transcribePcm16k(
        combined,
        fallbackEngine.activeKey,
        fallbackEngine.dgKey || deepgramApiKey
      );
      if (!transcript || isClosed || !fallbackEngine) return;

      sendSafe({ type: 'inputTranscript', text: transcript });
      await runFallbackModelTurn(transcript, false);
    };

    clientWs.on('message', async (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === 'setup') {
        const candidateKeys = getCandidateGeminiKeys(msg.apiKey);
        const activeKey = candidateKeys[0] || '';
        if (!activeKey) {
          sendSafe({
            type: 'error',
            message: 'Gemini API key is not configured on the server. Check Settings > Secrets.',
          });
          return;
        }

        if (liveSession) {
          try {
            liveSession.close();
          } catch {
            /* ignore */
          }
          liveSession = null;
        }
        fallbackEngine = null;

        const auraToLive: Record<string, string> = {
          'aura-orion-en': 'Orus',
          'aura-arcas-en': 'Charon',
          'aura-perseus-en': 'Puck',
          'aura-angus-en': 'Iapetus',
          'aura-helios-en': 'Enceladus',
          'aura-zeus-en': 'Fenrir',
          'aura-stella-en': 'Aoede',
          'aura-asteria-en': 'Zephyr',
          'aura-luna-en': 'Kore',
          'aura-athena-en': 'Leda',
        };
        const mappedVoice = auraToLive[msg.voiceName] || msg.voiceName;
        const voiceName = VALID_GEMINI_VOICES.includes(mappedVoice) ? mappedVoice : 'Charon';
        const systemInstruction =
          msg.systemInstruction || 'You are a realistic, attentive human interviewer on a live video call.';

        const effectiveDgKey =
          typeof msg.deepgramApiKey === 'string' && msg.deepgramApiKey.trim().length > 10
            ? msg.deepgramApiKey.trim()
            : deepgramApiKey;

        const activateFallbackBridge = (runInitial = true) => {
          if (isClosed || fallbackEngine) return;
          liveSession = null;
          fallbackEngine = {
            activeKey,
            dgKey: effectiveDgKey,
            voiceName,
            systemInstruction,
            history: [],
            latestVideoFrameB64: '',
            speechBuffers: [],
            silenceTimer: null,
            generationToken: 0,
            isProcessingTurn: false,
          };
          sendSafe({ type: 'setupComplete' });
          sendSafe({ type: 'ready' });
          if (runInitial && msg.initialPrompt && typeof msg.initialPrompt === 'string') {
            void runFallbackModelTurn(msg.initialPrompt, true);
          }
        };

        // 1. Attempt native Gemini 3.8 Live WebSocket (`gemini-3.8-live`); if upstream rejects or closes
        //    before first live response (e.g., 404 proxy or 1008 model/key mismatch), seamlessly fall back!
        if (activeKey) {
          let hasConfirmedLiveResponse = false;
          try {
            const genAi = createGenAiForLive(activeKey);
            liveSession = await genAi.live.connect({
              model: 'gemini-3.8-live',
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                  },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction,
              },
              callbacks: {
                onopen: () => {
                  // Wait until connect() resolves
                },
                onmessage: (message: LiveServerMessage) => {
                  hasConfirmedLiveResponse = true;
                  const content = message.serverContent;
                  if (!content) return;

                  if (content.interrupted) {
                    sendSafe({ type: 'interrupted' });
                  }
                  if (content.inputTranscription?.text) {
                    sendSafe({ type: 'inputTranscript', text: content.inputTranscription.text });
                  }
                  if (content.outputTranscription?.text) {
                    sendSafe({ type: 'outputTranscript', text: content.outputTranscription.text });
                  }
                  for (const part of content.modelTurn?.parts ?? []) {
                    if (part.text) {
                      sendSafe({ type: 'text', text: part.text });
                    }
                    if (part.inlineData?.data) {
                      sendSafe({
                        type: 'audio',
                        data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                      });
                    }
                  }
                  if (content.turnComplete) {
                    sendSafe({ type: 'turnComplete' });
                  }
                },
                onerror: (err: any) => {
                  if (!hasConfirmedLiveResponse) {
                    activateFallbackBridge(true);
                    return;
                  }
                  sendSafe({
                    type: 'error',
                    message: err?.message || 'Gemini Live connection error.',
                  });
                },
                onclose: (ev: any) => {
                  if (!hasConfirmedLiveResponse && !isClosed) {
                    activateFallbackBridge(true);
                    return;
                  }
                  sendSafe({
                    type: 'closed',
                    code: ev?.code,
                    reason: ev?.reason || 'Session closed',
                  });
                },
              },
            });

            sendSafe({ type: 'setupComplete' });
            sendSafe({ type: 'ready' });
            if (msg.initialPrompt && typeof msg.initialPrompt === 'string') {
              liveSession.sendClientContent({
                turns: [{ role: 'user', parts: [{ text: msg.initialPrompt }] }],
                turnComplete: true,
              });
            }
            return;
          } catch {
            liveSession = null;
          }
        }

        // 2. Seamlessly run our real-API Gemini 4 + Vision + 24kHz PCM Voice bridge
        activateFallbackBridge(true);
        return;
      }

      // Handle live messages for Native Gemini Live session
      if (liveSession) {
        try {
          if (msg.type === 'audio' && msg.data) {
            liveSession.sendRealtimeInput({
              audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (msg.type === 'video' && msg.data) {
            liveSession.sendRealtimeInput({
              video: { data: msg.data, mimeType: 'image/jpeg' },
            });
          } else if (msg.type === 'text' && msg.text) {
            liveSession.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: String(msg.text) }] }],
              turnComplete: true,
            });
          } else if (msg.type === 'interrupt') {
            sendSafe({ type: 'interrupted' });
          }
        } catch (sendErr: any) {
          console.warn('[GeminiLiveBridge] Forward error:', sendErr?.message);
        }
        return;
      }

      // Handle live messages for Real-API HTTP+PCM Bridge
      if (fallbackEngine) {
        if (msg.type === 'config') {
          if (msg.bargeInMode === 'speakers' || msg.bargeInMode === 'headphones') {
            (fallbackEngine as any).bargeInMode = msg.bargeInMode;
          }
          return;
        }

        if (msg.type === 'interrupt') {
          fallbackEngine.generationToken++;
          fallbackEngine.isProcessingTurn = false;
          (fallbackEngine as any).consecutiveBargeInFrames = 0;
          sendSafe({ type: 'interrupted' });
          return;
        }

        if (msg.type === 'video' && msg.data) {
          fallbackEngine.latestVideoFrameB64 = String(msg.data).replace(/^data:image\/\w+;base64,/, '');
          return;
        }

        if (msg.type === 'text' && msg.text) {
          fallbackEngine.generationToken++; // interrupt any in-flight speech
          await runFallbackModelTurn(String(msg.text).trim(), false);
          return;
        }

        if (msg.type === 'commit') {
          await flushFallbackSpeechBuffer();
          return;
        }

        if (msg.type === 'audio' && msg.data) {
          const pcmChunk = Buffer.from(msg.data, 'base64');
          // Compute RMS energy on Int16 samples to detect voiced speech vs silence
          const sampleCount = Math.floor(pcmChunk.length / 2);
          if (sampleCount === 0) return;
          let sumSq = 0;
          for (let i = 0; i < sampleCount; i++) {
            const val = pcmChunk.readInt16LE(i * 2) / 32768;
            sumSq += val * val;
          }
          const rms = Math.sqrt(sumSq / sampleCount);

          const isSpeakerMode = (fallbackEngine as any).bargeInMode === 'speakers';
          const bargeThreshold = isSpeakerMode ? 0.072 : 0.038;
          const requiredFrames = isSpeakerMode ? 4 : 3;

          // Barge-in requires consecutive voiced frames so transient clicks/speaker bleed don't false-trigger
          if (fallbackEngine.isProcessingTurn) {
            if (rms > bargeThreshold) {
              (fallbackEngine as any).consecutiveBargeInFrames =
                ((fallbackEngine as any).consecutiveBargeInFrames || 0) + 1;
              if ((fallbackEngine as any).consecutiveBargeInFrames >= requiredFrames) {
                fallbackEngine.generationToken++;
                fallbackEngine.isProcessingTurn = false;
                (fallbackEngine as any).consecutiveBargeInFrames = 0;
                sendSafe({ type: 'interrupted' });
              }
            } else {
              (fallbackEngine as any).consecutiveBargeInFrames = 0;
            }
          } else {
            (fallbackEngine as any).consecutiveBargeInFrames = 0;
          }

          const voicedThreshold = isSpeakerMode ? 0.024 : 0.016;
          const isVoiced = rms > voicedThreshold;
          if (isVoiced) {
            fallbackEngine.speechBuffers.push(pcmChunk);
            if (fallbackEngine.silenceTimer) {
              clearTimeout(fallbackEngine.silenceTimer);
            }
            // Commit spoken turn after 850ms of natural pause
            fallbackEngine.silenceTimer = setTimeout(() => {
              void flushFallbackSpeechBuffer();
            }, 850);
          } else if (fallbackEngine.speechBuffers.length > 0) {
            // Keep inter-word micro-pauses & soft consonants intact while silence timer runs
            fallbackEngine.speechBuffers.push(pcmChunk);
          }

          // Safety auto-flush if continuous speech exceeds ~30 seconds
          if (fallbackEngine.speechBuffers.length > 480) {
            void flushFallbackSpeechBuffer();
          }
        }
      }
    });

    const cleanupWs = () => {
      isClosed = true;
      clearInterval(pingInterval);
      if (fallbackEngine?.silenceTimer) {
        clearTimeout(fallbackEngine.silenceTimer);
      }
      fallbackEngine = null;
      if (liveSession) {
        try {
          liveSession.close();
        } catch {
          /* ignore */
        }
        liveSession = null;
      }
    };

    clientWs.on('close', cleanupWs);
    clientWs.on('error', cleanupWs);
  });
}

async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(path.resolve(distPath, 'index.html'));
  const isProd = hasDist && process.env.NODE_ENV === 'production';

  const httpServer = http.createServer(app);
  attachGeminiLiveBridge(httpServer);

  if (!isProd) {
    console.log('Starting Vite server in middleware mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Serving production build from dist...');
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server + Gemini Live WS bridge listening on http://0.0.0.0:${port}`);
  });
}

startServer();
