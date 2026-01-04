import React, { useState, useEffect } from 'react';
import { Phone, Settings, User, Mic, StopCircle } from 'lucide-react';
import ApiKeySetup from '../../../shared/components/ApiKeySetup.jsx';
import VoiceSelector from '../../../shared/components/VoiceSelector.jsx';
import { getApiKey, hasValidApiKey } from '../../../shared/utils/apiKeyManager.js';
import { useGeminiVoiceAgent } from '../../../shared/hooks/useGeminiVoiceAgent.js';
import { PROSPECT_LIST, getProspect } from './config/prospects.js';
import './App.css';

export default function ColdCallingCoachApp() {
    const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
    const [selectedProspect, setSelectedProspect] = useState(null);
    const [selectedVoice, setSelectedVoice] = useState('Charon'); // Default male voice
    const [showSettings, setShowSettings] = useState(false);
    const [inSession, setInSession] = useState(false);

    const apiKey = getApiKey();
    const { startConversation, stopConversation, isConnected, messages, error } = useGeminiVoiceAgent({
        apiKey,
        voiceName: selectedVoice,
    });

    useEffect(() => {
        setApiKeyConfigured(hasValidApiKey());
    }, []);

    const handleApiKeyComplete = () => {
        setApiKeyConfigured(true);
    };

    const handleStartCall = async () => {
        if (!selectedProspect) return;
        const prospect = getProspect(selectedProspect);
        const success = await startConversation(prospect.systemPrompt);
        if (success) {
            setInSession(true);
        } else {
            alert('Failed to start call. Check console for errors.');
        }
    };

    const handleEndCall = () => {
        stopConversation();
        setInSession(false);
    };

    if (!apiKeyConfigured) {
        return <ApiKeySetup onComplete={handleApiKeyComplete} appName="Cold Calling Coach" appColor="blue" />;
    }

    if (showSettings) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900 p-8">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-3xl shadow-2xl p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>
                        <VoiceSelector
                            selectedVoice={selectedVoice}
                            onVoiceChange={setSelectedVoice}
                            color="blue"
                        />
                    </div>
                </div>
            </div>
        );
    }

    if (!inSession) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900 p-8">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="flex justify-center mb-4">
                            <Phone className="text-white" size={64} />
                        </div>
                        <h1 className="text-5xl font-bold text-white mb-4">Cold Calling Coach</h1>
                        <p className="text-xl text-blue-200">
                            Practice your sales pitch with AI prospects
                        </p>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="mt-4 text-white/70 hover:text-white transition-colors flex items-center gap-2 mx-auto"
                        >
                            <Settings size={16} />
                            Settings
                        </button>
                    </div>

                    {/* Prospect Selection */}
                    <div className="bg-white rounded-3xl shadow-2xl p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Prospect</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {PROSPECT_LIST.map((prospect) => (
                                <button
                                    key={prospect.id}
                                    onClick={() => setSelectedProspect(prospect.id)}
                                    className={`p-6 rounded-2xl border-2 transition-all text-left ${selectedProspect === prospect.id
                                            ? 'border-blue-500 bg-blue-50 shadow-lg transform scale-105'
                                            : 'border-gray-200 hover:border-blue-300 bg-white'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-full ${prospect.color} flex items-center justify-center mb-3`}>
                                        <User className="text-white" size={24} />
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1">{prospect.name}</h3>
                                    <p className="text-sm text-gray-600 mb-2">{prospect.title}</p>
                                    <p className="text-xs text-gray-500 mb-3">{prospect.description}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${prospect.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                                prospect.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {prospect.difficulty.toUpperCase()}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {selectedProspect && (
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={handleStartCall}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-bold text-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center gap-3"
                                >
                                    <Phone size={24} />
                                    Start Practice Call
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // In session view
    const prospect = getProspect(selectedProspect);
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold">Live Call</h2>
                                <p className="text-sm opacity-90">Calling: {prospect.name} - {prospect.title}</p>
                            </div>
                            <div className="text-right">
                                <div className={`text-sm ${isConnected ? 'text-green-200' : 'text-red-200'}`}>
                                    {isConnected ? '🟢 Connected' : '⚪ Connecting...'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="h-[500px] overflow-y-auto p-6 bg-gray-50">
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                <strong>Error:</strong> {error}
                            </div>
                        )}
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-20">
                                <Mic className="mx-auto mb-4 text-gray-400" size={48} />
                                <p className="text-lg font-semibold">Call Started</p>
                                <p className="text-sm mt-2">Start speaking to begin the conversation</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.speaker === 'AI' ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.speaker === 'AI'
                                                    ? 'bg-purple-100 text-purple-900'
                                                    : 'bg-blue-500 text-white'
                                                }`}
                                        >
                                            <p className="text-xs opacity-70 mb-1">
                                                {msg.speaker === 'AI' ? prospect.name : 'You'}
                                            </p>
                                            <p className="text-sm">{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="bg-white border-t border-gray-200 p-6">
                        <div className="flex justify-center">
                            <button
                                onClick={handleEndCall}
                                className="flex items-center gap-3 px-8 py-4 rounded-full font-bold shadow-xl transform hover:scale-105 transition-all bg-red-500 hover:bg-red-600 text-white"
                            >
                                <StopCircle size={24} />
                                <span>End Call</span>
                            </button>
                        </div>
                        <p className="text-center text-gray-500 text-sm mt-4">
                            💡 Speak naturally - the AI will respond in real-time
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
