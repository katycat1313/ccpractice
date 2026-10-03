/**
 * Call Recordings Service
 * Stores and manages cold call practice audio recordings with
 * playable data URLs, scrubbable durations, prospect info, and deletion.
 */

const STORAGE_KEY = 'scriptmaster_call_recordings';

// Seed sample recordings so the user immediately has recordings to listen to, scrub, and delete
const SEED_RECORDINGS = [
  {
    id: 'rec-sample-1',
    title: 'Practice Call: Commercial Roofing 20-Sec Hook',
    prospectName: 'Hank Miller (Miller Roofing & HVAC)',
    scriptTitle: 'Commercial Roofing - 50% Closer',
    date: new Date(Date.now() - 3600000 * 2).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    time: '2:15 PM',
    duration: 82, // 1m 22s
    durationFormatted: '01:22',
    notes: 'Handled "busy in truck" objection cleanly with the 20-second contract interrupt.',
    audioUrl: null, // synthesized tone fallback or simulated audio
    waveform: [25, 45, 60, 30, 80, 95, 70, 40, 65, 85, 90, 50, 45, 60, 30, 75, 80, 55, 30, 20]
  },
  {
    id: 'rec-sample-2',
    title: 'Objection Drill: 50% Deposit Closer',
    prospectName: 'Julian Thorne (Apex Tech Brands)',
    scriptTitle: '50% Milestone Staging Script',
    date: new Date(Date.now() - 3600000 * 24).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    time: '10:45 AM',
    duration: 114, // 1m 54s
    durationFormatted: '01:54',
    notes: 'Successfully flipped upfront payment objection into milestone sprint delivery.',
    audioUrl: null,
    waveform: [30, 60, 75, 45, 50, 85, 65, 70, 90, 100, 80, 60, 50, 70, 40, 80, 90, 60, 40, 25]
  }
];

export function getRecordings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_RECORDINGS));
      return SEED_RECORDINGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load recordings:', err);
    return SEED_RECORDINGS;
  }
}

export function saveRecording(recording) {
  try {
    const current = getRecordings();
    const id = recording.id || `rec-${Date.now()}`;
    const newRecord = {
      ...recording,
      id,
      date: recording.date || new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      time: recording.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationFormatted: formatSeconds(recording.duration || 0),
      waveform: recording.waveform || generateRandomWaveform(24)
    };

    const updated = [newRecord, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('scriptmaster_recordings_updated'));
    return newRecord;
  } catch (err) {
    console.warn('Failed to save recording:', err);
    return recording;
  }
}

export function deleteRecording(id) {
  try {
    const current = getRecordings();
    const filtered = current.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new Event('scriptmaster_recordings_updated'));
    return true;
  } catch (err) {
    console.warn('Failed to delete recording:', err);
    return false;
  }
}

export function formatSeconds(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function generateRandomWaveform(count = 20) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    bars.push(Math.floor(Math.random() * 70) + 25);
  }
  return bars;
}
