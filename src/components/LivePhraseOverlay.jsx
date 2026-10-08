import React from 'react';
import PropTypes from 'prop-types';

function classifyWord(word, metrics) {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '');
  if (/^(um|uh|er|like|basically|actually)$/.test(clean)) return 'text-amber-300 bg-amber-500/20';
  if (metrics.pace === 'rushed') return 'text-rose-200 bg-rose-500/20';
  if (metrics.pitch === 'high') return 'text-fuchsia-200 bg-fuchsia-500/20';
  if (metrics.pitch === 'grounded') return 'text-emerald-200 bg-emerald-500/20';
  return 'text-sky-100 bg-sky-500/20';
}

export default function LivePhraseOverlay({ targetLine, spokenText, metrics, visible }) {
  if (!visible) return null;
  const spokenWords = spokenText.trim() ? spokenText.trim().split(/\s+/) : [];
  return (
    <div className="fixed left-1/2 bottom-24 z-40 w-[min(92vw,980px)] -translate-x-1/2 pointer-events-none" aria-live="polite">
      <div className="rounded-2xl border border-indigo-400/50 bg-slate-950/95 px-5 py-4 shadow-2xl shadow-indigo-950/50 backdrop-blur-md">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300 mb-1">Coach’s line</div>
        <div className="text-xl sm:text-2xl font-semibold leading-snug text-white">{targetLine || 'Coach is preparing your next line…'}</div>
        <div className="mt-3 border-t border-slate-800 pt-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300 mb-1">Your attempt</div>
          <div className="min-h-8 text-lg sm:text-xl font-medium leading-snug">
            {spokenWords.length ? spokenWords.map((word, index) => (
              <span key={`${word}-${index}`} className={`inline rounded px-1 mr-1 ${classifyWord(word, metrics)}`}>{word}</span>
            )) : <span className="text-slate-500">Start the phrase when you’re ready…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

LivePhraseOverlay.propTypes = {
  targetLine: PropTypes.string,
  spokenText: PropTypes.string,
  metrics: PropTypes.shape({ pace: PropTypes.string, pitch: PropTypes.string }),
  visible: PropTypes.bool
};

