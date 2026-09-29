import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  BookOpen, 
  Search, 
  Zap, 
  Check, 
  Copy, 
  Volume2, 
  Trash2, 
  Plus, 
  PhoneCall, 
  Sparkles,
  ArrowRight,
  Bot
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSavedRebuttals, saveRebuttal, deleteRebuttal, searchSavedRebuttals } from '../lib/vocabularyAndRebuttals';

export default function RebuttalsPage() {
  const [rebuttals, setRebuttals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newObjection, setNewObjection] = useState('');
  const [newGoldenLine, setNewGoldenLine] = useState('');
  const [newCategory, setNewCategory] = useState('Objection Response');
  const [newWhyItWorks, setNewWhyItWorks] = useState('');

  const refreshList = () => {
    setRebuttals(getSavedRebuttals());
  };

  useEffect(() => {
    refreshList();
    window.addEventListener('scriptmaster_rebuttals_changed', refreshList);
    return () => window.removeEventListener('scriptmaster_rebuttals_changed', refreshList);
  }, []);

  const filteredRebuttals = searchQuery ? searchSavedRebuttals(searchQuery) : rebuttals;

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window._activeRebuttalUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (_) {}
  };

  const handleDelete = (id) => {
    deleteRebuttal(id);
    refreshList();
  };

  const handleCreateCustom = (e) => {
    e.preventDefault();
    if (!newObjection.trim() || !newGoldenLine.trim()) return;

    const newObj = {
      id: `reb-${Date.now()}`,
      objection: newObjection.trim(),
      goldenLine: newGoldenLine.trim(),
      category: newCategory.trim() || 'Custom Objection',
      whyItWorks: newWhyItWorks.trim() || 'Co-created custom line tailored to your specific field scenario.',
      createdAt: new Date().toISOString()
    };

    saveRebuttal(newObj);
    refreshList();
    setNewObjection('');
    setNewGoldenLine('');
    setNewWhyItWorks('');
    setShowAddModal(false);
  };

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col font-sans select-none antialiased">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Personal Rebuttal Arsenal
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              My Saved Rebuttals & Lines
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Lines and objection responses co-created with your Coach in real time, saved here to reference back to.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Rebuttal
            </button>

            <Link
              to="/coach"
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center gap-2"
            >
              <Bot className="w-4 h-4 text-cyan-200" />
              Co-Create with Coach
            </Link>
          </div>
        </div>

        {/* Search */}
        {rebuttals.length > 0 && (
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your saved rebuttals..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#11131c] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
            />
          </div>
        )}

        {/* Rebuttals List */}
        {filteredRebuttals.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[#0b0d14]/90 border border-slate-800/80 text-center space-y-4 max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center text-3xl mx-auto text-indigo-400 shadow-lg">
              💬
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No Saved Rebuttals Yet</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                You build your rebuttals and custom lines together with your Coach in real time! Go to the Coach Arena, discuss an objection you run into (like 50% deposits or truck cab brush-offs), and click <strong>"Save to My Rebuttals"</strong>.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                to="/coach"
                className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg"
              >
                <Bot className="w-4 h-4 text-cyan-200" />
                Brainstorm with Coach Now →
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRebuttals.map((r) => (
              <div 
                key={r.id}
                className="p-5 rounded-2xl bg-[#0b0d14]/90 border border-slate-800 space-y-3 shadow-lg hover:border-slate-700 transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800 text-amber-300 flex items-center justify-center font-black text-xs">
                      ⚡
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-white">{r.objection}</h3>
                      <span className="text-[11px] text-cyan-400 font-medium">{r.category}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition self-start sm:self-auto cursor-pointer"
                    title="Delete saved rebuttal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* The Golden Line */}
                <div className="p-4 rounded-xl bg-[#12141f] border border-cyan-500/30 text-xs sm:text-sm text-cyan-200 relative group">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Your Co-Created Line:
                  </div>
                  <p className="leading-relaxed italic">"{r.goldenLine}"</p>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleCopy(r.goldenLine, r.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedId === r.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === r.id ? 'Copied!' : 'Copy Line'}
                    </button>
                    <button
                      onClick={() => handleSpeak(r.goldenLine)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-semibold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                      Listen Aloud
                    </button>
                  </div>
                </div>

                {r.whyItWorks && (
                  <div className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold text-xs">Why it works:</span>
                    <span>{r.whyItWorks}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal: Add Rebuttal Manually */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0b0d14] border border-slate-700 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-cyan-400" /> Add Custom Rebuttal
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateCustom} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prospect Objection / Pushback:</label>
                  <input
                    type="text"
                    value={newObjection}
                    onChange={(e) => setNewObjection(e.target.value)}
                    placeholder="e.g. I already have a guy who does this..."
                    required
                    className="w-full px-3 py-2 bg-[#12141f] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Your Rebuttal / Golden Line:</label>
                  <textarea
                    rows={3}
                    value={newGoldenLine}
                    onChange={(e) => setNewGoldenLine(e.target.value)}
                    placeholder="Write the exact line to say in response..."
                    required
                    className="w-full px-3 py-2 bg-[#12141f] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Why It Works / Psychological Reason:</label>
                  <input
                    type="text"
                    value={newWhyItWorks}
                    onChange={(e) => setNewWhyItWorks(e.target.value)}
                    placeholder="e.g. Validates their existing relationship while testing quality..."
                    className="w-full px-3 py-2 bg-[#12141f] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold"
                  >
                    Save Rebuttal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
