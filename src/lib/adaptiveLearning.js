/**
 * Adaptive Weak-Area Learning & Pressure Engine
 *
 * Tracks every live video interview & KRECHET Academy sales call debrief,
 * identifies recurring weak areas, computes skill mastery progress, and injects
 * targeted PRESSURE DIRECTIVES into future Gemini Live sessions so the AI
 * interviewer/prospect actively drills those exact weaknesses.
 */

const ADAPTIVE_STORAGE_KEY = 'scriptmaster_adaptive_learning_v1';

const DEFAULT_ADAPTIVE_STATE = {
  sessions: [], // recent debrief summaries
  competencies: {
    architecture_depth: { key: 'architecture_depth', label: 'Project Architecture Depth', score: 0, attempts: 0, mode: 'interview' },
    solutions_framing: { key: 'solutions_framing', label: 'Solutions Discovery & Framing', score: 0, attempts: 0, mode: 'interview' },
    concise_clarity: { key: 'concise_clarity', label: 'Concise Executive Clarity', score: 0, attempts: 0, mode: 'interview' },
    tradeoff_defense: { key: 'tradeoff_defense', label: 'Trade-off & Constraint Defense', score: 0, attempts: 0, mode: 'interview' },
    impact_proof: { key: 'impact_proof', label: 'Project Impact & Metrics Proof', score: 0, attempts: 0, mode: 'interview' },
    vocal_composure: { key: 'vocal_composure', label: 'Vocal Presence & Barge-In Composure', score: 0, attempts: 0, mode: 'interview' },
    agency_discovery: { key: 'agency_discovery', label: 'Agency Pain Discovery', score: 0, attempts: 0, mode: 'agency-pitch' },
    screen_share_demo: { key: 'screen_share_demo', label: 'Screen-Share & Demo Flow', score: 0, attempts: 0, mode: 'agency-pitch' },
    krechet_value: { key: 'krechet_value', label: 'Simulation & Workshop Proof', score: 0, attempts: 0, mode: 'agency-pitch' },
    package_roi_defense: { key: 'package_roi_defense', label: 'Seat / White-Label ROI Defense', score: 0, attempts: 0, mode: 'agency-pitch' },
    objection_handling: { key: 'objection_handling', label: 'ROI & Budget Objection Handling', score: 0, attempts: 0, mode: 'agency-pitch' },
    executive_frame: { key: 'executive_frame', label: 'Executive Frame & Barge-In Recovery', score: 0, attempts: 0, mode: 'agency-pitch' },
    closing_control: { key: 'closing_control', label: 'Closing & Next-Step Control', score: 0, attempts: 0, mode: 'agency-pitch' },
    rapport_frame: { key: 'rapport_frame', label: 'Opening Frame & Agenda Control', score: 0, attempts: 0, mode: 'discovery' },
    symptom_to_root: { key: 'symptom_to_root', label: 'Surface-to-Root Pain Discovery', score: 0, attempts: 0, mode: 'discovery' },
    quantifying_pain: { key: 'quantifying_pain', label: 'Quantifying Cost of Inaction', score: 0, attempts: 0, mode: 'discovery' },
    tailored_solution_fit: { key: 'tailored_solution_fit', label: 'Tailored App / Service Positioning', score: 0, attempts: 0, mode: 'discovery' },
    discovery_objections: { key: 'discovery_objections', label: 'Skepticism & Timing Navigation', score: 0, attempts: 0, mode: 'discovery' },
    next_step_commitment: { key: 'next_step_commitment', label: 'Scoped Next-Step Commitment', score: 0, attempts: 0, mode: 'discovery' },
  },
  weakAreas: [], // { key, label, score, note, pressureDirective, mode, updatedAt }
  lastUpdated: null,
};

export function getAdaptiveLearningState() {
  try {
    const raw = localStorage.getItem(ADAPTIVE_STORAGE_KEY);
    if (!raw) return DEFAULT_ADAPTIVE_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ADAPTIVE_STATE,
      ...parsed,
      competencies: {
        ...DEFAULT_ADAPTIVE_STATE.competencies,
        ...(parsed.competencies || {}),
      },
      weakAreas: Array.isArray(parsed.weakAreas) ? parsed.weakAreas : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return DEFAULT_ADAPTIVE_STATE;
  }
}

export function recordDebriefToAdaptiveEngine({
  mode = 'interview',
  personaName = 'Interviewer',
  durationSeconds = 0,
  debrief,
}) {
  if (!debrief || debrief.isSilentFailure) return getAdaptiveLearningState();

  const current = getAdaptiveLearningState();
  const nextCompetencies = { ...current.competencies };

  for (const comp of debrief.competencies || []) {
    if (!comp?.key) continue;
    const prev = nextCompetencies[comp.key] || {
      key: comp.key,
      label: comp.label || comp.key,
      score: 0,
      attempts: 0,
      mode,
    };
    const prevAttempts = prev.attempts || 0;
    const blendedScore =
      prevAttempts === 0
        ? Math.round(comp.score || 0)
        : Math.round(prev.score * 0.4 + (comp.score || 0) * 0.6);
    nextCompetencies[comp.key] = {
      ...prev,
      label: comp.label || prev.label,
      score: Math.max(0, Math.min(100, blendedScore)),
      attempts: prevAttempts + 1,
      lastFeedback: comp.feedback || '',
      mode,
    };
  }

  // Merge learned weak areas (keep most urgent/recent per skill)
  const weakMap = new Map((current.weakAreas || []).map((w) => [w.key || w.label, w]));
  for (const w of debrief.weakAreas || []) {
    const id = w.key || w.label;
    if (!id) continue;
    weakMap.set(id, {
      key: id,
      label: w.label || id,
      score: Number(w.score ?? 50),
      note: w.evidence || '',
      pressureDirective: w.pressureDirective || `Push hard with follow-up questions on ${w.label}.`,
      mode,
      updatedAt: new Date().toISOString(),
    });
  }

  // Prune weak areas whose blended competency score has now crossed 82+
  for (const [k, comp] of Object.entries(nextCompetencies)) {
    if (comp.attempts > 0 && comp.score >= 82 && weakMap.has(k)) {
      weakMap.delete(k);
    }
  }

  const nextWeakAreas = Array.from(weakMap.values())
    .sort((a, b) => (a.score ?? 50) - (b.score ?? 50))
    .slice(0, 6);

  const sessionRecord = {
    id: `sess-${Date.now()}`,
    mode,
    personaName,
    durationSeconds,
    overallScore: debrief.overallScore || 0,
    grade: debrief.grade || 'C',
    summary: debrief.summary || '',
    nextCallPressurePlan: debrief.nextCallPressurePlan || '',
    createdAt: new Date().toISOString(),
  };

  const nextState = {
    sessions: [sessionRecord, ...(current.sessions || [])].slice(0, 25),
    competencies: nextCompetencies,
    weakAreas: nextWeakAreas,
    lastUpdated: new Date().toISOString(),
  };

  try {
    localStorage.setItem(ADAPTIVE_STORAGE_KEY, JSON.stringify(nextState));
    window.dispatchEvent(new CustomEvent('scriptmaster_adaptive_updated', { detail: nextState }));
  } catch {
    /* ignore */
  }

  return nextState;
}

export function getPressureDirectivesForMode(mode = 'interview') {
  const state = getAdaptiveLearningState();
  const modeWeak = (state.weakAreas || []).filter((w) => !w.mode || w.mode === mode);
  return modeWeak.length > 0 ? modeWeak : state.weakAreas || [];
}

export function buildPressurePromptBlock(mode = 'interview') {
  const targets = getPressureDirectivesForMode(mode);
  if (!targets.length) {
    return `ADAPTIVE PRESSURE MODE: This is a baseline evaluation. Probe deeply on concrete metrics, real tradeoffs, and direct answers—do not accept vague generalizations.`;
  }

  return `ADAPTIVE PRESSURE TARGETS (LEARNED FROM USER'S PREVIOUS SESSIONS — MUST APPLY PRESSURE HERE):
The candidate has shown specific weak areas in recent sessions. Intentionally press, challenge, and follow up on these exact areas during this call to force measurable improvement:
${targets
  .slice(0, 3)
  .map(
    (w, i) =>
      `${i + 1}. ${w.label} (Current Score: ${w.score}/100)\n   - Observed Gap: ${w.note || 'Needs sharper specificity'}\n   - Required Pressure Tactic: ${w.pressureDirective}`
  )
  .join('\n')}`;
}
