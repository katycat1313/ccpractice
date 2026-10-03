/**
 * Deepgram Voice AI Service
 * Powers ultra-realistic Deepgram Aura TTS and Deepgram STT / Voice Agent.
 */

// Models
export const DEEPGRAM_VOICES = {
  COACH_FEMALE: 'aura-asteria-en',   // Warm, sharp, professional coach
  COACH_MALE: 'aura-orion-en',       // Confident, direct closer
  CONTRACTOR_MALE: 'aura-arcas-en', // Gruff, deep contractor / blue-collar voice
  CONTRACTOR_FEMALE: 'aura-luna-en'  // Direct trade business owner
};

/**
 * Get active preferred Deepgram voice model
 */
export function getPreferredVoice() {
  try {
    const direct = localStorage.getItem('deepgram_preferred_voice');
    if (direct && direct.trim()) return direct.trim();

    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    if (userObj.preferred_voice && userObj.preferred_voice.trim()) {
      return userObj.preferred_voice.trim();
    }
    if (userObj.preferredVoice && userObj.preferredVoice.trim()) {
      return userObj.preferredVoice.trim();
    }
  } catch (e) {
    console.debug('Error getting preferred voice:', e);
  }
  return DEEPGRAM_VOICES.COACH_FEMALE;
}

/**
 * Persist active preferred Deepgram voice model
 */
export function setPreferredVoice(voice) {
  if (!voice) return;
  const clean = voice.trim();
  localStorage.setItem('deepgram_preferred_voice', clean);
  try {
    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    userObj.preferred_voice = clean;
    userObj.preferredVoice = clean;
    localStorage.setItem('scriptmaster_user', JSON.stringify(userObj));
  } catch (e) {
    console.debug('Error caching preferred voice:', e);
  }
}

/**
 * Get active Deepgram API key from user settings, localStorage, or environment
 */
export function getDeepgramApiKey() {
  try {
    const directKey = localStorage.getItem('deepgram_api_key');
    if (directKey && directKey.trim()) return directKey.trim();

    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    if (userObj.deepgram_api_key && userObj.deepgram_api_key.trim()) {
      return userObj.deepgram_api_key.trim();
    }
  } catch (e) {
    console.debug('Error getting local key:', e);
  }

  const envKey = import.meta.env.VITE_DEEPGRAM_API_KEY || import.meta.env.DEEPGRAM_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();

  return '';
}

export const DEFAULT_DEEPGRAM_AGENT_ID = 'fd7da684-2c9c-433d-ab0c-1ed2f8b061e4';
export const DEFAULT_DEEPGRAM_PROJECT_ID = '1add87dc-1582-4d89-9a7d-d2cee44bf542';

/**
 * Get active Deepgram Voice Agent ID
 */
export function getDeepgramAgentId() {
  try {
    const directAgentId = localStorage.getItem('deepgram_agent_id');
    if (directAgentId && directAgentId.trim()) return directAgentId.trim();

    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    if (userObj.deepgram_agent_id && userObj.deepgram_agent_id.trim()) {
      return userObj.deepgram_agent_id.trim();
    }
  } catch (e) {
    console.debug('Error getting local agent ID:', e);
  }

  const envAgent = import.meta.env.VITE_DEEPGRAM_AGENT_ID || import.meta.env.DEEPGRAM_AGENT_ID;
  if (envAgent && envAgent.trim()) return envAgent.trim();

  return DEFAULT_DEEPGRAM_AGENT_ID;
}

/**
 * Persist Deepgram Agent ID
 */
export function setDeepgramAgentId(agentId) {
  if (!agentId) return;
  const cleanId = agentId.trim();
  localStorage.setItem('deepgram_agent_id', cleanId);
  try {
    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    userObj.deepgram_agent_id = cleanId;
    localStorage.setItem('scriptmaster_user', JSON.stringify(userObj));
  } catch (e) {
    console.debug('Error saving agent id to user profile:', e);
  }
}

/**
 * Get active Deepgram Project ID
 */
export function getDeepgramProjectId() {
  try {
    const directProj = localStorage.getItem('deepgram_project_id');
    if (directProj && directProj.trim()) return directProj.trim();

    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    if (userObj.deepgram_project_id && userObj.deepgram_project_id.trim()) {
      return userObj.deepgram_project_id.trim();
    }
  } catch (e) {
    console.debug('Error getting local project ID:', e);
  }
  return DEFAULT_DEEPGRAM_PROJECT_ID;
}

/**
 * Persist Deepgram Project ID
 */
export function setDeepgramProjectId(projectId) {
  if (!projectId) return;
  const cleanId = projectId.trim();
  localStorage.setItem('deepgram_project_id', cleanId);
  try {
    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    userObj.deepgram_project_id = cleanId;
    localStorage.setItem('scriptmaster_user', JSON.stringify(userObj));
  } catch (e) {
    console.debug('Error saving project id to user profile:', e);
  }
}

/**
 * Fetch available voice agents from server / Deepgram API
 */
export async function fetchAvailableAgents(apiKey = '') {
  try {
    const headers = {};
    if (apiKey) headers['Authorization'] = `Token ${apiKey}`;
    const res = await fetch('/api/deepgram/agents', { headers });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Could not fetch agents:', err);
  }
  return {
    success: true,
    projectId: DEFAULT_DEEPGRAM_PROJECT_ID,
    agents: [
      {
        agent_uuid: DEFAULT_DEEPGRAM_AGENT_ID,
        title: 'ScriptMaster AI Sales Coach & Prospect Simulator',
        projectId: DEFAULT_DEEPGRAM_PROJECT_ID
      }
    ],
    recommendedAgentId: DEFAULT_DEEPGRAM_AGENT_ID
  };
}

/**
 * Set and persist Deepgram API key
 */
export function setDeepgramApiKey(key) {
  if (!key) return;
  const cleanKey = key.trim();
  localStorage.setItem('deepgram_api_key', cleanKey);
  try {
    const userObj = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    userObj.deepgram_api_key = cleanKey;
    localStorage.setItem('scriptmaster_user', JSON.stringify(userObj));
  } catch (e) {
    console.debug('Error caching key to user profile:', e);
  }
  window.dispatchEvent(new Event('deepgram_key_changed'));
}

// Global audio player reference to stop overlapping speech
let currentDeepgramAudio = null;

/**
 * Stop any ongoing Deepgram audio playback
 */
export function stopDeepgramAudio() {
  if (currentDeepgramAudio) {
    try {
      currentDeepgramAudio.pause();
      currentDeepgramAudio.currentTime = 0;
      currentDeepgramAudio.src = '';
    } catch (e) {
      console.debug('Error stopping audio:', e);
    }
    currentDeepgramAudio = null;
  }
}

/**
 * Speak text using Deepgram Aura REST API
 * Returns { success: true } if Deepgram played, or throws if failed
 */
export async function speakWithDeepgram({
  text,
  model = DEEPGRAM_VOICES.COACH_FEMALE,
  onStart,
  onEnd,
  onError
}) {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) {
    throw new Error('No Deepgram API key found. Please enter your Deepgram key.');
  }

  stopDeepgramAudio();

  const endpoint = `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    let errorDetail = `Deepgram error HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.err_msg || errJson.message || errorDetail;
    } catch (e) {
      console.debug('Could not parse error JSON:', e);
    }
    throw new Error(errorDetail);
  }

  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);
  const audio = new Audio(audioUrl);
  currentDeepgramAudio = audio;

  return new Promise((resolve, reject) => {
    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentDeepgramAudio = null;
      if (onEnd) onEnd();
      resolve(true);
    };

    audio.onerror = (e) => {
      URL.revokeObjectURL(audioUrl);
      currentDeepgramAudio = null;
      if (onError) onError(e);
      reject(new Error('Audio playback failed in browser'));
    };

    audio.play().catch(err => {
      if (onError) onError(err);
      reject(err);
    });
  });
}

/**
 * Diagnostic: Test Deepgram API Key & play short confirmation audio
 */
export async function testDeepgramKey(keyToTest) {
  const key = (keyToTest || getDeepgramApiKey()).trim();
  if (!key) {
    return {
      success: false,
      error: 'Please enter a valid Deepgram API Key (starts with numbers/letters).'
    };
  }

  try {
    const testText = "Deepgram Aura AI is connected and active. You are now using high fidelity voice.";
    const endpoint = `https://api.deepgram.com/v1/speak?model=${DEEPGRAM_VOICES.COACH_FEMALE}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: testText })
    });

    if (!res.ok) {
      let errText = `Deepgram rejected key with status ${res.status}`;
      try {
        const j = await res.json();
        errText = j.err_msg || j.message || errText;
      } catch (e) {
        console.debug('Error parsing json:', e);
      }
      return { success: false, error: errText };
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    stopDeepgramAudio();
    currentDeepgramAudio = audio;

    await audio.play();
    return { success: true, message: 'Deepgram connection verified! Aura voice is now active.' };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to connect to Deepgram API. Check your internet or API key permissions.'
    };
  }
}

/**
 * Diagnostic: Test Deepgram Agent ID, fetch config, and play Agent greeting audio
 */
export async function testDeepgramAgent(agentId, projectId, apiKey) {
  try {
    const targetAgentId = agentId || getDeepgramAgentId();
    const targetProjectId = projectId || getDeepgramProjectId();
    const key = (apiKey || getDeepgramApiKey()).trim();

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Token ${key}`;

    const res = await fetch('/api/deepgram/agent/test', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agentId: targetAgentId,
        projectId: targetProjectId
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || `Failed to verify agent (HTTP ${res.status})`
      };
    }

    if (data.audioBase64) {
      stopDeepgramAudio();
      const audio = new Audio(`data:${data.mimeType || 'audio/mp3'};base64,${data.audioBase64}`);
      currentDeepgramAudio = audio;
      await audio.play().catch(e => console.warn('Could not auto-play agent audio:', e));
    }

    return {
      success: true,
      agentTitle: data.agentTitle,
      voiceModel: data.voiceModel,
      listenModel: data.listenModel,
      greeting: data.greeting,
      latencyMs: data.latencyMs,
      message: `Verified! "${data.agentTitle}" is active with ${data.voiceModel} (${data.latencyMs}ms)`
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Network error verifying Deepgram agent.'
    };
  }
}

