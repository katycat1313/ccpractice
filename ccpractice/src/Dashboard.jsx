import React from 'react';
import { Plus, Zap, Play } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Dashboard({
  scripts, setScripts, setBuilderMode, addNode, generateScriptWithAI, startPractice
}) {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
      <div className="flex gap-4 mb-8">
        <button onClick={() => { setBuilderMode('create'); addNode(); }} className="bg-indigo-600 text-white font-semibold py-3 px-6 rounded hover:bg-indigo-700 flex items-center gap-2">
          <Plus size={20} /> Create Script
        </button>
        <button onClick={generateScriptWithAI} className="bg-purple-600 text-white font-semibold py-3 px-6 rounded hover:bg-purple-700 flex items-center gap-2">
          <Zap size={20} /> Generate Template
        </button>
      </div>
      <div className="grid gap-4">
        {scripts.map(script => (
          <div key={script.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">{script.name}</h3>
                <p className="text-gray-600 text-sm">{script.nodes.length} nodes</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startPractice(script)} className="bg-green-600 text-white font-semibold py-2 px-4 rounded hover:bg-green-700 flex items-center gap-2">
                  <Play size={18} /> Practice
                </button>
                <button
                  onClick={async () => {
                    const { error } = await supabase.from('scripts').delete().eq('id', script.id);
                    if (error) {
                      alert('Error deleting script: ' + error.message);
                    } else {
                      setScripts(scripts.filter(s => s.id !== script.id));
                    }
                  }}
                  className="bg-red-600 text-white font-semibold py-2 px-4 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}