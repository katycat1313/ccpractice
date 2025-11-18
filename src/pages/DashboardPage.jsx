import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import GenerateScriptModal from '../components/GenerateScriptModal';
import { Plus, Zap } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage({ setScript }) {
  const [latestScript, setLatestScript] = useState(null);
  const [userName, setUserName] = useState('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatestScript = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata.name || user.email);
        const { data, error } = await supabase
          .from('scripts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (data) {
          setLatestScript(data);
        } else if (error && error.code !== 'PGRST116') { // Ignore "exact one row expected" error
          console.error('Error fetching latest script:', error);
        }
      }
    };
    fetchLatestScript();
  }, []);

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

  return (
    <div className="flex flex-col h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
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
          onClose={() => setIsGenerateModalOpen(false)}
          setScript={setScript}
        />
      )}
    </div>
  );
}
