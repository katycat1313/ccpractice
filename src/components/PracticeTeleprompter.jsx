import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { getAllSavedScripts, getActiveScript, BUILTIN_TEMPLATES } from '../lib/coachActions';

/**
 * PracticeTeleprompter: Side-Docked Live-Editable Script Teleprompter
 * Pinned beside call controls in Practice Studio & Workshop Drills.
 * Live editable during calls with auto-save to localStorage.
 */
export default function PracticeTeleprompter({
  script = null,
  onScriptChange,
  onInsertText = null,
  onDemonstrate = null,
  activeObjectionIndex = null,
  activeScriptPart = 'hook',
  isCallActive = false,
  className = ''
}) {
  const [currentScript, setCurrentScript] = useState(() => script || getActiveScript());
  const [savedScripts, setSavedScripts] = useState(() => getAllSavedScripts());
  const [copiedField, setCopiedField] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100); // 90%, 100%, 110%, 120%
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({
    pitch: false,
    rebuttals: false,
    closing: false
  });

  // Sync with incoming script props
  useEffect(() => {
    if (script) {
      setCurrentScript(script);
    }
  }, [script]);

  // Sync with global script update events so teleprompter is always available and up-to-date
  useEffect(() => {
    const handleScriptUpdated = () => {
      try {
        const active = getActiveScript();
        if (active) setCurrentScript(active);
      } catch (_) {}
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

  const handleFieldUpdate = (field, value) => {
    const updated = { ...currentScript, [field]: value };
    setCurrentScript(updated);
    
    // Auto-save to localStorage and notify app
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

    // Flash subtle save indicator
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const handleSelectScript = (idOrTitle) => {
    const all = [...savedScripts, ...BUILTIN_TEMPLATES];
    const match = all.find(s => (s.id && s.id === idOrTitle) || (s.title && s.title === idOrTitle) || (s.name && s.name === idOrTitle));
    if (match) {
      setCurrentScript(match);
      try {
        localStorage.setItem('scriptmaster_active_script', JSON.stringify(match));
        localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
        window.dispatchEvent(new Event('scriptmaster_script_updated'));
      } catch (_) {}
      if (onScriptChange) {
        onScriptChange(match);
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
        objection: "e.g. Just send me an email to my office",
        response: "Happy to email, but give me 20 seconds first to see if it even fits. Fair?"
      }
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

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Metrics
  const hookWords = (currentScript.hook || '').trim().split(/\s+/).filter(Boolean).length;
  const hookEstimatedSecs = Math.round(hookWords / 2.5); // ~150 words/min = 2.5 wps
  const isHookOptimal = hookEstimatedSecs <= 20;

  return (
    <div className={`bg-slate-900/95 rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-full overflow-hidden ${className}`}>
      
      {/* =========================================================================
          TELEPROMPTER HEADER & CONTROLS
         ========================================================================= */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Live Teleprompter
              </h3>
              {isCallActive && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Call Active
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
              {currentScript.title || 'Working Script'}
            </p>
          </div>
        </div>

        {/* Text Zoom Controls & Save Indicator */}
        <div className="flex items-center gap-1.5">
          {saveIndicator && (
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
              <CheckCircle2 className="w-3 h-3" /> Saved
            </span>
          )}

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(90, prev - 10))}
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
              onClick={() => setZoomLevel(prev => Math.min(130, prev + 10))}
              className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              title="Increase text size"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1 text-slate-500 hover:text-slate-300 rounded transition cursor-pointer"
              title="Reset text size"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Script Selector Dropdown Bar */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
          <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-bold text-slate-300">Pitch:</span>
        </div>
        <select
          value={currentScript.id || currentScript.title || ''}
          onChange={(e) => handleSelectScript(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer flex-1 truncate max-w-[280px]"
          title="Switch script on teleprompter"
        >
          {savedScripts.length > 0 && (
            <optgroup label="Your Saved Scripts">
              {savedScripts.map(s => (
                <option key={s.id || s.title} value={s.id || s.title}>
                  {s.title || s.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Contractor Pitch Templates">
            {BUILTIN_TEMPLATES.map(t => (
              <option key={t.id || t.title} value={t.id || t.title}>
                {t.title}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* =========================================================================
          SCROLLABLE LIVE-EDITABLE SECTIONS
         ========================================================================= */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200"
        style={{ fontSize: `${zoomLevel}%` }}
      >

        {/* SECTION 1: 20-SECOND PATTERN INTERRUPT HOOK */}
        <div className={`bg-slate-950/80 rounded-2xl p-4 border shadow-sm space-y-2 relative group transition-all ${activeScriptPart === 'hook' ? 'border-indigo-400 ring-2 ring-indigo-500/30' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 font-black text-[10px] flex items-center justify-center">
                1
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                20-Second Opening Hook
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                isHookOptimal
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <Clock className="w-3 h-3" />
                <span>{hookWords}w • ~{hookEstimatedSecs}s</span>
                {!isHookOptimal && <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />}
              </span>

              {onInsertText && (
                <button
                  type="button"
                  onClick={() => onInsertText(currentScript.hook)}
                  className="px-2 py-0.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Insert hook into drill response"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Use Line</span>
                </button>
              )}

              {onDemonstrate && (
                <button
                  type="button"
                  onClick={() => onDemonstrate(currentScript.hook, 'opening hook')}
                  className="px-2 py-0.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Ask Coach to model this line"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Model Line</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => copyToClipboard(currentScript.hook, 'hook')}
                className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
                title="Copy opening hook"
              >
                {copiedField === 'hook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <textarea
            rows={3}
            value={currentScript.hook || ''}
            onChange={(e) => handleFieldUpdate('hook', e.target.value)}
            placeholder="Type your opening 20-second pattern interrupt..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white leading-relaxed font-medium focus:outline-none focus:border-indigo-500 transition resize-none"
          />

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">Coach delivery cues</span>
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

        {/* SECTION 2: JOBSITE PAIN & SOLUTION VALUE */}
        <div className={`bg-slate-950/80 rounded-2xl p-4 border shadow-sm space-y-3 transition-all ${activeScriptPart === 'problem' || activeScriptPart === 'value' ? 'border-amber-400 ring-2 ring-amber-500/30' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center justify-center">
                2
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Jobsite Pain &amp; Differentiated Value
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onInsertText && (
                <button
                  type="button"
                  onClick={() => onInsertText(`${currentScript.problem || ''} ${currentScript.value || ''}`.trim())}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Insert pain & proof into drill response"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Use Line</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleSection('pitch')}
                className="p-1 text-slate-400 hover:text-white rounded transition cursor-pointer"
              >
                {collapsedSections.pitch ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {!collapsedSections.pitch && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Jobsite Burning Pain
                </label>
                <textarea
                  rows={2}
                  value={currentScript.problem || ''}
                  onChange={(e) => handleFieldUpdate('problem', e.target.value)}
                  placeholder="The concrete dollar loss or Sunday fatigue..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Differentiated Solution Value
                </label>
                <textarea
                  rows={2}
                  value={currentScript.value || ''}
                  onChange={(e) => handleFieldUpdate('value', e.target.value)}
                  placeholder="15-second offline capture in the hollows..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: OBJECTION REBUTTALS VAULT */}
        <div className={`bg-slate-950/80 rounded-2xl p-4 border shadow-sm space-y-3 transition-all ${activeScriptPart === 'rebuttal' ? 'border-rose-400 ring-2 ring-rose-500/30' : 'border-slate-800'}`}>
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
                {collapsedSections.rebuttals ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {!collapsedSections.rebuttals && (
            <div className="space-y-2.5 pt-1">
              {(currentScript.rebuttals || []).map((reb, i) => {
                const isHighlight = activeObjectionIndex === i;
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border transition-all ${
                      isHighlight
                        ? 'bg-indigo-950/50 border-indigo-400 shadow-md ring-2 ring-indigo-500/50'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                        Objection #{i + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {onInsertText && (
                          <button
                            type="button"
                            onClick={() => onInsertText(reb.response)}
                            className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Insert rebuttal counter into drill response"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Use Line</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => copyToClipboard(reb.response, `reb-${i}`)}
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                          title="Copy response"
                        >
                          {copiedField === `reb-${i}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRebuttal(i)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                          title="Delete rebuttal"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={reb.objection}
                      onChange={(e) => handleRebuttalChange(i, 'objection', e.target.value)}
                      placeholder="Contractor objection..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium mb-1.5 focus:outline-none focus:border-indigo-500"
                    />

                    <textarea
                      rows={2}
                      value={reb.response}
                      onChange={(e) => handleRebuttalChange(i, 'response', e.target.value)}
                      placeholder="Lethal counter-rebuttal..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-indigo-200 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 4: CLOSING CALL TO ACTION */}
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-black text-[10px] flex items-center justify-center">
                4
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Closing Call to Action (Next Step Ask)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onInsertText && (
                <button
                  type="button"
                  onClick={() => onInsertText(currentScript.closingAsk)}
                  className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="Insert closing ask into drill response"
                >
                  <ArrowRight className="w-3 h-3" />
                  <span>Use Line</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => copyToClipboard(currentScript.closingAsk, 'close')}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                title="Copy closing ask"
              >
                {copiedField === 'close' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <textarea
            rows={2}
            value={currentScript.closingAsk || ''}
            onChange={(e) => handleFieldUpdate('closingAsk', e.target.value)}
            placeholder="e.g. Let's do 10 minutes tomorrow morning around 7:15 AM before your crew heads out..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

      </div>

      {/* Teleprompter Footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          Edits auto-saved to active pitch
        </span>
        <span className="font-mono truncate max-w-[200px]">
          {currentScript.target || 'West Virginia Contractor'}
        </span>
      </div>

    </div>
  );
}

PracticeTeleprompter.propTypes = {
  script: PropTypes.object,
  onScriptChange: PropTypes.func,
  onInsertText: PropTypes.func,
  activeObjectionIndex: PropTypes.number,
  isCallActive: PropTypes.bool,
  className: PropTypes.string
};
