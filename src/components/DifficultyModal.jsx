import React, { useState } from 'react';
import { X } from 'lucide-react';

const difficulties = [
  { name: 'Easy', description: 'Prospect is generally agreeable and asks simple questions.' },
  { name: 'Medium', description: 'Prospect will have some objections and requires more persuasion.' },
  { name: 'Hard', description: 'Prospect is skeptical, busy, and has strong objections.' },
];

export default function DifficultyModal({ onStart, onClose }) {
  const [selected, setSelected] = useState('Medium');

  const handleStart = () => {
    onStart(selected);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-lg text-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Select Practice Difficulty</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4 mb-8">
          {difficulties.map(level => (
            <div
              key={level.name}
              onClick={() => setSelected(level.name)}
              className={`p-4 border-2 rounded-lg cursor-pointer transition ${selected === level.name ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}
            >
              <h3 className="font-semibold text-lg">{level.name}</h3>
              <p className="text-sm text-gray-600">{level.description}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleStart}
            className="bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-green-700 transition"
          >
            Start Practice
          </button>
        </div>
      </div>
    </div>
  );
}
