const STORAGE_KEY = 'scriptmaster_learning_progress';

export const LESSON_PATH = [
  { id: 'lesson-architecture', title: 'Cold Call Architecture', level: 'foundation' },
  { id: 'lesson-blueprint', title: 'The 4-Part Script Blueprint', level: 'guided' },
  { id: 'lesson-frame-control', title: 'Tone, Pace & Frame Control', level: 'developing' },
  { id: 'lesson-business-research', title: 'Researching a Business Before the Call', level: 'developing' },
  { id: 'lesson-pain-point-research', title: 'Turning Research Into Pain-Point Hypotheses', level: 'advanced' },
  { id: 'lesson-live-qualification', title: 'Qualifying and Verifying Pain on the Call', level: 'advanced' },
  { id: 'lesson-research-to-script', title: 'Using Findings in a Personalized Cold Call', level: 'advanced' }
];

export function getLearningProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      currentLessonId: saved.currentLessonId || LESSON_PATH[0].id,
      stage: saved.stage || 'baseline',
      completedLessons: Array.isArray(saved.completedLessons) ? saved.completedLessons : [],
      baselineTurns: Number(saved.baselineTurns || 0),
      lastScore: saved.lastScore ?? null,
      lastUpdated: saved.lastUpdated || null
    };
  } catch {
    return { currentLessonId: LESSON_PATH[0].id, stage: 'baseline', completedLessons: [], baselineTurns: 0, lastScore: null, lastUpdated: null };
  }
}

export function recordLearningTurn({ score = null, completedLesson = false } = {}) {
  const progress = getLearningProgress();
  const completedLessons = [...progress.completedLessons];
  if (completedLesson && !completedLessons.includes(progress.currentLessonId)) completedLessons.push(progress.currentLessonId);
  const currentIndex = LESSON_PATH.findIndex((lesson) => lesson.id === progress.currentLessonId);
  const nextLesson = completedLesson && LESSON_PATH[currentIndex + 1];
  const next = {
    ...progress,
    stage: completedLesson ? (nextLesson ? 'ready_to_advance' : 'practice_ready') : (progress.stage === 'baseline' ? 'guided' : progress.stage),
    currentLessonId: nextLesson ? nextLesson.id : progress.currentLessonId,
    completedLessons,
    baselineTurns: progress.baselineTurns + 1,
    lastScore: score,
    lastUpdated: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('scriptmaster_learning_progress', { detail: next }));
  return next;
}
