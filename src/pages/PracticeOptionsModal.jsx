import React, { useState } from 'react';

export default function PracticeOptionsModal({ onClose, onStart }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [error, setError] = useState('');

  const config = {
    popup_title: "Choose Practice Level",
    difficulty_label: "Difficulty Level*",
    voice_label: "Voice Option*",
    cancel_text: "Cancel",
    start_text: "Start Practice",
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedDifficulty || !selectedVoice) {
      setError('Please select both difficulty level and voice option.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const practiceSettings = {
      difficulty: selectedDifficulty,
      voice: selectedVoice
    };

    console.log('Starting practice with:', practiceSettings);
    if (onStart) onStart(practiceSettings);
  };

  const handleCancel = () => {
    setSelectedDifficulty(null);
    setSelectedVoice(null);
    setError('');
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'}}>
      {/* Animated Background Shapes */}
      <div className="fixed inset-0 z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl" style={{animation: 'float 6s ease-in-out infinite'}}></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-purple-300 bg-opacity-20 rounded-full blur-2xl" style={{animation: 'float 7s ease-in-out infinite 1s'}}></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-pink-300 bg-opacity-15 rounded-full blur-xl" style={{animation: 'float 8s ease-in-out infinite 2s'}}></div>
        <div className="absolute bottom-32 right-1/3 w-56 h-56 bg-blue-300 bg-opacity-10 rounded-full blur-2xl" style={{animation: 'float 6.5s ease-in-out infinite 1.5s'}}></div>
        <div className="absolute top-1/3 right-10 w-24 h-24 bg-yellow-200 bg-opacity-10 rounded-2xl blur-lg transform rotate-45" style={{animation: 'float 6s ease-in-out infinite'}}></div>
        <div className="absolute bottom-1/4 left-1/2 w-32 h-32 bg-indigo-300 bg-opacity-15 rounded-2xl blur-xl transform rotate-12" style={{animation: 'float 7s ease-in-out infinite 1s'}}></div>
      </div>

      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-20 z-20"></div>

      {/* Modal */}
      <div className="relative z-50 rounded-2xl shadow-2xl w-full max-w-2xl p-8 overflow-hidden" style={{background: 'linear-gradient(135deg, #e0f2fe 0%, #ddd6fe 50%, #fce7f3 100%)'}}>
        {/* Animated Background Shapes */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-10 right-16 w-40 h-40 bg-blue-400 rounded-full opacity-30 blur-xl"></div>
          <div className="absolute bottom-16 left-12 w-48 h-48 bg-purple-400 rounded-full opacity-25 blur-2xl"></div>
          <div className="absolute top-40 left-32 w-32 h-32 bg-pink-400 rounded-full opacity-20 blur-xl"></div>
          <div className="absolute bottom-32 right-24 w-36 h-36 bg-indigo-400 rounded-full opacity-30 blur-xl"></div>
          
          <svg className="absolute top-20 left-20 w-20 h-20 text-purple-500 opacity-40" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
            <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          
          <svg className="absolute bottom-24 right-40 w-16 h-16 text-pink-500 opacity-40" viewBox="0 0 100 100">
            <rect x="10" y="10" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="3" transform="rotate(45 50 50)" />
          </svg>
          
          <svg className="absolute top-48 right-12 w-18 h-18 text-blue-500 opacity-40" viewBox="0 0 100 100">
            <polygon points="50,10 90,90 10,90" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
          
          <svg className="absolute bottom-48 left-40 w-14 h-14 text-indigo-500 opacity-35" viewBox="0 0 100 100">
            <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        </div>

        {/* Content wrapper */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">{config.popup_title}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Difficulty Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3">{config.difficulty_label}</label>
              <div className="grid grid-cols-3 gap-3">
                {['Easy', 'Medium', 'Hard'].map((level, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDifficulty(level)}
                    className={`option-card px-4 py-3 border-2 rounded-lg font-semibold transition ${
                      selectedDifficulty === level
                        ? 'border-purple-600 bg-purple-100 text-purple-900'
                        : 'border-gray-300 text-gray-700 hover:border-purple-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3">{config.voice_label}</label>
              <div className="grid grid-cols-4 gap-3">
                {['A', 'B', 'C', 'D'].map((voice, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedVoice(voice)}
                    className={`option-card px-4 py-3 border-2 rounded-lg font-semibold transition ${
                      selectedVoice === voice
                        ? 'border-purple-600 bg-purple-100 text-purple-900'
                        : 'border-gray-300 text-gray-700 hover:border-purple-400'
                    }`}
                  >
                    Voice {voice}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
              >
                {config.cancel_text}
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition transform hover:scale-105"
              >
                {config.start_text}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
}