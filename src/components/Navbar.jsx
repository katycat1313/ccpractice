import React from 'react';
import { Settings } from 'lucide-react';

export default function Navbar({ setPage }) {
  return (
    <nav className="bg-white shadow-md p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold text-indigo-600">ScriptMaster</h1>
        <button
          onClick={() => setPage('settings')}
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition duration-300"
          title="Settings"
        >
          <Settings size={20} className="text-gray-700" />
        </button>
      </div>
    </nav>
  );
}
