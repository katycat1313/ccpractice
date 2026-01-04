import React from 'react';
import { Volume2, User } from 'lucide-react';

/**
 * Voice Selector Component
 * Allows users to choose between different Gemini voices
 */
export default function VoiceSelector({ selectedVoice, onVoiceChange, color = 'blue' }) {
    const voices = [
        { id: 'Puck', name: 'Alex', gender: 'Neutral', description: 'Friendly and approachable' },
        { id: 'Charon', name: 'Marcus', gender: 'Male', description: 'Deep and authoritative' },
        { id: 'Kore', name: 'Jordan', gender: 'Male', description: 'Professional and clear' },
        { id: 'Aoede', name: 'Sarah', gender: 'Female', description: 'Warm and engaging' },
        { id: 'Fenrir', name: 'David', gender: 'Male', description: 'Confident and direct' },
    ];

    const colorClasses = {
        blue: 'border-blue-500 bg-blue-50 text-blue-700',
        green: 'border-green-500 bg-green-50 text-green-700',
        orange: 'border-orange-500 bg-orange-50 text-orange-700',
        red: 'border-red-500 bg-red-50 text-red-700',
    };

    const selectedClass = colorClasses[color] || colorClasses.blue;

    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
                <Volume2 className="inline mr-2" size={16} />
                Select AI Voice:
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {voices.map((voice) => (
                    <button
                        key={voice.id}
                        onClick={() => onVoiceChange(voice.id)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${selectedVoice === voice.id
                                ? selectedClass
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="font-semibold text-gray-900 flex items-center gap-2">
                                    <User size={16} />
                                    {voice.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{voice.gender}</div>
                                <div className="text-sm text-gray-600 mt-1">{voice.description}</div>
                            </div>
                            {selectedVoice === voice.id && (
                                <div className="text-green-500">✓</div>
                            )}
                        </div>
                    </button>
                ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
                💡 The voice you select will be used for all AI conversations
            </p>
        </div>
    );
}
