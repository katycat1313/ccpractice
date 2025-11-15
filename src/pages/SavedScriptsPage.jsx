import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient.js';
import { getUser } from '../lib/supabaseAuth';

export default function SavedScriptsPage({ setPage, setActiveScript }) {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);

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
    if (setActiveScript) {
      setActiveScript({ nodes: script.nodes, edges: script.edges, metadata: script.metadata });
      setPage('script-builder');
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('scripts').delete().eq('id', id);
    setScripts(scripts.filter(s => s.id !== id));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Saved Scripts</h1>
      <button onClick={() => setPage('dashboard')} className="mb-4 text-sm text-indigo-600">Back to Dashboard</button>
      {loading && <p>Loading…</p>}
      {!loading && scripts.length === 0 && <p>No saved scripts.</p>}
      <div className="grid grid-cols-1 gap-4">
        {scripts.map((s) => (
          <div key={s.id} className="p-4 bg-white rounded shadow flex justify-between items-center">
            <div>
              <div className="font-semibold">{s.name || 'Untitled'}</div>
              <div className="text-sm text-gray-500">{s.metadata?.persona || ''} · {s.metadata?.difficulty || ''}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleLoad(s)} className="px-3 py-1 bg-green-600 text-white rounded">Load</button>
              <button onClick={() => handleDelete(s.id)} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}