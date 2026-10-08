import React, { useMemo, useState } from 'react';
import { FileText, Link2, Plus, Sparkles, Trash2, Upload, X, ArrowRight, Target, BrainCircuit, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import { askGeminiCoach } from '../lib/geminiClient';

const starterQuestions = [
  'Walk me through the project and the problem it solves.',
  'What was the hardest technical decision you made, and what tradeoff did you accept?',
  'How did you validate that this was useful to the people using it?',
  'What would you improve if you had two more weeks?',
  'Tell me about a bug or failure and how you reasoned your way through it.'
];

function SourceCard({ source, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/70 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
        {source.kind === 'url' ? <Link2 size={17} /> : <FileText size={17} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">{source.label}</p>
        <p className="truncate text-xs text-slate-500">{source.kind === 'url' ? source.value : `${source.type || 'Document'} · ${Math.round(source.size / 1024)} KB`}</p>
      </div>
      <button type="button" onClick={onRemove} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300" aria-label={`Remove ${source.label}`}><X size={16} /></button>
    </div>
  );
}

export default function InterviewPrepPage() {
  const [topic, setTopic] = useState('');
  const [role, setRole] = useState('');
  const [urlDraft, setUrlDraft] = useState('');
  const [sources, setSources] = useState([]);
  const [brief, setBrief] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const canGenerate = topic.trim() || sources.length;
  const sourceSummary = useMemo(() => sources.map((source) => source.kind === 'url' ? source.value : source.label).join('\n'), [sources]);

  const addUrl = () => {
    const value = urlDraft.trim();
    if (!value) return;
    try { new URL(value); } catch { setError('Add a complete URL, including https://'); return; }
    setSources((current) => [...current, { id: crypto.randomUUID(), kind: 'url', value, label: value }]);
    setUrlDraft('');
    setError('');
  };

  const addFiles = (event) => {
    const files = Array.from(event.target.files || []);
    setSources((current) => [...current, ...files.map((file) => ({ id: crypto.randomUUID(), kind: 'file', label: file.name, size: file.size, type: file.type }))]);
    event.target.value = '';
  };

  const generateBrief = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError('');
    const response = await askGeminiCoach({
      systemPrompt: 'You are an incisive but supportive interview coach. Create a practical grilling brief from the candidate topic and source list. Return JSON with keys: focus, questions (array of strings), followUps (array of strings), strengthsToProve (array of strings), redFlags (array of strings). Do not invent details that are not present in the input.',
      userMessage: `Candidate wants to prepare for ${role || 'an interview'} about: ${topic || 'the supplied materials'}. Sources:\n${sourceSummary || 'None'}`,
      currentBusiness: topic,
      stage: 'interview-prep',
      mode: 'analysis'
    });
    if (response?.text) {
      try { setBrief(JSON.parse(response.text.replace(/```json|```/g, '').trim())); }
      catch { setBrief({ focus: response.text, questions: starterQuestions, followUps: [], strengthsToProve: [], redFlags: [] }); }
    } else {
      setBrief({ focus: `Build a crisp story around ${topic || 'your supplied materials'}: context, ownership, decisions, evidence, and reflection.`, questions: starterQuestions, followUps: ['What did you personally own?', 'What evidence shows the result was successful?', 'What did you learn?'], strengthsToProve: ['Clear ownership', 'Structured problem solving', 'Honest reflection'], redFlags: ['Overusing “we” without explaining your contribution', 'Listing tools without explaining decisions'] });
    }
    setIsGenerating(false);
  };

  return <div className="min-h-screen bg-slate-950 text-slate-100"><Navbar /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
    <section className="mb-8 max-w-3xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-indigo-300"><Sparkles size={14} /> Interview Prep Lab</div><h1 className="text-3xl font-black tracking-tight sm:text-5xl">Give the coach something real to grill you on.</h1><p className="mt-4 text-base leading-7 text-slate-400">Bring a GitHub project, a role description, a certification topic, or several sources. The coach turns your context into targeted questions—not generic interview trivia.</p></section>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="machined-card p-5 sm:p-7"><div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300"><Target /></div><div><h2 className="text-xl font-bold">Build your interview brief</h2><p className="text-sm text-slate-400">Start with a subject, then add anything the interviewer could see.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold text-slate-200">What are you preparing to discuss?</span><textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} placeholder="e.g. My GitHub projects, a frontend engineer role, or explaining my AWS certification…" className="w-full rounded-2xl border border-slate-700 p-4 outline-none focus:border-indigo-400" /></label><label><span className="mb-2 block text-sm font-bold text-slate-200">Target role (optional)</span><input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Software Engineer" className="w-full rounded-2xl border border-slate-700 px-4 py-3 outline-none focus:border-indigo-400" /></label><div><span className="mb-2 block text-sm font-bold text-slate-200">Add files</span><label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-400/50 bg-indigo-500/5 px-4 py-3 text-sm font-bold text-indigo-300 hover:bg-indigo-500/10"><Upload size={17} /> Upload resume or notes<input type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" className="hidden" onChange={addFiles} /></label></div></div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row"><input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUrl()} placeholder="https://github.com/you/project" className="min-w-0 flex-1 rounded-2xl border border-slate-700 px-4 py-3 outline-none focus:border-indigo-400" /><button type="button" onClick={addUrl} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-800 px-5 py-3 text-sm font-bold hover:bg-slate-700"><Plus size={17} /> Add URL</button></div>{error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
        {sources.length > 0 && <div className="mt-6 space-y-2">{sources.map((source) => <SourceCard key={source.id} source={source} onRemove={() => setSources((current) => current.filter((item) => item.id !== source.id))} />)}</div>}
        <button type="button" disabled={!canGenerate || isGenerating} onClick={generateBrief} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 font-black shadow-lg shadow-indigo-950/40 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50">{isGenerating ? 'Building your grilling brief…' : <>Generate my grilling brief <ArrowRight size={18} /></>}</button>
      </section>
      <aside className="space-y-4"><div className="machined-card p-5"><div className="mb-4 flex items-center gap-2 text-sm font-bold text-indigo-300"><ShieldCheck size={18} /> What gets shared</div><p className="text-sm leading-6 text-slate-400">URLs and file names are used as context for this preparation session. Upload contents are not sent anywhere until you connect an analysis flow.</p></div><div className="machined-card p-5"><div className="mb-4 flex items-center gap-2 text-sm font-bold text-violet-300"><BrainCircuit size={18} /> Good source ideas</div><ul className="space-y-3 text-sm text-slate-400"><li>• GitHub repositories and deployed demos</li><li>• A job description or recruiter email</li><li>• Certification objectives or study notes</li><li>• Your resume and a project case study</li></ul></div></aside>
    </div>
    {brief && <section className="machined-card mt-6 p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">Your coach’s read</p><h2 className="mt-2 text-2xl font-black">{brief.focus || 'Interview grilling brief'}</h2></div><button type="button" onClick={() => setBrief(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-800 hover:text-white" aria-label="Close brief"><X size={18} /></button></div><div className="mt-6 grid gap-6 lg:grid-cols-2"><div><h3 className="mb-3 font-bold">Questions you should be ready for</h3><ol className="space-y-3">{(brief.questions || starterQuestions).map((question, index) => <li key={`${question}-${index}`} className="flex gap-3 rounded-xl bg-slate-900/60 p-3 text-sm text-slate-300"><span className="font-black text-indigo-400">{String(index + 1).padStart(2, '0')}</span>{question}</li>)}</ol></div><div className="space-y-5"><div><h3 className="mb-3 font-bold">Strengths to prove</h3><div className="flex flex-wrap gap-2">{(brief.strengthsToProve || []).map((item) => <span key={item} className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300">{item}</span>)}</div></div><div><h3 className="mb-3 font-bold">Likely follow-ups</h3><ul className="space-y-2 text-sm text-slate-400">{(brief.followUps || []).map((item) => <li key={item}>↳ {item}</li>)}</ul></div></div></div></section>}
  </main></div>;
}
