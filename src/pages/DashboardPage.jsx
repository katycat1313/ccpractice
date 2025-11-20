import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import GenerateScriptModal from '../components/GenerateScriptModal';
import { Plus, Zap, AlertTriangle, Loader } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage({ setScript }) {
  const [latestScript, setLatestScript] = useState(null);
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

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw new Error(`Authentication error: ${userError.message}`);
        }

        if (!user) {
          navigate('/login');
          return;
        }

        setUserName(user.user_metadata.name || user.email);

        const { data, error: scriptError } = await supabase
          .from('scripts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (scriptError && scriptError.code !== 'PGRST116') { // Ignore "exact one row expected" error for users with no scripts
          throw new Error(`Failed to fetch script: ${scriptError.message} (Code: ${scriptError.code})`);
        }

        if (data) {
          setLatestScript(data);
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
      setScript(latestScript);
      navigate('/practice');
    }
  };

  const handleNewScript = () => {
    setScript(null);
    navigate('/script-builder');
  };

  const handleGenerateSubmit = async (formData) => {
    setIsGenerating(true);
    setGenerateError(null);
https://console.cloud.google.com/billing/01C2EE-8C7C5B-10B751/export?project=lead-connect-ai    try {
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: formData,
      });

      if (error) {
        throw error;
      }

      setScript(data);
      setIsGenerateModalOpen(false);
      navigate('/script-builder');
    } catch (err) {
      console.error("Error invoking generate-script function:", err);
      let errorMessage = err.message || 'An unexpected error occurred during script generation.';
      if (err.context && typeof err.context.json === 'function') {
        try {
          const errorBody = await err.context.json();
          console.error("Error body:", errorBody);
          errorMessage = errorBody.error || errorMessage;
        } catch (parseError) {
          console.error("Failed to parse error response body:", parseError);
        }
      }
      
      if (err.context && err.context.status === 402) {
        setGenerateError("You have run out of free trial credits. Please add your API key in Settings to continue generating scripts.");
      } else {
        setGenerateError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#f8f9fa]">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <Loader className="w-12 h-12 animate-spin text-[#003366]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 rounded-md flex items-center">
              <AlertTriangle className="w-6 h-6 mr-3 text-red-700" />
              <div>
                <p className="font-semibold text-red-800">An error occurred:</p>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <h1 className="text-4xl font-bold text-[#212529] mb-4">Welcome back, {userName}!</h1>
          <p className="text-xl text-gray-600 mb-8">What would you like to do today?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <button
              onClick={handleNewScript}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="w-16 h-16 text-[#003366] mb-4" />
              <h2 className="text-2xl font-semibold text-[#212529]">Start from Scratch</h2>
              <p className="text-gray-600 mt-2">Create a new script using the script builder.</p>
            </button>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              <Zap className="w-16 h-16 text-[#00a8e8] mb-4" />
              <h2 className="text-2xl font-semibold text-[#212529]">Generate with AI</h2>
              <p className="text-gray-600 mt-2">Let our AI help you create a script.</p>
            </button>
          </div>

          {latestScript && (
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-semibold text-[#212529] mb-4">Your Latest Script</h3>
              <p className="text-lg text-gray-600 mb-4">{latestScript.name}</p>
              <button
                onClick={handlePractice}
                className="w-full bg-[#003366] text-white py-4 rounded-md hover:bg-[#0055a4] transition-colors text-lg font-semibold"
              >
                Practice Now
              </button>
            </div>
          )}
        </div>
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
    </div>
  );
}
