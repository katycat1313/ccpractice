/**
 * Client helper to talk to backend Gemini API endpoints
 */

export async function askGeminiCoach({
  systemPrompt,
  messages,
  userMessage,
  currentBusiness,
  stage,
  mode,
  userMemory
}) {
  try {
    const res = await fetch('/api/gemini/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt,
        messages,
        userMessage,
        currentBusiness,
        stage,
        mode,
        userMemory
      })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('askGeminiCoach fetch fallback:', err);
    return null;
  }
}

export async function analyzeScreenWithGemini({
  imageBase64,
  currentBusiness,
  context
}) {
  try {
    const res = await fetch('/api/gemini/screen-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        currentBusiness,
        context
      })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('analyzeScreenWithGemini fetch fallback:', err);
    return null;
  }
}

export async function researchProspectWithGemini({
  query,
  website,
  companyName,
  city,
  trade
}) {
  try {
    const res = await fetch('/api/gemini/research-prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        website,
        companyName,
        city,
        trade
      })
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('researchProspectWithGemini fetch fallback:', err);
    return null;
  }
}

export async function getGeminiTTSAudio(text, voiceName = 'Fenrir', gender = 'male', personaKey = 'marcus') {
  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName, gender, personaKey })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getDeepgramTTSAudio(text, model = 'aura-orion-en') {
  try {
    const res = await fetch('/api/deepgram/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
