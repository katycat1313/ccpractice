import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { PROSPECT_LIST } from '../lib/prospects';
import { debugLog, debugError, debugWarn, debugTrace } from '../lib/debugUtils';
import { X, Flame, ShieldAlert, Sparkles, PhoneCall, Calendar, Target, Zap, Clock } from 'lucide-react';

export default function PracticeOptionsModal({ onClose, onStart }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState('Medium');
  const [selectedProspect, setSelectedProspect] = useState('hank');
  const [callStage, setCallStage] = useState('call1'); // 'call1' | 'call2'
  const [callStrategy, setCallStrategy] = useState('callback'); // 'one_call_close' | 'callback'
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    debugTrace('PracticeOptionsModal', 'submit_attempted', {
      selectedDifficulty,
      selectedProspect,
      callStage,
      callStrategy,
    });

    if (!selectedDifficulty || !selectedProspect) {
      const err = 'Please select both difficulty level and a prospect.';
      debugWarn('PracticeOptionsModal', 'Incomplete selection', {
        hasDifficulty: !!selectedDifficulty,
        hasProspect: !!selectedProspect,
      });
      setError(err);
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const selectedProspectData = PROSPECT_LIST.find(p => p.id === selectedProspect);
      if (!selectedProspectData) {
        throw new Error(`Prospect not found: ${selectedProspect}`);
      }

      const practiceSettings = {
        difficulty: selectedDifficulty.toLowerCase(),
        prospect: selectedProspectData,
        callStage,
        callStrategy
      };

      debugTrace('PracticeOptionsModal', 'settings_created', practiceSettings);
      if (onStart) {
        onStart(practiceSettings);
        debugLog('PracticeOptionsModal', 'Practice started successfully');
      }
    } catch (err) {
      debugError('PracticeOptionsModal', 'Error submitting form', err);
      setError(`Error: ${err.message}`);
    }
  };

  const handleCancel = () => {
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
      <div className="relative z-50 rounded-3xl shadow-2xl w-full max-w-4xl p-6 md:p-8 bg-[#0b0d14] border border-slate-700/80 text-white my-6 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-b from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-lg border border-indigo-400/30">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Sales Arena Configuration
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set up your call stage, closing objective, and prospect resistance level
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 1. Call Stage: Call 1 vs Call 2 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-cyan-400" />
                1. Call Stage:
              </label>
              <span className="text-[11px] text-slate-400">Cold opening vs Scheduled follow-up</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCallStage('call1')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  callStage === 'call1'
                    ? 'border-cyan-500/80 bg-cyan-950/40 ring-1 ring-cyan-500/60 shadow-lg'
                    : 'border-slate-800 bg-[#12141f] hover:bg-[#181b29] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-cyan-400" />
                    Call 1: First Touch & Discovery
                  </span>
                  {callStage === 'call1' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Prospect does NOT know you yet. Interrupt the pattern, earn 30 seconds, handle brush-offs, and find bleeding neck pain.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCallStage('call2')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  callStage === 'call2'
                    ? 'border-indigo-500/80 bg-indigo-950/40 ring-1 ring-indigo-500/60 shadow-lg'
                    : 'border-slate-800 bg-[#12141f] hover:bg-[#181b29] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    Call 2: The Scheduled Callback / Close
                  </span>
                  {callStage === 'call2' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Scheduled follow-up! Prospect remembers you, but has objections ready on scope, price, or paying the 50% deposit before delivery.
                </p>
              </button>
            </div>
          </div>

          {/* 2. Call Strategy / Outcome Goal */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                2. Call Strategy & Outcome Goal:
              </label>
              <span className="text-[11px] text-slate-400">What are you driving towards?</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCallStrategy('one_call_close')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  callStrategy === 'one_call_close'
                    ? 'border-amber-500/80 bg-amber-950/30 ring-1 ring-amber-500/60 shadow-lg'
                    : 'border-slate-800 bg-[#12141f] hover:bg-[#181b29] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    One-Call Close (Land it on this call)
                  </span>
                  {callStrategy === 'one_call_close' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aggressive qualification. Pivot directly from the problem into the offer and ask for the 50% deposit / sign-off on the spot.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCallStrategy('callback')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  callStrategy === 'callback'
                    ? 'border-emerald-500/80 bg-emerald-950/30 ring-1 ring-emerald-500/60 shadow-lg'
                    : 'border-slate-800 bg-[#12141f] hover:bg-[#181b29] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    The Callback Strategy (Lock in Call 2)
                  </span>
                  {callStrategy === 'callback' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hook them in 60-90s, establish bleeding neck pain, and secure a locked, calendar-confirmed time without accepting a weak brush-off.
                </p>
              </button>
            </div>
          </div>

          {/* 3. Resistance / Difficulty Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                3. Prospect Resistance Level:
              </label>
              <span className="text-[11px] text-slate-400">Controls how tough their objections are</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { level: 'Easy', desc: 'Receptive & open-minded. Listens to pitch and asks gentle questions.', icon: Sparkles, color: 'text-emerald-400' },
                { level: 'Medium', desc: 'Busy and skeptical. Challenges vague claims and brings up current vendors.', icon: Flame, color: 'text-amber-400' },
                { level: 'Hard', desc: 'In a rush, tests pattern interrupt, pushes back hard on 50% deposits.', icon: ShieldAlert, color: 'text-rose-400' },
              ].map(({ level, desc, icon: Icon, color }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedDifficulty(level)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedDifficulty === level
                      ? 'border-indigo-500 bg-indigo-950/60 ring-1 ring-indigo-500/50 shadow-lg'
                      : 'border-slate-800 bg-[#12141f] hover:bg-[#181b29] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Icon className={`w-4 h-4 ${color}`} />
                      {level}
                    </span>
                    {selectedDifficulty === level && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Prospect Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                4. Target Buyer Persona:
              </label>
              <span className="text-[11px] text-slate-400">Select the trade or buyer type</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROSPECT_LIST.map((prospect) => {
                const isSelected = selectedProspect === prospect.id;
                return (
                  <button
                    key={prospect.id}
                    type="button"
                    onClick={() => setSelectedProspect(prospect.id)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/50 ring-1 ring-indigo-500/50 shadow-lg'
                        : 'border-slate-800 bg-[#12141f] hover:bg-[#181b29] hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        {prospect.image ? (
                          <img src={prospect.image} alt={prospect.name} className="w-9 h-9 rounded-full object-cover border border-slate-600 shadow" />
                        ) : (
                          <span className="text-2xl">{prospect.avatar || '👤'}</span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prospect.color} text-white`}>
                          {prospect.tag || prospect.role}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white">{prospect.name}</h3>
                      <p className="text-xs text-indigo-300 font-medium mb-1">{prospect.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2 leading-relaxed">{prospect.description}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800 mt-1">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Key Objection:</div>
                      <div className="text-xs text-amber-300 font-medium line-clamp-1">{prospect.objectionStyle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-950/60 border border-red-700 rounded-xl text-xs text-red-200 text-center">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 px-4 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-600 hover:to-pink-700 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xl transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-4 h-4" />
              Dial & Start {callStage === 'call2' ? 'Call 2 (Scheduled Callback)' : 'Call 1 (Cold Call)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

PracticeOptionsModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onStart: PropTypes.func.isRequired,
};
