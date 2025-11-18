import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient.js';
import { getUser } from '../lib/supabaseAuth';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Edit, Trash2, Play } from 'lucide-react';

export default function SavedScriptsPage({ setScript }) {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function load() {
      const u = await getUser();
      const user = u?.data?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from('scripts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) {
        console.error(error);
      } else if (mounted) {
        setScripts(data || []);
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleLoad = (script) => {
    if (setScript) {
      setScript({ id: script.id, name: script.name, nodes: script.nodes, edges: script.edges, metadata: script.metadata });
      navigate('/script-builder');
    }
  };

  const handlePractice = (script) => {
    if (setScript) {
      setScript(script);
      navigate('/practice');
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('scripts').delete().eq('id', id);
    setScripts(scripts.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Saved Scripts</h1>
            <button onClick={() => { setScript(null); navigate('/script-builder'); }} className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">
              New Script
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center items-center p-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : scripts.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-lg shadow">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">No Scripts Yet</h2>
              <p className="text-gray-600 mb-4">It looks like you haven't saved any scripts. Get started by creating one!</p>
              <button onClick={() => { setScript(null); navigate('/script-builder'); }} className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">
                Create New Script
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {scripts.map((s) => (
                <div key={s.id} className="p-6 bg-white rounded-lg shadow-md flex justify-between items-center">
                  <div className="flex-grow">
                    <div className="font-semibold text-lg text-gray-800">{s.name || 'Untitled'}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {s.metadata?.difficulty && <span>{s.metadata.difficulty}</span>}
                      {s.metadata?.difficulty && s.updated_at && <span className="mx-2">·</span>}
                      {s.updated_at && <span>Last updated {new Date(s.updated_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handlePractice(s)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" aria-label="Practice Script">
                      <Play size={20} />
                    </button>
                    <button onClick={() => handleLoad(s)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" aria-label="Edit Script">
                      <Edit size={20} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full" aria-label="Delete Script">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}