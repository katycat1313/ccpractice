/**
 * Supabase Cloud Sync Utility
 *
 * Automatically persists Career Dossier (Resume, JD, Portfolio URLs),
 * Imported Agents (agents.json), Adaptive Weak Areas, and Call Debriefs to
 * Supabase whenever VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY are configured,
 * while maintaining instant localStorage state.
 */

import { supabase } from '../supabaseClient';

export function isSupabaseLiveConfigured() {
  const url = import.meta.env?.VITE_SUPABASE_URL || '';
  const key = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
  return Boolean(
    url &&
      url.startsWith('http') &&
      !url.includes('example.com') &&
      key &&
      key.length > 20
  );
}

async function resolveUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch {
    /* ignore */
  }
  return null;
}

export async function syncDossierToSupabase(dossier) {
  if (!isSupabaseLiveConfigured()) return { synced: false, reason: 'not_configured' };
  const userId = await resolveUserId();
  if (!userId) return { synced: false, reason: 'no_auth_session' };

  try {
    const { error } = await supabase.from('candidate_dossiers').upsert(
      {
        user_id: userId,
        candidate_title: dossier.candidateTitle,
        resume_data: dossier.resume,
        job_description_data: dossier.jobDescription,
        portfolio_urls: dossier.portfolioUrls,
        krechet_offer: dossier.krechet,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (error) return { synced: false, reason: error.message };
    return { synced: true };
  } catch (err) {
    return { synced: false, reason: err?.message || 'sync_failed' };
  }
}

export async function syncAdaptiveStateToSupabase(adaptiveState, latestSession, debrief) {
  if (!isSupabaseLiveConfigured()) return { synced: false, reason: 'not_configured' };
  const userId = await resolveUserId();
  if (!userId) return { synced: false, reason: 'no_auth_session' };

  try {
    if (latestSession) {
      await supabase.from('practice_sessions').insert({
        user_id: userId,
        persona_name: latestSession.personaName,
        scenario_type: latestSession.mode,
        duration_seconds: latestSession.durationSeconds || 0,
        overall_score: latestSession.overallScore || 0,
        strengths: debrief?.strengths || [],
        improvements: (debrief?.weakAreas || []).map((w) => w.label),
        metadata: {
          grade: latestSession.grade,
          competencies: debrief?.competencies || [],
          nextCallPressurePlan: debrief?.nextCallPressurePlan || '',
        },
      });
    }

    for (const weak of adaptiveState?.weakAreas || []) {
      await supabase.from('adaptive_weak_areas').upsert(
        {
          user_id: userId,
          skill_key: weak.key,
          skill_label: weak.label,
          mode: weak.mode || 'interview',
          current_score: weak.score || 50,
          evidence: weak.note || '',
          pressure_directive: weak.pressureDirective || '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,skill_key' }
      );
    }

    return { synced: true };
  } catch (err) {
    return { synced: false, reason: err?.message || 'sync_failed' };
  }
}

export async function syncAgentsToSupabase(agents = []) {
  if (!isSupabaseLiveConfigured()) return { synced: false, reason: 'not_configured' };
  const userId = await resolveUserId();
  if (!userId) return { synced: false, reason: 'no_auth_session' };

  try {
    for (const agent of agents) {
      await supabase.from('agent_interviewers').upsert(
        {
          user_id: userId,
          agent_id: agent.id,
          display_name: agent.displayName,
          faction: agent.faction || 'CustomPanel',
          role_title: agent.roleTitle || '',
          gemini_voice: agent.voice?.geminiLiveVoice || 'Fenrir',
          agent_payload: agent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,agent_id' }
      );
    }
    return { synced: true };
  } catch (err) {
    return { synced: false, reason: err?.message || 'sync_failed' };
  }
}
