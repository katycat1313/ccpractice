import React, { useState } from 'react';
import { X, Upload, Link as LinkIcon, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import {
  saveCareerDossier,
  parseAndSaveDocument,
  addPortfolioUrl,
  removePortfolioUrl,
} from '../lib/careerDossier';
import {
  importAgentsFromJson,
  getAllInterviewAgents,
  updateAgentCustomPortrait,
} from '../lib/agentsConfig';
import { syncDossierToSupabase, syncAgentsToSupabase } from '../lib/supabaseSync';

export default function DossierDrawerModal({
  isOpen,
  onClose,
  dossier,
  onDossierChange,
  onAgentsImported,
}) {
  const [activeTab, setActiveTab] = useState('jd');
  const [jdText, setJdText] = useState(dossier?.jobDescription?.rawText || '');
  const [resumeText, setResumeText] = useState(dossier?.resume?.rawText || '');
  const [urlInput, setUrlInput] = useState('');
  const [urlLabel, setUrlLabel] = useState('');
  const [krechetTagline, setKrechetTagline] = useState(dossier?.krechet?.tagline || '');
  const [krechetOffer, setKrechetOffer] = useState(dossier?.krechet?.pilotOffer || '');
  const [busyMessage, setBusyMessage] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [errorNote, setErrorNote] = useState('');

  if (!isOpen) return null;

  const notifySaved = async (updated, msg) => {
    onDossierChange(updated);
    setStatusNote(msg);
    setErrorNote('');
    await syncDossierToSupabase(updated);
  };

  const handleFileParse = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyMessage(`Analyzing ${file.name}...`);
    setErrorNote('');
    try {
      const updated = await parseAndSaveDocument({ file, docType });
      if (docType === 'job_description') setJdText(updated.jobDescription?.rawText || '');
      else setResumeText(updated.resume?.rawText || '');
      await notifySaved(updated, `Saved ${file.name} to live interviewer context.`);
    } catch (err) {
      setErrorNote(err?.message || 'Unable to parse file.');
    } finally {
      setBusyMessage('');
      e.target.value = '';
    }
  };

  const handlePasteSave = async (docType) => {
    const rawText = docType === 'job_description' ? jdText : resumeText;
    if (!rawText.trim()) return;
    setBusyMessage('Extracting structured highlights...');
    setErrorNote('');
    try {
      const updated = await parseAndSaveDocument({ rawText, docType });
      await notifySaved(
        updated,
        docType === 'job_description'
          ? 'Job description indexed for project-based interview questions.'
          : 'Resume indexed for architecture & impact questions.'
      );
    } catch (err) {
      setErrorNote(err?.message || 'Failed to save text.');
    } finally {
      setBusyMessage('');
    }
  };

  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setBusyMessage('Fetching project URL summary...');
    setErrorNote('');
    try {
      const updated = await addPortfolioUrl(urlInput.trim(), urlLabel.trim());
      setUrlInput('');
      setUrlLabel('');
      await notifySaved(updated, 'Added project link to dossier.');
    } catch (err) {
      setErrorNote(err?.message || 'Could not index URL.');
    } finally {
      setBusyMessage('');
    }
  };

  const handleRemoveUrl = async (id) => {
    const updated = removePortfolioUrl(id);
    await notifySaved(updated, 'Removed URL from dossier.');
  };

  const handleSaveKrechet = async () => {
    const updated = saveCareerDossier({
      krechet: {
        ...dossier.krechet,
        tagline: krechetTagline,
        pilotOffer: krechetOffer,
      },
    });
    await notifySaved(updated, 'Updated KRECHET Academy agency pitch context.');
  };

  const handleAgentsJsonUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyMessage(`Importing ${file.name}...`);
    setErrorNote('');
    try {
      const text = await file.text();
      const imported = importAgentsFromJson(text);
      if (!imported.length) {
        throw new Error('No valid agent entries found in JSON.');
      }
      await syncAgentsToSupabase(imported);
      onAgentsImported?.(imported);
      setStatusNote(`Imported ${imported.length} agent profiles (${imported.map((a) => a.displayName).join(', ')}).`);
    } catch (err) {
      setErrorNote(err?.message || 'Invalid agents.json file.');
    } finally {
      setBusyMessage('');
      e.target.value = '';
    }
  };

  const handleAgentPhotoUpload = (e, agentId, agentName) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (dataUrl) {
        const nextList = updateAgentCustomPortrait(agentId, dataUrl);
        onAgentsImported?.(nextList);
        setStatusNote(`Updated ${agentName}'s live render image.`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#0d121c] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Interview Dossier &amp; Agent Profiles</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Charlie, Joey, and Katy ground their live questions in these credentials and URLs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close dossier modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800/80 overflow-x-auto">
          {[
            { id: 'jd', label: 'Job Description' },
            { id: 'resume', label: 'Resume / CV' },
            { id: 'urls', label: 'Portfolio URLs' },
            { id: 'krechet', label: 'KRECHET Pitch' },
            { id: 'agents', label: 'agents.json' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setStatusNote('');
                setErrorNote('');
              }}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {busyMessage && (
            <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-xs text-indigo-200">
              {busyMessage}
            </div>
          )}
          {statusNote && (
            <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusNote}</span>
            </div>
          )}
          {errorNote && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-xs text-rose-200">
              {errorNote}
            </div>
          )}

          {activeTab === 'jd' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Current Role: <span className="text-slate-200 font-medium">{dossier.jobDescription?.roleTitle || 'Solutions Architect / AI App Dev'}</span>
                </div>
                <label className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white cursor-pointer flex items-center gap-2 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload JD File (PDF/TXT/MD)</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md,.doc,.docx"
                    onChange={(e) => handleFileParse(e, 'job_description')}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={8}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the target Solutions Architect or Application Developer job description here..."
                className="w-full rounded-xl bg-[#080b11] border border-slate-800 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handlePasteSave('job_description')}
                disabled={Boolean(busyMessage)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
              >
                Save &amp; Index Job Description
              </button>
            </div>
          )}

          {activeTab === 'resume' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Uploaded File: <span className="text-slate-200 font-medium">{dossier.resume?.fileName || 'None yet'}</span>
                </div>
                <label className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-white cursor-pointer flex items-center gap-2 transition-colors">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload Resume (PDF/TXT/MD)</span>
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={(e) => handleFileParse(e, 'resume')}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={8}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume, shipped AI systems, and measurable engineering outcomes..."
                className="w-full rounded-xl bg-[#080b11] border border-slate-800 p-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handlePasteSave('resume')}
                disabled={Boolean(busyMessage)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
              >
                Save &amp; Index Resume
              </button>
            </div>
          )}

          {activeTab === 'urls' && (
            <div className="space-y-4">
              <form onSubmit={handleAddUrl} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <input
                  type="text"
                  value={urlLabel}
                  onChange={(e) => setUrlLabel(e.target.value)}
                  placeholder="Project label (e.g. GitHub / Live App)"
                  className="sm:col-span-4 rounded-lg bg-[#080b11] border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://github.com/... or live demo URL"
                  className="sm:col-span-6 rounded-lg bg-[#080b11] border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={Boolean(busyMessage)}
                  className="sm:col-span-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors whitespace-nowrap"
                >
                  Add URL
                </button>
              </form>

              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl">
                {(dossier.portfolioUrls || []).map((u) => (
                  <div key={u.id} className="p-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-medium text-white">
                        <LinkIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{u.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{u.url}</p>
                      {u.summary && <p className="text-xs text-slate-300 mt-1.5">{u.summary}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(u.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                      aria-label="Remove URL"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'krechet' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  KRECHET Academy Positioning
                </label>
                <textarea
                  rows={3}
                  value={krechetTagline}
                  onChange={(e) => setKrechetTagline(e.target.value)}
                  className="w-full rounded-xl bg-[#080b11] border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Agency Cohort Pilot Offer
                </label>
                <textarea
                  rows={3}
                  value={krechetOffer}
                  onChange={(e) => setKrechetOffer(e.target.value)}
                  className="w-full rounded-xl bg-[#080b11] border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveKrechet}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
              >
                Save KRECHET Pitch Context
              </button>
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-300 leading-relaxed">
                Charlie, Joey, and Katy use their Ultra-Realistic Los Santos renders and Gemini Live voices (<span className="font-mono">Fenrir</span>, <span className="font-mono">Puck</span>, <span className="font-mono">Kore</span>). You can swap any character&apos;s render photo or import an updated <span className="font-mono">agents.json</span> below.
              </p>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl">
                {getAllInterviewAgents().slice(0, 3).map((ag) => (
                  <div key={ag.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={ag.portraitUrl}
                        alt={ag.displayName}
                        referrerPolicy="no-referrer"
                        className="w-11 h-12 rounded-lg object-cover object-[50%_18%] border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white">{ag.displayName}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Voice: {ag.voice?.geminiLiveVoice} · {ag.roleTitle}
                        </div>
                      </div>
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer transition-colors whitespace-nowrap shrink-0">
                      Swap Render Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAgentPhotoUpload(e, ag.id, ag.displayName)}
                        className="hidden"
                      />
                    </label>
                  </div>
                ))}
              </div>

              <label className="inline-flex px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white cursor-pointer items-center gap-2 transition-colors">
                <Upload className="w-4 h-4" />
                <span>Import agents.json File</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleAgentsJsonUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
