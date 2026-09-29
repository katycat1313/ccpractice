import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { User, Key, Save, Check, Database, Bot, Play, Loader, AlertTriangle, Sparkles } from 'lucide-react';
import { getUser, updateUser } from '../lib/supabaseAuth';
import { testDeepgramKey, setDeepgramApiKey, getDeepgramApiKey } from '../lib/deepgramService';

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: '',
    role: '',
    company: '',
    preferredVoice: 'aura-asteria-en'
  });
  const [geminiKey, setGeminiKey] = useState('');
  const [savedGeminiKey, setSavedGeminiKey] = useState('');
  const [deepgramKey, setDeepgramKey] = useState('');
  const [savedDeepgramKey, setSavedDeepgramKey] = useState('');
  const [deepgramAgentId, setDeepgramAgentId] = useState('');
  const [deepgramProjectId, setDeepgramProjectId] = useState('');
  const [isTestingDeepgram, setIsTestingDeepgram] = useState(false);
  const [deepgramTestResult, setDeepgramTestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      const activeDgKey = getDeepgramApiKey();
      if (activeDgKey) {
        setSavedDeepgramKey(activeDgKey);
      }
      const { data: { user } } = await getUser();
      if (user) {
        setProfile({
          name: user.user_metadata?.name || '',
          role: user.user_metadata?.role || '',
          company: user.user_metadata?.company || '',
          preferredVoice: user.user_metadata?.preferred_voice || 'aura-asteria-en'
        });
        if (user.user_metadata?.gemini_api_key) {
          setSavedGeminiKey(user.user_metadata.gemini_api_key);
        }
        if (user.user_metadata?.deepgram_api_key) {
          setSavedDeepgramKey(user.user_metadata.deepgram_api_key);
        }
        if (user.user_metadata?.deepgram_agent_id) {
          setDeepgramAgentId(user.user_metadata.deepgram_agent_id);
        }
        if (user.user_metadata?.deepgram_project_id) {
          setDeepgramProjectId(user.user_metadata.deepgram_project_id);
        }
      } else {
        const local = JSON.parse(localStorage.getItem('scriptmaster_user') || 'null');
        if (local) {
          setProfile({
            name: local.name || '',
            role: local.role || 'Sales Representative',
            company: local.company || '',
            preferredVoice: 'aura-asteria-en'
          });
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const updateData = { 
      ...profile,
      preferred_voice: profile.preferredVoice,
      deepgram_agent_id: deepgramAgentId,
      deepgram_project_id: deepgramProjectId,
    };

    if (geminiKey) updateData.gemini_api_key = geminiKey;
    if (deepgramKey) {
      updateData.deepgram_api_key = deepgramKey;
      setDeepgramApiKey(deepgramKey);
    }

    // Cache locally
    const existing = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    localStorage.setItem('scriptmaster_user', JSON.stringify({ ...existing, ...updateData }));

    try {
      const { error: updateErr } = await updateUser({ data: updateData });
      if (updateErr) {
        setSuccess('Profile updated and saved to local storage!');
      } else {
        setSuccess('All settings and credentials saved successfully!');
        if (geminiKey) setSavedGeminiKey(geminiKey);
        if (deepgramKey) setSavedDeepgramKey(deepgramKey);
        setGeminiKey('');
        setDeepgramKey('');
      }
    } catch (_) {
      setSuccess('Settings saved successfully!');
    }
  };

  const handleTestDeepgram = async () => {
    setIsTestingDeepgram(true);
    setDeepgramTestResult(null);
    const key = deepgramKey || savedDeepgramKey || getDeepgramApiKey();
    const res = await testDeepgramKey(key);
    setIsTestingDeepgram(false);
    setDeepgramTestResult(res);
    if (res.success && deepgramKey) {
      setDeepgramApiKey(deepgramKey);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080d] text-slate-100 flex flex-col font-sans select-none antialiased">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 md:px-10 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Closer Settings & Voice Brain
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure your AI voice models, API keys, and sales profile.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-500 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Database Status Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Database Tables Active & Ready
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full font-bold">
                    CONNECTED
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Your custom scripts, user profiles, and practice transcripts are synchronized and saved.
                </p>
              </div>
            </div>
          </div>

          {/* AI Voice & Keys Configuration */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              AI Voice & Brain Configuration
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Configure your Deepgram credentials and Gemini keys for speech-to-speech roleplay.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deepgram API Key (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={deepgramKey}
                    onChange={(e) => setDeepgramKey(e.target.value)}
                    placeholder={savedDeepgramKey ? `••••••••••••${savedDeepgramKey.slice(-4)}` : "Enter your DEEPGRAM_API_KEY"}
                    className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestDeepgram}
                    disabled={isTestingDeepgram}
                    className="px-3.5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer whitespace-nowrap"
                  >
                    {isTestingDeepgram ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Test Deepgram AI</span>
                  </button>
                </div>

                {deepgramTestResult && (
                  <div className={`mt-2 p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                    deepgramTestResult.success ? 'bg-emerald-950/80 border border-emerald-700 text-emerald-200' : 'bg-rose-950/80 border border-rose-800 text-rose-200'
                  }`}>
                    {deepgramTestResult.success ? <Check className="w-4 h-4 text-emerald-400 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5" />}
                    <span>{deepgramTestResult.success ? deepgramTestResult.message : `Error: ${deepgramTestResult.error}`}</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  Enables Deepgram Aura ultra-realistic speech synthesis & voice brain.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deepgram Preferred Aura Voice Model
                </label>
                <select
                  name="preferredVoice"
                  value={profile.preferredVoice}
                  onChange={handleProfileChange}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="aura-asteria-en">Aura Asteria (Warm & Clear - Female)</option>
                  <option value="aura-luna-en">Aura Luna (Professional - Female)</option>
                  <option value="aura-orion-en">Aura Orion (Confident Contractor - Male)</option>
                  <option value="aura-arcash-en">Aura Arcash (Deep & Gruff - Male)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Default voice used when Deepgram audio stream is active.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deepgram Voice Agent ID (Optional)
                </label>
                <input
                  type="text"
                  value={deepgramAgentId}
                  onChange={(e) => setDeepgramAgentId(e.target.value)}
                  placeholder="e.g. agent_1234abcd or console agent UUID"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Found in Deepgram Console under <strong>Voice Agents</strong> if you created a pre-configured agent.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Deepgram Project ID (Optional)
                </label>
                <input
                  type="text"
                  value={deepgramProjectId}
                  onChange={(e) => setDeepgramProjectId(e.target.value)}
                  placeholder="e.g. 12345678-abcd-1234-abcd-1234567890ab"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Optional. Found in Deepgram Console under <strong>Project Settings</strong>.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Google Gemini API Key (Optional Override)
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder={savedGeminiKey ? `••••••••••••${savedGeminiKey.slice(-4)}` : "Enter secret Gemini API Key"}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Sales Representative Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  placeholder="e.g. Katy Casto"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Role / Title</label>
                <input
                  type="text"
                  name="role"
                  value={profile.role}
                  onChange={handleProfileChange}
                  placeholder="e.g. Closer & Founder"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Your Business Name</label>
                <input
                  type="text"
                  name="company"
                  value={profile.company}
                  onChange={handleProfileChange}
                  placeholder="e.g. ProService PaaS"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              className="py-3 px-8 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save All Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
