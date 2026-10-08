import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { 
  User, 
  Key, 
  Save, 
  Play, 
  Volume2,
  Users,
  Plus,
  Trash2,
  Edit2,
  PhoneCall,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getGeminiApiKey, setGeminiApiKey, getGeminiTTSAudio } from '../lib/geminiClient';
import { getDeepgramApiKey, setDeepgramApiKey } from '../lib/deepgramService';
import { getCoachMemory, saveCoachMemory } from '../lib/coachMemory';
import { 
  getCustomProspects, 
  saveProspect, 
  deleteProspect, 
  getSelectedProspectId, 
  setSelectedProspectId 
} from '../lib/prospectManager';

const COACH_VOICES = [
  { id: 'Fenrir', name: 'Fenrir (Gemini Live)', gender: 'male', persona: 'Marcus Vance', tone: 'Deep, authoritative, encouraging American mentor' },
  { id: 'Aoede', name: 'Aoede (Gemini Live)', gender: 'female', persona: 'Elena Rostova', tone: 'Articulate, sharp, confident enterprise closer' },
  { id: 'Puck', name: 'Puck (Gemini Live)', gender: 'male', persona: 'Sales Peer', tone: 'Natural, energetic American peer closer' },
  { id: 'aura-orion-en', name: 'Aura Orion (Deepgram)', gender: 'male', persona: 'Marcus Vance', tone: 'Natural human breath & conversational rhythm' },
  { id: 'aura-stella-en', name: 'Aura Stella (Deepgram)', gender: 'female', persona: 'Elena Rostova', tone: 'Warm, articulate, natural female cadence' }
];

const PROSPECT_VOICES = [
  { id: 'Charon', name: 'Charon (Gemini Live)', gender: 'male', persona: 'Hank Miller', tone: 'Gruff, skeptical American contractor in truck cab' },
  { id: 'Zephyr', name: 'Zephyr (Gemini Live)', gender: 'female', persona: 'Sarah Chen', tone: 'Crisp, direct, commercial director' },
  { id: 'Orus', name: 'Orus (Gemini Live)', gender: 'male', persona: 'Dave Campbell', tone: 'Calm, measured, analytical facility owner' },
  { id: 'aura-arcas-en', name: 'Aura Arcas (Deepgram)', gender: 'male', persona: 'Hank Miller', tone: 'Grounded, authentic American contractor' },
  { id: 'aura-asteria-en', name: 'Aura Asteria (Deepgram)', gender: 'female', persona: 'Sarah Chen', tone: 'Polished, corporate commercial buyer' }
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'prospects' | 'voices' | 'env'
  const [saveToast, setSaveToast] = useState(null);

  // Profile & Background
  const [profile, setProfile] = useState({
    name: 'Sales Rep',
    coachName: 'Coach',
    role: 'Commercial Closer',
    workBackground: '',
    whatISell: '',
    targetNiche: '',
    targetProspects: '',
    mainHurdles: ''
  });

  // Voice Tuning
  const [voiceSettings, setVoiceSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('scriptmaster_voice_settings');
      return saved ? JSON.parse(saved) : {
        coachVoice: 'Fenrir',
        prospectVoice: 'Charon'
      };
    } catch (_) {
      return { coachVoice: 'Fenrir', prospectVoice: 'Charon' };
    }
  });

  // Env variables
  const [envKeys, setEnvKeys] = useState({
    geminiApiKey: '',
    deepgramApiKey: ''
  });

  // Custom Prospects
  const [prospects, setProspects] = useState([]);
  const [activeProspectId, setActiveProspectId] = useState('prosp-hank');
  const [isEditingProspect, setIsEditingProspect] = useState(false);
  const [editingProspectData, setEditingProspectData] = useState({
    id: null,
    name: '',
    companyName: '',
    role: '',
    industry: '',
    city: '',
    skepticism: 'High',
    bleedingNeckPain: '',
    commonObjections: '',
    greeting: ''
  });

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
    const memory = getCoachMemory();
    setProfile({
      name: localUser.name || memory.userName || 'Sales Rep',
      coachName: localUser.coachName || 'Coach',
      role: localUser.role || 'Sales Closer',
      workBackground: localUser.workBackground || '5 years B2B contractor and commercial sales',
      whatISell: localUser.whatISell || memory.productOrService || 'Commercial Roofing Maintenance Agreements',
      targetNiche: localUser.targetNiche || 'Commercial Facilities & Property Management',
      targetProspects: localUser.targetProspects || memory.targetProspect || 'Building Owners & Facility Directors',
      mainHurdles: localUser.mainHurdles || (memory.objectionsToMaster || []).join(', ')
    });

    setEnvKeys({
      geminiApiKey: getGeminiApiKey(),
      deepgramApiKey: getDeepgramApiKey()
    });

    setProspects(getCustomProspects());
    setActiveProspectId(getSelectedProspectId());

    const handleProspectsUpdate = () => {
      setProspects(getCustomProspects());
      setActiveProspectId(getSelectedProspectId());
    };
    window.addEventListener('scriptmaster_prospects_updated', handleProspectsUpdate);
    return () => {
      window.removeEventListener('scriptmaster_prospects_updated', handleProspectsUpdate);
    };
  }, []);

  const showToast = (msg) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveProfile = () => {
    try {
      const user = JSON.parse(localStorage.getItem('scriptmaster_user') || '{}');
      const updatedUser = { ...user, ...profile };
      localStorage.setItem('scriptmaster_user', JSON.stringify(updatedUser));

      const mem = getCoachMemory();
      mem.userName = profile.name ? profile.name.split(' ')[0] : 'Closer';
      mem.productOrService = profile.whatISell;
      mem.targetProspect = profile.targetProspects;
      if (profile.mainHurdles) {
        mem.objectionsToMaster = profile.mainHurdles.split(',').map(s => s.trim()).filter(Boolean);
      }
      saveCoachMemory(mem);

      showToast('Sales profile updated!');
    } catch (e) {
      console.warn('Profile save error:', e);
    }
  };

  const handleSaveVoice = (key, val) => {
    const updated = { ...voiceSettings, [key]: val };
    setVoiceSettings(updated);
    localStorage.setItem('scriptmaster_voice_settings', JSON.stringify(updated));
  };

  const handleTestVoice = async (voiceId, gender, sampleText) => {
    try {
      const res = await getGeminiTTSAudio(
        sampleText || "Hey there, ready to sharpen your pitch?",
        voiceId,
        gender
      );
      if (res && res.audioBase64) {
        const audio = new Audio(`data:${res.mimeType || 'audio/wav'};base64,${res.audioBase64}`);
        audio.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Voice preview error:', err);
    }
  };

  const handleSaveEnvKeys = () => {
    if (envKeys.geminiApiKey) setGeminiApiKey(envKeys.geminiApiKey);
    if (envKeys.deepgramApiKey) setDeepgramApiKey(envKeys.deepgramApiKey);
    showToast('API credentials saved!');
  };

  const handleOpenNewProspect = () => {
    setEditingProspectData({
      id: null,
      name: '',
      companyName: '',
      role: '',
      industry: '',
      city: '',
      skepticism: 'High',
      bleedingNeckPain: '',
      commonObjections: '',
      greeting: ''
    });
    setIsEditingProspect(true);
  };

  const handleEditProspect = (p) => {
    setEditingProspectData({
      id: p.id,
      name: p.name || '',
      companyName: p.companyName || '',
      role: p.role || '',
      industry: p.industry || '',
      city: p.city || '',
      skepticism: p.skepticism || 'High',
      bleedingNeckPain: p.bleedingNeckPain || '',
      commonObjections: Array.isArray(p.commonObjections) ? p.commonObjections.join(', ') : (p.commonObjections || ''),
      greeting: p.greeting || ''
    });
    setIsEditingProspect(true);
  };

  const handleSaveProspectForm = () => {
    if (!editingProspectData.name) {
      alert('Please enter a prospect name.');
      return;
    }
    saveProspect(editingProspectData);
    setIsEditingProspect(false);
    showToast(`Saved "${editingProspectData.name}"`);
  };

  const handleDeleteProspect = (id, name) => {
    deleteProspect(id);
    showToast(`Deleted "${name}"`);
  };

  const handleSelectProspectForPractice = (p) => {
    setSelectedProspectId(p.id);
    navigate('/practice');
  };

  const tabs = [
    { id: 'profile', label: 'My Sales Profile', icon: User },
    { id: 'prospects', label: 'Prospect Personas', icon: Users },
    { id: 'voices', label: 'Voice Tuning', icon: Volume2 },
    { id: 'env', label: 'Environment Keys', icon: Key }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F6FC] to-[#ECEEF8] text-[#1e293b] flex flex-col font-sans antialiased">
      <Navbar />

      {saveToast && (
        <div className="fixed top-20 right-6 z-50 bg-white border border-slate-200/80 text-slate-800 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{saveToast}</span>
        </div>
      )}

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-600 text-xs font-semibold shadow-xs border border-slate-200/70 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>

            <span className="text-slate-300">/</span>

            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                Settings & Profiles
              </h1>
            </div>
          </div>
        </div>

        {/* Tab Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white shadow-[0_4px_14px_rgba(99,102,241,0.25)]'
                    : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/70 shadow-xs'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Profile & Background */}
        {activeTab === 'profile' && (
          <div className="soft-card p-6 sm:p-7 space-y-5 animate-fadeIn">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                Sales Rep Profile & Background
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Marcus Vance uses your background to craft personalized advice and stop asking what you sell.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Your Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Role Title</label>
                <input
                  type="text"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Coach Name</label>
              <input
                type="text"
                value={profile.coachName}
                onChange={(e) => setProfile({ ...profile, coachName: e.target.value })}
                placeholder="Coach"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Use “Coach” now, or give the coach a custom name later.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">What You Sell (Product / Service)</label>
              <input
                type="text"
                value={profile.whatISell}
                onChange={(e) => setProfile({ ...profile, whatISell: e.target.value })}
                placeholder="e.g. Commercial Roofing Maintenance Agreements"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Niche</label>
                <input
                  type="text"
                  value={profile.targetNiche}
                  onChange={(e) => setProfile({ ...profile, targetNiche: e.target.value })}
                  placeholder="e.g. Commercial Facility Management"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Prospects (Decision Makers)</label>
                <input
                  type="text"
                  value={profile.targetProspects}
                  onChange={(e) => setProfile({ ...profile, targetProspects: e.target.value })}
                  placeholder="e.g. Building Owners, Operations Directors"
                  className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Work Experience & Background</label>
              <textarea
                rows={2}
                value={profile.workBackground}
                onChange={(e) => setProfile({ ...profile, workBackground: e.target.value })}
                placeholder="e.g. 5 years selling preventative B2B service contracts..."
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-indigo-400 leading-relaxed"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveProfile}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:opacity-95 text-white font-semibold text-xs transition shadow-[0_4px_14px_rgba(99,102,241,0.25)] flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Custom Prospects */}
        {activeTab === 'prospects' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Custom Prospect Personas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Personas with distinct skepticism levels and pain points</p>
              </div>

              <button
                onClick={handleOpenNewProspect}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Prospect</span>
              </button>
            </div>

            {/* Editing Modal / Form */}
            {isEditingProspect && (
              <div className="soft-card p-6 border-indigo-200/80 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-900">
                    {editingProspectData.id ? 'Edit Prospect' : 'New Prospect'}
                  </h4>
                  <button
                    onClick={() => setIsEditingProspect(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={editingProspectData.name}
                      onChange={(e) => setEditingProspectData({ ...editingProspectData, name: e.target.value })}
                      placeholder="Hank Miller"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Company</label>
                    <input
                      type="text"
                      value={editingProspectData.companyName}
                      onChange={(e) => setEditingProspectData({ ...editingProspectData, companyName: e.target.value })}
                      placeholder="Miller HVAC"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">City</label>
                    <input
                      type="text"
                      value={editingProspectData.city}
                      onChange={(e) => setEditingProspectData({ ...editingProspectData, city: e.target.value })}
                      placeholder="Chicago, IL"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Bleeding Neck Pain</label>
                  <input
                    type="text"
                    value={editingProspectData.bleedingNeckPain}
                    onChange={(e) => setEditingProspectData({ ...editingProspectData, bleedingNeckPain: e.target.value })}
                    placeholder="Losing $4,000/mo on unbilled van inventory..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setIsEditingProspect(false)}
                    className="px-4 py-1.5 rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProspectForm}
                    className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold shadow-xs"
                  >
                    Save Prospect
                  </button>
                </div>
              </div>
            )}

            {/* Prospects Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {prospects.map((p) => {
                const isSelected = activeProspectId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`soft-card p-5 flex flex-col justify-between transition-all ${
                      isSelected ? 'ring-2 ring-indigo-500/20 border-indigo-200' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {p.city || 'Regional'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditProspect(p)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteProspect(p.id, p.name)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 mt-2">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={p.name}
                            className="w-9 h-9 rounded-full object-cover object-top border border-slate-200/80 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                            {p.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 tracking-tight truncate">{p.name}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{p.role} · {p.companyName}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-snug line-clamp-2">
                        {p.bleedingNeckPain}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {isSelected ? '✓ Selected' : 'Saved'}
                      </span>
                      <button
                        onClick={() => handleSelectProspectForPractice(p)}
                        className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white text-xs font-semibold shadow-xs flex items-center gap-1"
                      >
                        <PhoneCall className="w-3 h-3 fill-white" />
                        <span>Practice</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Voices */}
        {activeTab === 'voices' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Coach Voice */}
            <div className="soft-card p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">AI Coach Voice (Marcus / Elena)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select the voice engine for sales mentoring and live feedback</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COACH_VOICES.map((v) => {
                  const isSelected = voiceSettings.coachVoice === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSaveVoice('coachVoice', v.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                          : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900">{v.name}</span>
                          <span className="text-[10px] text-slate-400">{v.persona}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-snug">{v.tone}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-indigo-600">{isSelected ? '✓ Active' : 'Select'}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(v.id, v.gender, "Hey there, ready to sharpen your pitch?");
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 rounded-full transition flex items-center gap-1 shadow-xs border border-slate-200/70"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" /> Preview
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prospect Voice */}
            <div className="soft-card p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Prospect Voice (Hank / Sarah / Dave)</h3>
                <p className="text-xs text-slate-400 mt-0.5">Simulated voice of the buyer answering your cold call</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PROSPECT_VOICES.map((v) => {
                  const isSelected = voiceSettings.prospectVoice === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSaveVoice('prospectVoice', v.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                          : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900">{v.name}</span>
                          <span className="text-[10px] text-slate-400">{v.persona}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-snug">{v.tone}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-indigo-600">{isSelected ? '✓ Active' : 'Select'}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestVoice(v.id, v.gender, "Hank here, make it quick. I'm on a job site.");
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 rounded-full transition flex items-center gap-1 shadow-xs border border-slate-200/70"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" /> Preview
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Environment Keys */}
        {activeTab === 'env' && (
          <div className="soft-card p-6 sm:p-7 space-y-4 animate-fadeIn">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">API Keys & Environment Variables</h3>
              <p className="text-xs text-slate-400 mt-0.5">Stored securely in your local browser sandbox</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Gemini API Key</label>
              <input
                type="password"
                value={envKeys.geminiApiKey}
                onChange={(e) => setEnvKeys({ ...envKeys, geminiApiKey: e.target.value })}
                placeholder="AIzaSy... (leave blank to use server environment key)"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Deepgram API Key</label>
              <input
                type="password"
                value={envKeys.deepgramApiKey}
                onChange={(e) => setEnvKeys({ ...envKeys, deepgramApiKey: e.target.value })}
                placeholder="Deepgram Aura key (leave blank to use server key)"
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-400 font-mono"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSaveEnvKeys}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#6366f1] to-[#4f46e5] text-white text-xs font-semibold transition shadow-[0_4px_14px_rgba(99,102,241,0.25)] flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save API Keys</span>
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
