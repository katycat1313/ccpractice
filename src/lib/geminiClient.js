import { getDeepgramApiKey, getDeepgramProjectId, getPreferredVoice } from './deepgramService';

/**
 * Retrieve user's configured Gemini API Key from localStorage or user profile
 */
export function getGeminiApiKey() {
  try {
    const direct = localStorage.getItem('gemini_api_key');
    if (direct && direct.trim()) return direct.trim();

    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    if (userObj.gemini_api_key && userObj.gemini_api_key.trim()) {
      return userObj.gemini_api_key.trim();
    }
  } catch (e) {
    console.debug('Error getting gemini key:', e);
  }
  return '';
}

/**
 * Store user's configured Gemini API Key in localStorage and user profile
 */
export function setGeminiApiKey(key) {
  if (!key) return;
  const clean = key.trim();
  localStorage.setItem('gemini_api_key', clean);
  try {
    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    userObj.gemini_api_key = clean;
    localStorage.setItem('scriptmaster_user', JSON.stringify(userObj));
  } catch (e) {
    console.debug('Error caching gemini key:', e);
  }
  window.dispatchEvent(new Event('gemini_key_changed'));
}

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
  const geminiApiKey = getGeminiApiKey();
  const deepgramApiKey = getDeepgramApiKey();

  try {
    const res = await fetch('/api/gemini/coach', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {}),
        ...(deepgramApiKey ? { 'x-deepgram-api-key': deepgramApiKey } : {})
      },
      body: JSON.stringify({
        systemPrompt,
        messages,
        userMessage,
        currentBusiness,
        stage,
        mode,
        userMemory,
        geminiApiKey,
        deepgramApiKey
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
  const geminiApiKey = getGeminiApiKey();
  try {
    const res = await fetch('/api/gemini/screen-analyze', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {})
      },
      body: JSON.stringify({
        imageBase64,
        currentBusiness,
        context,
        geminiApiKey
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
  const geminiApiKey = getGeminiApiKey();
  try {
    const res = await fetch('/api/gemini/research-prospect', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {})
      },
      body: JSON.stringify({
        query,
        website,
        companyName,
        city,
        trade,
        geminiApiKey
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
  const geminiApiKey = getGeminiApiKey();
  const deepgramApiKey = getDeepgramApiKey();
  const preferredVoice = getPreferredVoice();

  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(geminiApiKey ? { 'x-gemini-api-key': geminiApiKey } : {}),
        ...(deepgramApiKey ? { 'x-deepgram-api-key': deepgramApiKey } : {})
      },
      body: JSON.stringify({ 
        text, 
        voiceName, 
        gender, 
        personaKey,
        geminiApiKey,
        deepgramApiKey,
        preferredVoice,
        deepgramModel: preferredVoice
      })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getDeepgramTTSAudio(text, model) {
  const deepgramApiKey = getDeepgramApiKey();
  const deepgramProjectId = getDeepgramProjectId();
  const preferredVoice = getPreferredVoice();
  const activeModel = model || preferredVoice || 'aura-orion-en';

  try {
    const res = await fetch('/api/deepgram/tts', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(deepgramApiKey ? { 'x-deepgram-api-key': deepgramApiKey } : {})
      },
      body: JSON.stringify({ 
        text, 
        model: activeModel,
        deepgramApiKey,
        deepgramProjectId
      })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
