/**
 * Deepgram Voice AI Service
 * Powers ultra-realistic Deepgram Aura TTS and Deepgram STT / Voice Agent.
 */

// Models
export const DEEPGRAM_VOICES = {
  COACH_FEMALE: 'aura-asteria-en',   // Warm, sharp, professional coach
  COACH_MALE: 'aura-orion-en',       // Confident, direct closer
  CONTRACTOR_MALE: 'aura-arcash-en', // Gruff, deep contractor / blue-collar voice
  CONTRACTOR_FEMALE: 'aura-luna-en'  // Direct trade business owner
};

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
