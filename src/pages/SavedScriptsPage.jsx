import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient.js';
import { getUser } from '../lib/supabaseAuth';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PracticeOptionsModal from './PracticeOptionsModal';
import { Edit, Trash2, Play, Plus, BookOpen, Clock } from 'lucide-react';
import PropTypes from 'prop-types';

export default function SavedScriptsPage({ setScript, setPracticeSettings }) {
  const [scripts, setScripts] = useState([]);
  const [practiceState, setPracticeState] = useState({ optionsOpen: false, practiceOpen: false, scriptToPractice: null });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      const localScripts = JSON.parse(localStorage.getItem('scriptmaster_saved_scripts') || '[]');
      let combined = [...localScripts];

      try {
        const u = await getUser();
        const user = u?.data?.user;
        if (user) {
          const { data, error } = await supabase.from('scripts').select('*').order('created_at', { ascending: false });
          if (!error && data && data.length > 0) {
            const ids = new Set(data.map(d => d.id));
            const nonDupes = combined.filter(c => !ids.has(c.id));
            combined = [...data, ...nonDupes];
          }
        }
      } catch (err) {
        console.warn('Supabase scripts fetch error, using local storage:', err);
      }

      if (mounted) {
        setScripts(combined);
        setLoading(false);
      }
    }
    load();

    const handleUpdate = () => load();
    window.addEventListener('scriptmaster_scripts_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => { 
      mounted = false; 
      window.removeEventListener('scriptmaster_scripts_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleLoad = (targetScript) => {
    try {
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(targetScript));
      localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('scriptmaster_script_updated'));
    } catch (_) {}
    if (setScript) {
      setScript(targetScript);
    }
    navigate('/script-builder');
  };

  const handlePractice = (targetScript) => {
    try {
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(targetScript));
      localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('scriptmaster_script_updated'));
    } catch (_) {}
    if (setScript) setScript(targetScript);
    navigate('/practice');
  };

  const handleStartPractice = (options) => {
    const scriptWithOptions = { 
      ...practiceState.scriptToPractice, 
      metadata: { ...practiceState.scriptToPractice?.metadata, ...options } 
    };
    try {
      localStorage.setItem('scriptmaster_active_script', JSON.stringify(scriptWithOptions));
      localStorage.setItem('scriptmaster_active_script_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('scriptmaster_script_updated'));
    } catch (_) {}
    setScript(scriptWithOptions);
    if (setPracticeSettings) {
      setPracticeSettings({
        prospect: options.prospect,
        difficulty: options.difficulty
      });
    }
    setPracticeState({ optionsOpen: false, practiceOpen: false, scriptToPractice: null });
    navigate('/practice');
  };

  const handleDelete = async (id) => {
    try {
      await supabase.from('scripts').delete().eq('id', id);
    } catch (_) {}
    const updated = scripts.filter(s => s.id !== id);
    setScripts(updated);
    try {
      localStorage.setItem('scriptmaster_saved_scripts', JSON.stringify(updated));
      window.dispatchEvent(new Event('scriptmaster_scripts_updated'));
    } catch (_) {}
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Saved Scripts</h1>
            <p className="text-xs text-slate-400 mt-1">Manage, edit, and practice your cold calling templates</p>
          </div>
          <button 
            onClick={() => { setScript(null); navigate('/script-builder'); }} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg"
          >
            <Plus className="w-4 h-4" /> New Script
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center p-12 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">No Scripts Saved Yet</h2>
            <p className="text-xs text-slate-400 mb-6">Create your first script or generate one using our templates.</p>
            <button 
              onClick={() => { setScript(null); navigate('/script-builder'); }} 
              className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-5 rounded-xl text-xs font-bold transition"
            >
              Build New Script
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {scripts.map((s) => (
              <div 
                key={s.id} 
                className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition"
              >
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white mb-1">{s.title || s.name || 'Cold Call Script'}</h3>
                  {s.hook && (
                    <p className="text-xs text-slate-300 italic mb-2 line-clamp-2">"{s.hook}"</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    {s.metadata?.niche && (
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
                        {s.metadata.niche}
                      </span>
                    )}
                    {s.metadata?.cta && (
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300">
                        Goal: {s.metadata.cta}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      {new Date(s.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => handlePractice(s)}
                    className="py-2 px-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Practice
                  </button>
                  <button
                    onClick={() => handleLoad(s)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
                    title="Edit Script Flow"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 rounded-xl border border-slate-700 transition"
                    title="Delete Script"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {practiceState.optionsOpen && (
        <PracticeOptionsModal
          onStart={handleStartPractice}
          onClose={() => setPracticeState({ optionsOpen: false, practiceOpen: false, scriptToPractice: null })}
        />
      )}
    </div>
  );
}

SavedScriptsPage.propTypes = {
  setScript: PropTypes.func.isRequired,
  setPracticeSettings: PropTypes.func.isRequired,
};
