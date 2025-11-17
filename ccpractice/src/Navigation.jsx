import React from 'react';
import { Settings } from 'lucide-react';

export default function Navigation({ setShowSettings }) {
  return (
    <div className="bg-white border-b shadow p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">ScriptMaster</h1>
        <button onClick={() => setShowSettings(true)} className="p-2 bg-gray-100 rounded hover:bg-gray-200">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}