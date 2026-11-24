import React, { useEffect, useState, useRef } from 'react';
import { X, Volume2, RotateCcw } from 'lucide-react';
import {
  SALES_SCENARIO_OPTIONS,
  buildPresetSessionConfig,
} from '../lib/agentsConfig';
import {
  GEMINI_LIVE_VOICES,
  resolveAgentVoice,
  saveAgentVoiceOverride,
} from '../lib/voiceResolver';

export default function AvatarSessionSetupModal({
  isOpen,
  agent,
  initialConfig,
  dossier,
  onClose,
  onSaveOnly,
  onLaunchSession,
}) {
  const [draft, setDraft] = useState(() =>
    initialConfig ||
    buildPresetSessionConfig({
      agent,
      track: 'sales',
      salesScenario: 'discovery',
      dossier,
    })
  );
  const [, setVoiceTick] = useState(0);
  const refAudioRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !agent) return;
    setDraft(
      initialConfig ||
        buildPresetSessionConfig({
          agent,
          track: 'sales',
          salesScenario: 'discovery',
          dossier,
        })
    );
  }, [isOpen, agent, initialConfig, dossier]);

  useEffect(() => {
    return () => {
      if (refAudioRef.current) {
        refAudioRef.current.pause();
        refAudioRef.current = null;
      }
    };
  }, []);

  if (!isOpen || !agent) return null;

  const resolvedVoice = resolveAgentVoice(agent);

  const handleTrackSwitch = (nextTrack) => {
    const preset = buildPresetSessionConfig({
      agent,
      track: nextTrack,
      salesScenario: draft.salesScenario || 'discovery',
      dossier,
    });
    setDraft(preset);
  };

  const handleSalesScenarioSwitch = (nextScenario) => {
    const preset = buildPresetSessionConfig({
      agent,
      track: 'sales',
      salesScenario: nextScenario,
      dossier,
    });
    setDraft(preset);
  };

  const handleResetPreset = () => {
    const preset = buildPresetSessionConfig({
      agent,
      track: draft.track || 'sales',
      salesScenario: draft.salesScenario || 'discovery',
      dossier,
    });
    setDraft(preset);
  };

  const handleVoiceChange = (voiceId) => {
    saveAgentVoiceOverride(agent.id, voiceId);
    setVoiceTick((t) => t + 1);
  };

  const handlePlayRefSample = () => {
    if (!agent.referenceVoiceUrl) return;
    if (refAudioRef.current) {
      refAudioRef.current.pause();
      refAudioRef.current = null;
    }
    const audio = new Audio(agent.referenceVoiceUrl);
    refAudioRef.current = audio;
    audio.play().catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0d121c] border border-slate-800 text-slate-100 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Selected Avatar Actor + Voice Control */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
              <img
                src={agent.portraitUrl}
                alt={agent.displayName}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (agent.fallbackSheetUrl && e.currentTarget.src.indexOf(agent.fallbackSheetUrl) === -1) {
                    e.currentTarget.src = agent.fallbackSheetUrl;
                    e.currentTarget.style.objectPosition = '82% 18%';
                  }
                }}
                className="w-full h-full object-cover object-[50%_18%]"
              />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white truncate">
                Configure Session with {agent.displayName}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose Sales Call or Job Interview, define who {agent.displayName} plays, then launch.
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-2">
                <label className="text-[11px] text-slate-400 whitespace-nowrap">Voice:</label>
                <select
                  value={resolvedVoice.liveVoice}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="rounded-lg bg-[#080b11] border border-slate-800 px-2.5 py-1 text-xs font-medium text-white focus:outline-none focus:border-indigo-500"
                >
                  {GEMINI_LIVE_VOICES.map((v) => (
                    <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                      {v.label}
                    </option>
                  ))}
                </select>

                {agent.referenceVoiceUrl && (
                  <button
                    type="button"
                    onClick={handlePlayRefSample}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-indigo-300 flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Ref Sample</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors shrink-0"
            aria-label="Close session setup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* 1. Primary Track Selector: Sales Call vs Job Interview */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">01. Session Type</div>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#080b11] border border-slate-800">
              <button
                type="button"
                onClick={() => handleTrackSwitch('sales')}
                className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  draft.track === 'sales'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sales Call (Discovery or KRECHET Pitch)
              </button>
              <button
                type="button"
                onClick={() => handleTrackSwitch('interview')}
                className={`py-2 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  draft.track === 'interview'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Job Interview (Position &amp; Company)
              </button>
            </div>
          </div>

          {/* 2. Sales Sub-Scenario Selector */}
          {draft.track === 'sales' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                02. Sales Call Goal &amp; Offer
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SALES_SCENARIO_OPTIONS.map((opt) => {
                  const active = draft.salesScenario === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSalesScenarioSwitch(opt.id)}
                      className={`text-left p-3 rounded-xl border transition-colors ${
                        active
                          ? 'bg-[#111827] border-indigo-500 text-white'
                          : 'bg-[#080b11] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold text-white">{opt.label}</div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {opt.summary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Role, Position, Company & Custom Persona Inputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-300">
                {draft.track === 'interview'
                  ? `02. Position, Company & Who ${agent.displayName} Plays`
                  : `03. Prospect Company & Who ${agent.displayName} Plays`}
              </div>
              <button
                type="button"
                onClick={handleResetPreset}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 whitespace-nowrap transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Preset</span>
              </button>
            </div>

            {draft.track === 'interview' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Position You Are Interviewing For
                  </label>
                  <input
                    type="text"
                    value={draft.targetPosition || ''}
                    onChange={(e) => setDraft({ ...draft, targetPosition: e.target.value })}
                    placeholder="e.g. Senior AI Solutions Architect"
                    className="w-full rounded-lg bg-[#080b11] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Target Company
                  </label>
                  <input
                    type="text"
                    value={draft.companyName || ''}
                    onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                    placeholder="e.g. Stripe, Vercel, Palantir"
                    className="w-full rounded-lg bg-[#080b11] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    {agent.displayName}&apos;s Title
                  </label>
                  <input
                    type="text"
                    value={draft.counterpartRole || ''}
                    onChange={(e) => setDraft({ ...draft, counterpartRole: e.target.value })}
                    placeholder="e.g. VP of Engineering"
                    className="w-full rounded-lg bg-[#080b11] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    {agent.displayName}&apos;s Prospect Role / Title
                  </label>
                  <input
                    type="text"
                    value={draft.counterpartRole || ''}
                    onChange={(e) => setDraft({ ...draft, counterpartRole: e.target.value })}
                    placeholder="e.g. Agency Founder & Managing Partner"
                    className="w-full rounded-lg bg-[#080b11] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Prospect Company / Agency
                  </label>
                  <input
                    type="text"
                    value={draft.companyName || ''}
                    onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                    placeholder="e.g. Vanguard Performance Agency (24 staff)"
                    className="w-full rounded-lg bg-[#080b11] border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                {draft.track === 'interview'
                  ? 'Custom Interviewer Persona, Stack & Questions to Probe'
                  : draft.salesScenario === 'discovery'
                  ? 'Custom Prospect Persona, Business Context & Hidden Bottlenecks to Discover'
                  : 'Custom Agency Persona, Current Training Pain & Objections'}
              </label>
              <textarea
                rows={4}
                value={draft.personaBrief || ''}
                onChange={(e) => setDraft({ ...draft, personaBrief: e.target.value })}
                placeholder={`Type who ${agent.displayName} is playing, their pain points, skepticism level, budget constraints, or exact objections...`}
                className="w-full rounded-xl bg-[#080b11] border border-slate-800 p-3 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#090d16] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onSaveOnly(draft)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            Save Without Calling
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onLaunchSession(draft)}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
            >
              Launch Live Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
