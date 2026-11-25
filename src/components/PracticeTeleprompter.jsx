import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  FileText,
  Clock,
  Copy,
  Check,
  Plus,
  Trash2,
  Sparkles,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  ArrowRight,
  BookOpen,
  Edit3,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { getAllSavedScripts, getActiveScript, BUILTIN_TEMPLATES } from '../lib/coachActions';

/**
 * PracticeTeleprompter: Full-Script Read Mode + Live-Editable Script Teleprompter
 * Pinned beside call controls in Practice Studio & Workshop Drills.
 * Defaults to a continuous, unclipped Full Script Read View with one-click Edit & Expand toggles.
 */
export default function PracticeTeleprompter({
  script = null,
  onScriptChange,
  onInsertText = null,
  onDemonstrate = null,
  activeObjectionIndex = null,
  activeScriptPart = 'hook',
  isCallActive = false,
  isExpanded = false,
  onToggleExpand = null,
  className = '',
}) {
  const [currentScript, setCurrentScript] = useState(() => script || getActiveScript());
  const [savedScripts, setSavedScripts] = useState(() => getAllSavedScripts());
  const [viewMode, setViewMode] = useState('read'); // 'read' (full continuous script) | 'edit'
  const [copiedField, setCopiedField] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(105); // 90% - 140%
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    pitch: false,
    rebuttals: false,
    closing: false,
  });

  const hookRef = useRef(null);
  const painRef = useRef(null);
  const rebuttalsRef = useRef(null);
  const closeRef = useRef(null);
  const objectionRefs = useRef([]);

  // Sync with incoming script props
  useEffect(() => {
    if (script) {
      setCurrentScript(script);
    }
  }, [script]);

  // Auto-scroll highlighted objection into view during live calls
  useEffect(() => {
    if (activeObjectionIndex !== null && activeObjectionIndex >= 0 && objectionRefs.current[activeObjectionIndex]) {
      try {
        objectionRefs.current[activeObjectionIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        /* ignore */
      }
    }
  }, [activeObjectionIndex]);

  // Sync with global script update events
  useEffect(() => {
    const handleScriptUpdated = () => {
      try {
        const active = getActiveScript();
        if (active) setCurrentScript(active);
      } catch {
        /* ignore */
      }
    };

    const handleSavedScriptsUpdated = () => {
      setSavedScripts(getAllSavedScripts());
    };

    window.addEventListener('scriptmaster_script_updated', handleScriptUpdated);
    window.addEventListener('scriptmaster_scripts_updated', handleSavedScriptsUpdated);
    return () => {
      window.removeEventListener('scriptmaster_script_updated', handleScriptUpdated);
      window.removeEventListener('scriptmaster_scripts_updated', handleSavedScriptsUpdated);
    };
  }, []);

  const resolvedProblem =
    currentScript.problem ||
    (typeof currentScript.painValue === 'object' && currentScript.painValue !== null
      ? currentScript.painValue.problem
      : typeof currentScript.painValue === 'string'
      ? currentScript.painValue
      : '') ||
    '';

  const resolvedValue =
    currentScript.value ||
    (typeof currentScript.painValue === 'object' && currentScript.painValue !== null
      ? currentScript.painValue.value
      : '') ||
    '';

  const handleFieldUpdate = (field, value) => {
    const updated = { ...currentScript, [field]: value };
    if (field === 'problem' || field === 'value') {
      updated.painValue = {
        problem: field === 'problem' ? value : resolvedProblem,
        value: field === 'value' ? value : resolvedValue,
      };
    }
    setCurrentScript(updated);

    try {
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(updated));
      localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('scriptmaster_script_updated'));
    } catch {
      /* ignore */
    }

    if (onScriptChange) {
      onScriptChange(updated);
    }

    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const handleSelectScript = (idOrTitle) => {
    const all = [...savedScripts, ...BUILTIN_TEMPLATES];
    const match = all.find(
      (s) =>
        (s.id && s.id === idOrTitle) ||
        (s.title && s.title === idOrTitle) ||
        (s.name && s.name === idOrTitle)
    );
    if (match) {
      const normalized = {
        ...match,
        problem:
          match.problem ||
          (typeof match.painValue === 'object' && match.painValue !== null
            ? match.painValue.problem
            : typeof match.painValue === 'string'
            ? match.painValue
            : ''),
        value:
          match.value ||
          (typeof match.painValue === 'object' && match.painValue !== null
            ? match.painValue.value
            : ''),
      };
      setCurrentScript(normalized);
      try {
        localStorage.setItem('scriptmaster_active_script', JSON.stringify(normalized));
        localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
        window.dispatchEvent(new Event('scriptmaster_script_updated'));
      } catch {
        /* ignore */
      }
      if (onScriptChange) {
        onScriptChange(normalized);
      }
      setSaveIndicator(true);
      setTimeout(() => setSaveIndicator(false), 2000);
    }
  };

  const handleRebuttalChange = (index, key, value) => {
    const rebuttals = [...(currentScript.rebuttals || [])];
    rebuttals[index] = { ...rebuttals[index], [key]: value };
    handleFieldUpdate('rebuttals', rebuttals);
  };

  const handleAddRebuttal = () => {
    const rebuttals = [
      ...(currentScript.rebuttals || []),
      {
        objection: 'e.g. Just send me an email to my office',
        response: 'Happy to email, but give me 20 seconds first to see if it even fits. Fair?',
      },
    ];
    handleFieldUpdate('rebuttals', rebuttals);
  };

  const handleDeleteRebuttal = (index) => {
    const rebuttals = (currentScript.rebuttals || []).filter((_, i) => i !== index);
    handleFieldUpdate('rebuttals', rebuttals);
  };

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const buildFullScriptPlainText = () => {
    const rebuttalsBlock = (currentScript.rebuttals || [])
      .map((r, idx) => `Objection #${idx + 1}: "${r.objection}"\nResponse: ${r.response}`)
      .join('\n\n');

    return [
      `SCRIPT: ${currentScript.title || 'Working Script'}`,
      currentScript.target ? `TARGET: ${currentScript.target}` : '',
      `\n1. OPENING HOOK\n${currentScript.hook || ''}`,
      currentScript.deliveryNotes ? `\nDELIVERY CUES\n${currentScript.deliveryNotes}` : '',
      `\n2. PAIN & VALUE\nPain: ${resolvedProblem}\nValue: ${resolvedValue}`,
      rebuttalsBlock ? `\n3. OBJECTION REBUTTALS\n${rebuttalsBlock}` : '',
      `\n4. CLOSING ASK\n${currentScript.closingAsk || ''}`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const toggleSection = (section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const scrollToRef = (ref) => {
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Metrics
  const hookWords = (currentScript.hook || '').trim().split(/\s+/).filter(Boolean).length;
  const hookEstimatedSecs = Math.round(hookWords / 2.5);
  const isHookOptimal = hookEstimatedSecs <= 20;

  const krechetTemplates = BUILTIN_TEMPLATES.filter((t) => t.category === 'krechet');
  const contractorTemplates = BUILTIN_TEMPLATES.filter((t) => t.category !== 'krechet');

  const bodyFontSize = `${(zoomLevel / 100) * 0.92}rem`;

  return (
    <div
      className={`bg-slate-900/95 rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* =========================================================================
          TELEPROMPTER HEADER & CONTROLS
         ========================================================================= */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Full Script Studio
              </h3>
              {isCallActive && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
              {saveIndicator && (
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Saved
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
              {currentScript.title || 'Working Script'}
            </p>
          </div>
        </div>

        {/* Read/Edit Toggle, Copy All, Zoom & Expand */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('read')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'read'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Read entire script without text boxes"
            >
              <BookOpen className="w-3 h-3" />
              <span>Full Script</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                viewMode === 'edit'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Edit script fields live"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(buildFullScriptPlainText(), 'all')}
            className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Copy full script"
          >
            {copiedField === 'all' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <div className="flex items-center gap-0.5 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(90, prev - 10))}
              className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              title="Decrease text size"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1 font-semibold">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(140, prev + 10))}
              className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              title="Increase text size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(105)}
              className="p-1 text-slate-500 hover:text-slate-300 rounded transition cursor-pointer"
              title="Reset text size"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className={`px-2 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                isExpanded
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={isExpanded ? 'Restore split layout' : 'Expand full script width'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden xl:inline">{isExpanded ? 'Split' : 'Expand'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Script Selector + Section Quick-Jump Bar */}
      <div className="px-4 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-bold text-slate-300">Script:</span>
          </div>
          <select
            value={currentScript.id || currentScript.title || ''}
            onChange={(e) => handleSelectScript(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 text-slate-100 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer flex-1 min-w-0"
            title="Switch script on teleprompter"
          >
            {savedScripts.length > 0 && (
              <optgroup label="Your Saved Scripts">
                {savedScripts.map((s) => (
                  <option key={s.id || s.title} value={s.id || s.title}>
                    {s.title || s.name}
                  </option>
                ))}
              </optgroup>
            )}
            {krechetTemplates.length > 0 && (
              <optgroup label="KRECHET Academy Agency Scripts">
                {krechetTemplates.map((t) => (
                  <option key={t.id || t.title} value={t.id || t.title}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Contractor Pitch Templates">
              {contractorTemplates.map((t) => (
                <option key={t.id || t.title} value={t.id || t.title}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Section Quick-Jump Bar */}
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { label: '1. Hook', part: 'hook', ref: hookRef },
              { label: '2. Pain & Value', part: 'problem', ref: painRef },
              { label: `3. Rebuttals (${currentScript.rebuttals?.length || 0})`, part: 'rebuttal', ref: rebuttalsRef },
              { label: '4. Close', part: 'close', ref: closeRef },
            ].map((item) => {
              const isActive =
                activeScriptPart === item.part ||
                (item.part === 'problem' && activeScriptPart === 'value');
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => scrollToRef(item.ref)}
                  className={`px-2 py-0.5 rounded-md font-bold transition shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 shrink-0 ${
              isHookOptimal
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>
              Hook: {hookWords}w (~{hookEstimatedSecs}s)
            </span>
          </span>
        </div>
      </div>

      {/* =========================================================================
          BODY: FULL SCRIPT CONTINUOUS READ MODE vs. LIVE EDIT MODE
         ========================================================================= */}
      {viewMode === 'read' ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-slate-100">
          {/* 1. OPENING HOOK */}
          <section
            ref={hookRef}
            className={`rounded-2xl p-4 border transition-all space-y-3 ${
              activeScriptPart === 'hook'
                ? 'bg-indigo-950/30 border-indigo-400/70 ring-1 ring-indigo-500/40'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 font-black text-[10px] flex items-center justify-center">
                  1
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-300">
                  Opening Hook
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                {onInsertText && (
                  <button
                    type="button"
                    onClick={() => onInsertText(currentScript.hook)}
                    className="px-2 py-0.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>Use</span>
                  </button>
                )}
                {onDemonstrate && (
                  <button
                    type="button"
                    onClick={() => onDemonstrate(currentScript.hook, 'opening hook')}
                    className="px-2 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Model</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentScript.hook, 'hook')}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                  title="Copy hook"
                >
                  {copiedField === 'hook' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <p
              className="text-white font-semibold leading-relaxed whitespace-pre-wrap"
              style={{ fontSize: bodyFontSize }}
            >
              {currentScript.hook || 'No opening hook set yet. Switch to Edit to add one.'}
            </p>

            {currentScript.deliveryNotes && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{currentScript.deliveryNotes}</span>
              </div>
            )}
          </section>

          {/* 2. PAIN & VALUE */}
          <section
            ref={painRef}
            className={`rounded-2xl p-4 border transition-all space-y-4 ${
              activeScriptPart === 'problem' || activeScriptPart === 'value'
                ? 'bg-amber-950/20 border-amber-400/70 ring-1 ring-amber-500/30'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 font-black text-[10px] flex items-center justify-center">
                  2
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Burning Pain &amp; Value Proposition
                </h4>
              </div>
              {onInsertText && (
                <button
                  type="button"
                  onClick={() => onInsertText(`${resolvedProblem} ${resolvedValue}`.trim())}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Use</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                  Burning Pain
                </span>
                <p
                  className="text-slate-200 leading-relaxed whitespace-pre-wrap"
                  style={{ fontSize: bodyFontSize }}
                >
                  {resolvedProblem || '—'}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                  Differentiated Value
                </span>
                <p
                  className="text-slate-100 leading-relaxed whitespace-pre-wrap"
                  style={{ fontSize: bodyFontSize }}
                >
                  {resolvedValue || '—'}
                </p>
              </div>
            </div>
          </section>

          {/* 3. OBJECTION REBUTTALS */}
          <section
            ref={rebuttalsRef}
            className={`rounded-2xl p-4 border transition-all space-y-3 ${
              activeScriptPart === 'rebuttal'
                ? 'bg-rose-950/20 border-rose-400/70 ring-1 ring-rose-500/30'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-300 font-black text-[10px] flex items-center justify-center">
                  3
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                  Objection Rebuttals ({currentScript.rebuttals?.length || 0})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                + Edit / Add
              </button>
            </div>

            <div className="space-y-3">
              {(currentScript.rebuttals || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic">No rebuttals added yet.</p>
              ) : (
                (currentScript.rebuttals || []).map((reb, i) => {
                  const isHighlight = activeObjectionIndex === i;
                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        objectionRefs.current[i] = el;
                      }}
                      className={`p-3.5 rounded-xl border transition-all space-y-1.5 ${
                        isHighlight
                          ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/40'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-amber-300 leading-snug">
                          #{i + 1} Prospect: &ldquo;{reb.objection}&rdquo;
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {onDemonstrate && (
                            <button
                              type="button"
                              onClick={() => onDemonstrate(reb.response, `rebuttal #${i + 1}`)}
                              className="px-1.5 py-0.5 rounded bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                            >
                              Model
                            </button>
                          )}
                          {onInsertText && (
                            <button
                              type="button"
                              onClick={() => onInsertText(reb.response)}
                              className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] font-bold transition cursor-pointer"
                            >
                              Use
                            </button>
                          )}
                        </div>
                      </div>
                      <p
                        className="text-indigo-100 leading-relaxed whitespace-pre-wrap"
                        style={{ fontSize: bodyFontSize }}
                      >
                        {reb.response}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* 4. CLOSING ASK */}
          <section
            ref={closeRef}
            className="rounded-2xl p-4 border bg-emerald-950/20 border-emerald-500/30 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 font-black text-[10px] flex items-center justify-center">
                  4
                </span>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Closing Call to Action
                </h4>
              </div>
              <div className="flex items-center gap-1.5">
                {onDemonstrate && (
                  <button
                    type="button"
                    onClick={() => onDemonstrate(currentScript.closingAsk, 'closing ask')}
                    className="px-2 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Model</span>
                  </button>
                )}
                {onInsertText && (
                  <button
                    type="button"
                    onClick={() => onInsertText(currentScript.closingAsk)}
                    className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" />
                    <span>Use</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentScript.closingAsk, 'close')}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                  title="Copy closing ask"
                >
                  {copiedField === 'close' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <p
              className="text-emerald-200 font-semibold leading-relaxed whitespace-pre-wrap"
              style={{ fontSize: bodyFontSize }}
            >
              {currentScript.closingAsk || 'No closing ask set yet.'}
            </p>
          </section>
        </div>
      ) : (
        /* =========================================================================
           EDIT MODE: LIVE-EDITABLE FIELDS WITH AUTO-SAVE
           ========================================================================= */
        <div
          className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200"
          style={{ fontSize: `${zoomLevel}%` }}
        >
          {/* SECTION 1: OPENING HOOK */}
          <div
            ref={hookRef}
            className={`bg-slate-950/80 rounded-2xl p-4 border shadow-sm space-y-2 transition-all ${
              activeScriptPart === 'hook'
                ? 'border-indigo-400 ring-2 ring-indigo-500/30'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 font-black text-[10px] flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  20-Second Opening Hook
                </span>
              </div>
              {!isHookOptimal && (
                <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
                  <AlertTriangle className="w-3 h-3" /> &gt;20s
                </span>
              )}
            </div>

            <textarea
              rows={4}
              value={currentScript.hook || ''}
              onChange={(e) => handleFieldUpdate('hook', e.target.value)}
              placeholder="Type your opening 20-second pattern interrupt..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed font-medium focus:outline-none focus:border-indigo-500 transition resize-y"
            />

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">
                  Coach delivery cues
                </span>
              </div>
              <textarea
                rows={2}
                value={currentScript.deliveryNotes || ''}
                onChange={(e) => handleFieldUpdate('deliveryNotes', e.target.value)}
                placeholder="Pause after the hook; slow down on the pain point; drop your tone on the closing ask."
                className="w-full resize-y bg-slate-950/70 border border-amber-500/20 rounded-lg p-2 text-[11px] leading-relaxed text-amber-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60"
                aria-label="Coach delivery cues"
              />
            </div>
          </div>

          {/* SECTION 2: PAIN & VALUE */}
          <div
            ref={painRef}
            className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Burning Pain &amp; Value
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSection('pitch')}
                className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              >
                {collapsedSections.pitch ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {!collapsedSections.pitch && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    Burning Pain
                  </label>
                  <textarea
                    rows={3}
                    value={resolvedProblem}
                    onChange={(e) => handleFieldUpdate('problem', e.target.value)}
                    placeholder="Concrete dollar loss or operational friction..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-y"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Differentiated Solution Value
                  </label>
                  <textarea
                    rows={3}
                    value={resolvedValue}
                    onChange={(e) => handleFieldUpdate('value', e.target.value)}
                    placeholder="Clear ROI and immediate differentiation..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-y"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: OBJECTION REBUTTALS */}
          <div
            ref={rebuttalsRef}
            className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 font-black text-[10px] flex items-center justify-center">
                  3
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Objection Vault ({currentScript.rebuttals?.length || 0})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddRebuttal}
                  className="px-2 py-0.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-500/30"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSection('rebuttals')}
                  className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                >
                  {collapsedSections.rebuttals ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.rebuttals && (
              <div className="space-y-2.5 pt-1">
                {(currentScript.rebuttals || []).map((reb, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border bg-slate-900/80 border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                        Objection #{i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRebuttal(i)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                        title="Delete rebuttal"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={reb.objection}
                      onChange={(e) => handleRebuttalChange(i, 'objection', e.target.value)}
                      placeholder="Prospect objection..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
                    />
                    <textarea
                      rows={3}
                      value={reb.response}
                      onChange={(e) => handleRebuttalChange(i, 'response', e.target.value)}
                      placeholder="Counter-rebuttal..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-indigo-200 focus:outline-none focus:border-indigo-500 resize-y"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: CLOSING CALL TO ACTION */}
          <div
            ref={closeRef}
            className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-2"
          >
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800/80">
              <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-black text-[10px] flex items-center justify-center">
                4
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Closing Call to Action
              </span>
            </div>
            <textarea
              rows={3}
              value={currentScript.closingAsk || ''}
              onChange={(e) => handleFieldUpdate('closingAsk', e.target.value)}
              placeholder="Your next-step closing ask..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>
        </div>
      )}

      {/* Teleprompter Footer */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          {viewMode === 'read' ? 'Full-script view • Switch to Edit anytime' : 'Edits auto-saved'}
        </span>
        <span className="font-mono truncate max-w-[220px]">
          {currentScript.target || 'Sales Pitch Target'}
        </span>
      </div>
    </div>
  );
}

PracticeTeleprompter.propTypes = {
  script: PropTypes.object,
  onScriptChange: PropTypes.func,
  onInsertText: PropTypes.func,
  onDemonstrate: PropTypes.func,
  activeObjectionIndex: PropTypes.number,
  activeScriptPart: PropTypes.string,
  isCallActive: PropTypes.bool,
  isExpanded: PropTypes.bool,
  onToggleExpand: PropTypes.func,
  className: PropTypes.string,
};
