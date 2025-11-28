import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Mic, StopCircle, X } from 'lucide-react';
import { useDeepgramVoiceAgent } from '../hooks/useDeepgramVoiceAgent';

/**
 * Simplified PracticePage using DeepGram Voice Agent
 *
 * Baby steps approach:
 * 1. Just get the AI talking - voice in, voice out
 * 2. Later we can add prompting, scripts, feedback, etc.
 */
export default function PracticePageSimple({ onClose }) {
  const { startConversation, stopConversation, isConnected, messages, error } = useDeepgramVoiceAgent();
  const [deepgramApiKey, setDeepgramApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);

  const handleStart = async () => {
    if (!deepgramApiKey) {
      alert('Please enter your DeepGram API key');
      return;
    }

    const success = await startConversation(deepgramApiKey);
    if (success) {
      setShowApiKeyInput(false);
    }
  };

  const handleStop = () => {
    stopConversation();
    setShowApiKeyInput(true);
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 bg-gradient-to-br from-purple-600 via-blue-600 to-pink-600">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">Practice Session</h2>
              <p className="text-sm mt-1 opacity-90">
                {isConnected ? '🟢 Connected' : '⚪ Not connected'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* API Key Input (shown before starting) */}
        {showApiKeyInput && (
          <div className="p-6 bg-yellow-50 border-b border-yellow-200">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              DeepGram API Key
            </label>
            <input
              type="password"
              value={deepgramApiKey}
              onChange={(e) => setDeepgramApiKey(e.target.value)}
              placeholder="Enter your DeepGram API key..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-2">
              Get your API key from <a href="https://console.deepgram.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">DeepGram Console</a>
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Conversation Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              <p className="text-lg">Click "Start Practice" to begin your conversation</p>
              <p className="text-sm mt-2">The AI will listen and respond to you</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.speaker === 'AI' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-6 py-3 ${
                    msg.speaker === 'AI'
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 opacity-80">
                    {msg.speaker}
                  </p>
                  <p className="text-base">{msg.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Controls */}
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="flex justify-center items-center gap-4">
            {!isConnected ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                <Mic size={24} />
                <span className="text-lg">Start Practice</span>
              </button>
            ) : (
              <button
                onClick={handleStop}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                <StopCircle size={24} />
                <span className="text-lg">Stop Practice</span>
              </button>
            )}
          </div>

          {isConnected && (
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Speak naturally - the AI is listening and will respond
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

PracticePageSimple.propTypes = {
  onClose: PropTypes.func.isRequired,
};
