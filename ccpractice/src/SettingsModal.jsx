import React from 'react';
import { X } from 'lucide-react';

export default function SettingsModal({
  apiKey, setApiKey,
  difficulty, setDifficulty,
  voiceEnabled, setVoiceEnabled,
  setShowSettings,
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button onClick={() => setShowSettings(false)}><X size={24} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Gemini API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Paste your API key" className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full px-3 py-2 border rounded">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold">Enable AI Voice</label>
            <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`w-12 h-6 rounded-full flex items-center transition-colors ${voiceEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}>
              <span className={`inline-block w-5 h-5 bg-white rounded-full transform transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <button onClick={() => setShowSettings(false)} className="w-full bg-indigo-600 text-white font-semibold py-2 rounded">Done</button>
        </div>
      </div>
    </div>
  );
}