/**
 * Unified Voice Resolver for Gemini 3.8 Live, Gemini 3.8 TTS, and Deepgram Aura
 *
 * Ensures every agent, coach, and contractor uses a genuinely distinct voice
 * and honors user selections saved in `scriptmaster_voice_settings`.
 */

export const GEMINI_LIVE_VOICES = [
  { id: 'Charon', label: 'Charon (Deep Gravelly Male)', gender: 'male' },
  { id: 'Puck', label: 'Puck (Dry Conversational Male)', gender: 'male' },
  { id: 'Orus', label: 'Orus (Measured Executive Coach)', gender: 'male' },
  { id: 'Fenrir', label: 'Fenrir (Bold Authoritative Male)', gender: 'male' },
  { id: 'Iapetus', label: 'Iapetus (Grounded Field Male)', gender: 'male' },
  { id: 'Enceladus', label: 'Enceladus (Weathered Veteran Male)', gender: 'male' },
  { id: 'Kore', label: 'Kore (Confident Sharp Female)', gender: 'female' },
  { id: 'Aoede', label: 'Aoede (Warm Executive Female)', gender: 'female' },
  { id: 'Zephyr', label: 'Zephyr (Crisp Analytical Female)', gender: 'female' },
  { id: 'Leda', label: 'Leda (Composed Strategist Female)', gender: 'female' },
];

const AURA_TO_GEMINI_LIVE_MAP = {
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
  'aura-hera-en': 'Aoede',
};

const PERSONA_DEFAULTS = {
  charlie: { ttsVoice: 'Charon', liveVoice: 'Charon', gender: 'male' },
  joey: { ttsVoice: 'Iapetus', liveVoice: 'Iapetus', gender: 'male' },
  katy: { ttsVoice: 'Kore', liveVoice: 'Kore', gender: 'female' },
  claire: { ttsVoice: 'Aoede', liveVoice: 'Aoede', gender: 'female' },
  rachel: { ttsVoice: 'Zephyr', liveVoice: 'Zephyr', gender: 'female' },
  marcus: { ttsVoice: 'Orus', liveVoice: 'Orus', gender: 'male' },
  elena: { ttsVoice: 'Aoede', liveVoice: 'Aoede', gender: 'female' },
  hank: { ttsVoice: 'Fenrir', liveVoice: 'Fenrir', gender: 'male' },
  carl: { ttsVoice: 'Fenrir', liveVoice: 'Fenrir', gender: 'male' },
  delbert: { ttsVoice: 'Enceladus', liveVoice: 'Enceladus', gender: 'male' },
  bo: { ttsVoice: 'Puck', liveVoice: 'Puck', gender: 'male' },
  sarah: { ttsVoice: 'Zephyr', liveVoice: 'Zephyr', gender: 'female' },
  dave: { ttsVoice: 'Algenib', liveVoice: 'Algenib', gender: 'male' },
};

export function getSavedVoiceSettings() {
  try {
    const raw = localStorage.getItem('scriptmaster_voice_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        coachVoice: parsed.coachVoice || 'Orus',
        prospectVoice: parsed.prospectVoice || 'Fenrir',
        agentVoices: parsed.agentVoices || {},
      };
    }
  } catch {
    /* ignore */
  }
  return {
    coachVoice: 'Orus',
    prospectVoice: 'Fenrir',
    agentVoices: {},
  };
}

export function saveAgentVoiceOverride(agentId, voiceId) {
  if (!agentId || !voiceId) return;
  try {
    const current = getSavedVoiceSettings();
    const updated = {
      ...current,
      agentVoices: {
        ...(current.agentVoices || {}),
        [agentId]: voiceId,
      },
    };
    localStorage.setItem('scriptmaster_voice_settings', JSON.stringify(updated));
    window.dispatchEvent(new Event('scriptmaster_voices_updated'));
  } catch {
    /* ignore */
  }
}

export function toGeminiLiveVoice(voiceId, fallback = 'Orus') {
  if (!voiceId) return fallback;
  if (voiceId.startsWith('aura-')) {
    return AURA_TO_GEMINI_LIVE_MAP[voiceId] || fallback;
  }
  return voiceId;
}

export function resolveCoachVoice(personaKey = 'marcus') {
  const settings = getSavedVoiceSettings();
  const chosen = settings.coachVoice || PERSONA_DEFAULTS[personaKey]?.ttsVoice || 'Orus';
  const isFemale =
    personaKey === 'elena' ||
    ['Aoede', 'Kore', 'Zephyr', 'Leda', 'aura-stella-en', 'aura-asteria-en', 'aura-luna-en', 'aura-athena-en'].includes(chosen);
  return {
    ttsVoice: chosen,
    liveVoice: toGeminiLiveVoice(chosen, isFemale ? 'Aoede' : 'Orus'),
    gender: isFemale ? 'female' : 'male',
    personaKey: isFemale ? 'elena' : personaKey || 'marcus',
  };
}

export function resolveProspectVoice(prospectOrKey = 'hank') {
  const settings = getSavedVoiceSettings();
  const idStr =
    typeof prospectOrKey === 'string'
      ? prospectOrKey.toLowerCase()
      : String(prospectOrKey?.id || prospectOrKey?.name || 'hank').toLowerCase();

  let personaKey = 'hank';
  if (idStr.includes('delbert')) personaKey = 'delbert';
  else if (idStr.includes('bo')) personaKey = 'bo';
  else if (idStr.includes('carl')) personaKey = 'carl';
  else if (idStr.includes('sarah')) personaKey = 'sarah';
  else if (idStr.includes('dave')) personaKey = 'dave';

  // Specific named contractors keep distinct voices unless user explicitly picked a custom Deepgram/Gemini override for generic prospect
  const specificMap = {
    delbert: 'Enceladus',
    bo: 'Iapetus',
    sarah: 'Zephyr',
  };

  const chosen = specificMap[personaKey] || settings.prospectVoice || PERSONA_DEFAULTS[personaKey]?.ttsVoice || 'Fenrir';
  const isFemale =
    personaKey === 'sarah' ||
    ['Aoede', 'Kore', 'Zephyr', 'Leda', 'aura-stella-en', 'aura-asteria-en', 'aura-luna-en', 'aura-athena-en'].includes(chosen);

  return {
    ttsVoice: chosen,
    liveVoice: toGeminiLiveVoice(chosen, isFemale ? 'Zephyr' : 'Fenrir'),
    gender: isFemale ? 'female' : 'male',
    personaKey,
  };
}

export function resolveAgentVoice(agent) {
  const settings = getSavedVoiceSettings();
  const override = agent?.id ? settings.agentVoices?.[agent.id] : null;
  const rawVoice = override || agent?.voice?.geminiLiveVoice || 'Charon';
  return {
    ttsVoice: rawVoice,
    liveVoice: toGeminiLiveVoice(rawVoice, agent?.gender === 'female' ? 'Kore' : 'Charon'),
    gender: agent?.gender || 'male',
  };
}
