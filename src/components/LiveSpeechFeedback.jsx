import React from 'react';
import PropTypes from 'prop-types';
import { Mic, Activity, Gauge, Volume2 } from 'lucide-react';

const wordClass = (word, metrics) => {
  const clean = word.toLowerCase().replace(/[^a-z']/g, '');
  if (/^(um|uh|er| like|basically|actually)$/.test(clean)) return 'text-amber-300 bg-amber-500/15';
  if (metrics.pace === 'rushed') return 'text-rose-200 bg-rose-500/15';
  if (metrics.pace === 'slow') return 'text-sky-200 bg-sky-500/15';
  if (metrics.pitch === 'high') return 'text-fuchsia-200 bg-fuchsia-500/15';
  if (metrics.pitch === 'grounded') return 'text-emerald-200 bg-emerald-500/15';
  return 'text-slate-100';
};

export default function LiveSpeechFeedback({ text, isListening, metrics }) {
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  return (
    <section className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-4 shadow-lg" aria-live="polite">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${isListening ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
            <Mic className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Your live delivery</h3>
            <p className="text-[10px] text-slate-500">Words appear while you speak • colors update as delivery is measured</p>
          </div>
        </div>
        {isListening && <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 animate-pulse">Listening</span>}
      </div>

      <div className="min-h-[62px] rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-sm leading-7">
        {words.length ? words.map((word, index) => (
          <span key={`${word}-${index}`} className={`inline rounded px-1 mr-1 transition-colors ${wordClass(word, metrics)}`}>{word}</span>
        )) : <span className="text-slate-600">Start speaking and your words will appear here.</span>}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
          <span className="flex items-center gap-1 text-slate-500"><Gauge className="w-3 h-3" /> Pace</span>
          <strong className={metrics.pace === 'rushed' ? 'text-rose-300' : metrics.pace === 'slow' ? 'text-sky-300' : 'text-emerald-300'}>{metrics.wpm ? `${metrics.wpm} WPM` : 'Measuring'}</strong>
        </div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
          <span className="flex items-center gap-1 text-slate-500"><Activity className="w-3 h-3" /> Pitch</span>
          <strong className={metrics.pitch === 'high' ? 'text-fuchsia-300' : metrics.pitch === 'grounded' ? 'text-emerald-300' : 'text-slate-300'}>{metrics.pitchLabel}</strong>
        </div>
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-2">
          <span className="flex items-center gap-1 text-slate-500"><Volume2 className="w-3 h-3" /> Tone cue</span>
          <strong className="text-amber-300">{metrics.toneLabel}</strong>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span><i className="inline-block w-2 h-2 rounded-sm bg-amber-400 mr-1" />filler word</span>
        <span><i className="inline-block w-2 h-2 rounded-sm bg-rose-400 mr-1" />rushed</span>
        <span><i className="inline-block w-2 h-2 rounded-sm bg-fuchsia-400 mr-1" />pitch rising/high</span>
        <span><i className="inline-block w-2 h-2 rounded-sm bg-emerald-400 mr-1" />grounded</span>
      </div>
    </section>
  );
}

LiveSpeechFeedback.propTypes = {
  text: PropTypes.string,
  isListening: PropTypes.bool,
  metrics: PropTypes.shape({
    wpm: PropTypes.number,
    pace: PropTypes.string,
    pitch: PropTypes.string,
    pitchLabel: PropTypes.string,
    toneLabel: PropTypes.string
  })
};

