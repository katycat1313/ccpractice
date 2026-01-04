import React, { useState } from 'react';
import { ExternalLink, Key, CheckCircle, XCircle, Loader } from 'lucide-react';
import { setApiKey, validateApiKey, markApiKeyValidated } from '../utils/apiKeyManager';

/**
 * API Key Setup Wizard Component
 * Beautiful onboarding flow for users to configure their Gemini API key
 */
export default function ApiKeySetup({ onComplete, appName = 'Practice App', appColor = 'blue' }) {
    const [step, setStep] = useState(1);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [validating, setValidating] = useState(false);
    const [validationError, setValidationError] = useState('');

    const colorClasses = {
        blue: 'from-blue-600 to-purple-600',
        green: 'from-green-600 to-teal-600',
        orange: 'from-orange-600 to-yellow-600',
        red: 'from-red-600 to-pink-600',
    };

    const gradientClass = colorClasses[appColor] || colorClasses.blue;

    const handleValidateAndSave = async () => {
        setValidating(true);
        setValidationError('');

        const result = await validateApiKey(apiKeyInput.trim());

        if (result.valid) {
            setApiKey(apiKeyInput.trim());
            markApiKeyValidated();
            setStep(3); // Success step
            setTimeout(() => {
                onComplete();
            }, 2000);
        } else {
            setValidationError(result.error || 'Invalid API key');
        }

        setValidating(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
            <div className="max-w-2xl w-full">
                {/* Step 1: Welcome */}
                {step === 1 && (
                    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 animate-fade-in">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-6 mx-auto`}>
                            <Key className="text-white" size={40} />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 text-center mb-4">
                            Welcome to {appName}! 👋
                        </h1>
                        <p className="text-lg text-gray-600 text-center mb-8">
                            Let's get you set up in just a few simple steps.
                        </p>
                        <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                            <h3 className="font-semibold text-gray-900 mb-3">What you'll need:</h3>
                            <ul className="space-y-2 text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>A Google Gemini API key (free to get!)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>2 minutes of your time</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-500 mt-1">✓</span>
                                    <span>A microphone for voice practice</span>
                                </li>
                            </ul>
                        </div>
                        <button
                            onClick={() => setStep(2)}
                            className={`w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r ${gradientClass} hover:shadow-lg transform hover:scale-105 transition-all`}
                        >
                            Get Started →
                        </button>
                    </div>
                )}

                {/* Step 2: API Key Setup */}
                {step === 2 && (
                    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 animate-fade-in">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-6 mx-auto`}>
                            <Key className="text-white" size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
                            Get Your Free API Key
                        </h2>
                        <p className="text-gray-600 text-center mb-8">
                            {appName} uses Google Gemini AI for realistic conversations. You'll need your own API key.
                        </p>

                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
                            <h3 className="font-semibold text-blue-900 mb-3">How to get your API key:</h3>
                            <ol className="space-y-3 text-blue-800">
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">1.</span>
                                    <span>Click the button below to open Google AI Studio</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">2.</span>
                                    <span>Sign in with your Google account (it's free!)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">3.</span>
                                    <span>Click "Get API Key" and create a new key</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="font-bold">4.</span>
                                    <span>Copy the key and paste it below</span>
                                </li>
                            </ol>
                        </div>

                        <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${gradientClass} hover:shadow-lg transform hover:scale-105 transition-all mb-6`}
                        >
                            <ExternalLink size={20} />
                            Open Google AI Studio
                        </a>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Paste Your API Key:
                                </label>
                                <input
                                    type="password"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    placeholder="AIza..."
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                                />
                            </div>

                            {validationError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
                                    <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                                    <p className="text-red-800 text-sm">{validationError}</p>
                                </div>
                            )}

                            <button
                                onClick={handleValidateAndSave}
                                disabled={!apiKeyInput.trim() || validating}
                                className={`w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r ${gradientClass} hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
                            >
                                {validating ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Validating...
                                    </>
                                ) : (
                                    'Validate & Save API Key →'
                                )}
                            </button>

                            <button
                                onClick={() => setStep(1)}
                                className="w-full py-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 animate-fade-in text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 mx-auto">
                            <CheckCircle className="text-green-500" size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            You're All Set! 🎉
                        </h2>
                        <p className="text-lg text-gray-600 mb-8">
                            Your API key has been validated and saved securely. Let's start practicing!
                        </p>
                        <div className="animate-pulse">
                            <Loader className="text-gray-400 mx-auto" size={32} />
                            <p className="text-sm text-gray-500 mt-2">Loading your app...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
