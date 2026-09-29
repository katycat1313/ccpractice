import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Navbar from '../components/Navbar';
import GenerateScriptModal from '../components/GenerateScriptModal';
import PracticeOptionsModal from './PracticeOptionsModal';
import { 
  Plus, 
  Zap, 
  AlertTriangle, 
  Loader, 
  Hammer, 
  Bot, 
  PhoneCall, 
  DollarSign, 
  Play, 
  ArrowRight,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ROUTES, API_ENDPOINTS } from '../config/constants';
import { PROSPECTS } from '../lib/prospects';

export default function DashboardPage({ setScript, setPracticeSettings }) {
  const [latestScript, setLatestScript] = useState(null);
  const [allScripts, setAllScripts] = useState([]);
  const [isPracticeOptionsOpen, setIsPracticeOptionsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        let currentUser = null;
        try {
          const { data: { user } } = await supabase.auth.getUser();
          currentUser = user;
        } catch (_) {}

        if (!currentUser) {
          currentUser = JSON.parse(localStorage.getItem('scriptmaster_user') || 'null');
        }

        if (!currentUser) {
          navigate(ROUTES.LOGIN);
          return;
        }

        setUserName(currentUser.name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Sales Closer');

        // Fetch scripts from Supabase and merge with local storage
        const localScripts = JSON.parse(localStorage.getItem('scriptmaster_saved_scripts') || '[]');
        let scriptsList = [...localScripts];

        try {
          const { data, error: scriptError } = await supabase
            .from('scripts')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (!scriptError && data && data.length > 0) {
            const ids = new Set(data.map(d => d.id));
            const nonDupes = scriptsList.filter(s => !ids.has(s.id));
            scriptsList = [...data, ...nonDupes];
          }
        } catch (scriptErr) {
          console.warn("Using local scripts cache:", scriptErr);
        }

        if (scriptsList.length > 0) {
          setAllScripts(scriptsList);
          setLatestScript(scriptsList[0]);
        }

      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [navigate]);

  const handlePractice = () => {
    if (latestScript) {
      setIsPracticeOptionsOpen(true);
    }
  };

  const handleStartPractice = (options) => {
    const scriptWithOptions = { ...latestScript, metadata: { ...latestScript?.metadata, ...options } };
    setScript(scriptWithOptions);
    setPracticeSettings({
      prospect: options.prospect,
      difficulty: options.difficulty
    });
    setIsPracticeOptionsOpen(false);
    navigate(ROUTES.PRACTICE);
  };

  const handleQuickLaunchScenario = (scriptId, prospectKey, difficulty = 'medium') => {
    const foundScript = allScripts.find(s => s.id === scriptId) || latestScript;
    const prospect = PROSPECTS[prospectKey] || PROSPECTS.hank;

    setScript(foundScript);
    setPracticeSettings({
      prospect,
      difficulty
    });
    navigate(ROUTES.PRACTICE);
  };

  const handleNewScript = () => {
    setScript(null);
    navigate(ROUTES.SCRIPT_BUILDER);
  };

  const handleGenerateSubmit = async (formData) => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const { data, error: genError } = await supabase.functions.invoke(API_ENDPOINTS.GENERATE_SCRIPT, {
        body: formData,
      });

      if (genError) {
        throw genError;
      }

      setScript(data);
      setIsGenerateModalOpen(false);
      navigate(ROUTES.SCRIPT_BUILDER);
    } catch (err) {
      console.error("Error invoking generate-script function:", err);
      let errorMessage = err.message || 'An unexpected error occurred during script generation.';
      setGenerateError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-white">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <Loader className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border-l-4 border-red-500 rounded-md flex items-center">
            <AlertTriangle className="w-6 h-6 mr-3 text-red-400" />
            <div>
              <p className="font-semibold text-red-200">An error occurred:</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-xs font-semibold text-indigo-300 mb-2">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Contractor & Freelance Cold Calling Arena
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-300 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(255,255,255,0.08)]">
              Welcome back, {userName}!
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-normal mt-1 leading-relaxed">
              Select a battle-tested sales scenario to drill your pitch, handle tough objections, and close 50% deposits.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(ROUTES.COACH)}
              className="py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-sm font-bold shadow-lg transition flex items-center gap-2"
            >
              <span>🤖</span> Coach & Ring Dialer
            </button>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg transition flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              Generate with AI
            </button>
            <button
              onClick={handleNewScript}
              className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Script Builder
            </button>
          </div>
        </div>

        {/* 4 Core Offerings Practice Arenas */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🎯</span> Practice Your Core Offerings
              </h2>
              <p className="text-xs text-slate-400">
                1-click to simulate realistic sales calls with live audio, voice AI & objection coaching
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Contractor PaaS */}
            <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Hammer className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 border border-amber-500/20">
                    Contractor PaaS
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">
                  Custom Contractor Management PaaS
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Pitch Hank Miller (Roofing & HVAC owner in truck). Overcome the "we already use paper or BuilderTrend" objection and close on 1-click change orders.
                </p>
                <div className="mt-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="font-semibold text-slate-400">Target Buyer: </span> Hank Miller (Gruff, in truck) • Medium/Hard
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 6-Step Script Ready
                </span>
                <button
                  onClick={() => handleQuickLaunchScenario('script-contractor-paas', 'hank', 'medium')}
                  className="py-2 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Start Practice Call
                </button>
              </div>
            </div>

            {/* 2. 24/7 AI Receptionist */}
            <div className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-blue-300 border border-blue-500/20">
                    AI Phone Agent
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition">
                  24/7 AI Receptionist & Emergency Triage
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Pitch Dave Kowalski (Master Plumber). Prove the AI sounds natural, captures emergency jobs when hands are dirty, and stops lost $3K calls.
                </p>
                <div className="mt-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="font-semibold text-slate-400">Target Buyer: </span> Dave Kowalski (Under sink) • Medium/Hard
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live Demo Pitch Ready
                </span>
                <button
                  onClick={() => handleQuickLaunchScenario('script-ai-receptionist', 'dave', 'medium')}
                  className="py-2 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Start Practice Call
                </button>
              </div>
            </div>

            {/* 3. Missed Call Text Back */}
            <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/20">
                    Instant Lead Rescue
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                  Missed Call Text Back & Quote Rescue
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Pitch trade contractors on automatic 5-second SMS replies when they miss a call, preventing callers from hiring the next competitor on Google.
                </p>
                <div className="mt-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="font-semibold text-slate-400">Target Buyer: </span> Hank Miller or Dave Kowalski • Fast Close
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ROI Hook Ready
                </span>
                <button
                  onClick={() => handleQuickLaunchScenario('script-missed-call-text', 'hank', 'medium')}
                  className="py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Start Practice Call
                </button>
              </div>
            </div>

            {/* 4. Freelance Dev (50% Deposit Close) */}
            <div className="bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-purple-300 border border-purple-500/20">
                    50% Deposit Closing
                  </span>
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                  Custom Freelance Dev: Closing the 50% Deposit
                </h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Pitch Julian Thorne. Handle the critical objection: "Why should I pay 50% upfront before you build anything? Can we do 100% on delivery?"
                </p>
                <div className="mt-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300">
                  <span className="font-semibold text-slate-400">Target Buyer: </span> Julian Thorne (Savvy negotiator) • Hard
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Milestone Script Ready
                </span>
                <button
                  onClick={() => handleQuickLaunchScenario('script-freelance-deposit-close', 'julian', 'hard')}
                  className="py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Start Practice Call
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Script & Custom Settings */}
        {latestScript && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Current Active Script
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {latestScript.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {latestScript.metadata?.niche ? `Target: ${latestScript.metadata.niche} • ` : ''}
                {latestScript.metadata?.pain ? `Pain: ${latestScript.metadata.pain}` : ''}
              </p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  setScript(latestScript);
                  navigate(ROUTES.SCRIPT_BUILDER);
                }}
                className="flex-1 md:flex-none py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition"
              >
                Edit Script Flow
              </button>
              <button
                onClick={handlePractice}
                className="flex-1 md:flex-none py-2.5 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
              >
                Custom Practice Setup <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {isGenerateModalOpen && (
        <GenerateScriptModal
          onClose={() => {
            setIsGenerateModalOpen(false);
            setGenerateError(null);
          }}
          onSubmit={handleGenerateSubmit}
          isGenerating={isGenerating}
          error={generateError}
        />
      )}

      {isPracticeOptionsOpen && (
        <PracticeOptionsModal 
          onStart={handleStartPractice}
          onClose={() => setIsPracticeOptionsOpen(false)}
        />
      )}
    </div>
  );
}

DashboardPage.propTypes = {
  setScript: PropTypes.func.isRequired,
  setPracticeSettings: PropTypes.func.isRequired,
};
