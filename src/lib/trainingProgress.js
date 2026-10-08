const STORAGE_KEY = 'scriptmaster_training_drills';

const DEFAULT_DRILLS = ['hook', 'pacing', 'fillers', 'qualification', 'objection', 'closing'];

export function getTrainingDrills() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return DEFAULT_DRILLS.reduce((all, id) => {
      all[id] = saved[id] || { attempts: 0, misses: 0, mastery: 0, nextReviewAt: 0 };
      return all;
    }, {});
  } catch {
    return DEFAULT_DRILLS.reduce((all, id) => ({ ...all, [id]: { attempts: 0, misses: 0, mastery: 0, nextReviewAt: 0 } }), {});
  }
}

export function recordTrainingResult(metrics = {}, feedback = {}) {
  const drills = getTrainingDrills();
  const now = Date.now();
  const misses = {
    hook: metrics.hookWords > 50,
    pacing: metrics.paceLabel === 'Too fast' || metrics.paceLabel === 'Too slow',
    fillers: metrics.fillerCount > 2,
    qualification: (metrics.qualificationSignals?.length || 0) < 2,
    objection: /not detected|missed|weak/i.test(feedback.rebuttalFeedback || ''),
    closing: /missing|weak|unclear/i.test(feedback.keyTakeaway || '')
  };
  Object.keys(drills).forEach((id) => {
    const wasMissed = Boolean(misses[id]);
    const attempts = drills[id].attempts + 1;
    const missCount = drills[id].misses + (wasMissed ? 1 : 0);
    const mastery = Math.max(0, Math.min(100, drills[id].mastery + (wasMissed ? -8 : 12)));
    const interval = wasMissed ? 1 : Math.min(14, Math.max(1, Math.ceil((mastery || 1) / 20)));
    drills[id] = { attempts, misses: missCount, mastery, nextReviewAt: now + interval * 86400000 };
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drills));
  window.dispatchEvent(new CustomEvent('scriptmaster_training_progress', { detail: drills }));
  return drills;
}

export function getNextTrainingDrill() {
  const drills = getTrainingDrills();
  return Object.entries(drills)
    .sort(([, a], [, b]) => (a.mastery - b.mastery) || (a.nextReviewAt - b.nextReviewAt))[0]?.[0] || 'hook';
}

export function getAdaptiveDifficulty() {
  const drills = Object.values(getTrainingDrills());
  const mastery = drills.length
    ? drills.reduce((sum, drill) => sum + drill.mastery, 0) / drills.length
    : 0;
  if (mastery < 25) return { level: 'supported', help: 'show the exact line and give one cue at a time' };
  if (mastery < 60) return { level: 'guided', help: 'show the script but let the student choose the next question' };
  if (mastery < 85) return { level: 'developing', help: 'show only key prompts and introduce realistic objections' };
  return { level: 'independent', help: 'hide most prompts and evaluate unscripted qualification' };
}
