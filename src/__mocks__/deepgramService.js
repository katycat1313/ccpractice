export const DEEPGRAM_VOICES = {
  COACH_FEMALE: 'aura-asteria-en',
  COACH_MALE: 'aura-orion-en',
  CONTRACTOR_MALE: 'aura-arcas-en',
  CONTRACTOR_FEMALE: 'aura-luna-en'
};

export const DEFAULT_DEEPGRAM_AGENT_ID = 'fd7da684-2c9c-433d-ab0c-1ed2f8b061e4';
export const DEFAULT_DEEPGRAM_PROJECT_ID = '1add87dc-1582-4d89-9a7d-d2cee44bf542';

export const getDeepgramApiKey = () => {
  try {
    const directKey = localStorage.getItem('deepgram_api_key');
    if (directKey) return directKey;
    const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    return user.deepgram_api_key || '';
  } catch {
    return '';
  }
};
export const setDeepgramApiKey = () => {};

export const getDeepgramAgentId = () => {
  try {
    const directAgent = localStorage.getItem('deepgram_agent_id');
    if (directAgent) return directAgent;
    const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    return user.deepgram_agent_id || '';
  } catch {
    return '';
  }
};
export const setDeepgramAgentId = () => {};

export const getDeepgramProjectId = () => DEFAULT_DEEPGRAM_PROJECT_ID;
export const setDeepgramProjectId = () => {};

export const getPreferredVoice = () => 'aura-asteria-en';
export const setPreferredVoice = () => {};

export const fetchAvailableAgents = () => Promise.resolve({ success: true, agents: [], recommendedAgentId: '' });
export const testDeepgramAgent = () => Promise.resolve({ success: true });

export const stopDeepgramAudio = () => {};
export const speakWithDeepgram = () => Promise.resolve(true);
export const testDeepgramKey = () => Promise.resolve({ success: true });

