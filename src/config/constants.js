/**
 * Application-wide configuration constants
 */

// Audio configuration
export const AUDIO_CONFIG = {
  MEDIA_RECORDER_CHUNK_INTERVAL: 250, // ms
  SAMPLE_RATE: 48000,
  ENCODING: 'linear16',
  ECHO_CANCELLATION: true,
  NOISE_SUPPRESSION: true,
  AUTO_GAIN_CONTROL: true,
};

// Deepgram configuration
export const DEEPGRAM_CONFIG = {
  MODEL: 'aura-asteria-en',
  ENCODING: AUDIO_CONFIG.ENCODING,
  SAMPLE_RATE: AUDIO_CONFIG.SAMPLE_RATE,
};

// Orchestrator configuration
export const ORCHESTRATOR_CONFIG = {
  GENERATION_DEBOUNCE_MS: 300,
  ORCHESTRATION_CHECK_INTERVAL_MS: 200,
};

// UI configuration
export const UI_CONFIG = {
  ZOOM: {
    DEFAULT: 100,
    MIN: 50,
    MAX: 150,
    STEP: 10,
  },
  PLAYBACK_SPEED: {
    DEFAULT: 1,
    OPTIONS: [0.75, 1, 1.25, 1.5],
  },
  SENSITIVITY: {
    DEFAULT: 50,
    MIN: 0,
    MAX: 100,
    STEP: 5,
  },
  RECORDING_TIMER_INTERVAL_MS: 100,
  PROGRESS: {
    MAX_CONVERSATIONS: 10, // Used for progress bar calculation
  },
};

// Route constants
export const ROUTES = {
  LOGIN: '/login',
  CREATE_ACCOUNT: '/create-account',
  FORGOT_PASSWORD: '/forgot-password',
  DASHBOARD: '/dashboard',
  SCRIPT_BUILDER: '/script-builder',
  PRACTICE: '/practice',
  FEEDBACK: '/feedback',
  SAVED_SCRIPTS: '/saved-scripts',
  SETTINGS: '/settings',
};

export const PUBLIC_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.CREATE_ACCOUNT,
  ROUTES.FORGOT_PASSWORD,
];

// API endpoints (Supabase functions)
export const API_ENDPOINTS = {
  GENERATE_SCRIPT: 'generate-script',
  GENERATE_FEEDBACK: 'generate-feedback',
  GENERATE_PROSPECT_RESPONSE: 'generate-prospect-response',
};
