import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import GenerateScriptModal from '../components/GenerateScriptModal';
import { Plus, Zap } from 'lucide-react';
import { supabase } from '../../supabaseClient'; // Import supabase

export default function DashboardPage({ setPage, setActiveScript }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // For loading state
  const [error, setError] = useState(null); // For error handling

  const handleGenerateSubmit = async (formData) => {
    setIsGenerating(true);
    setError(null);
    try {
      const { data: newScript, error: functionError } = await supabase.functions.invoke('generate-script', {
        body: formData,
      });

      if (functionError) {
        throw functionError;
      }

      // The function now returns the full script object, ready to be used
      setActiveScript(newScript);
      setIsModalOpen(false);
      setPage('script-builder'); // Navigate to the builder
    } catch (e) {
      console.error('Failed to generate script:', e);
      setError('There was an error generating your script. Please check the function logs.');
      // Keep the modal open to show the error
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar setPage={setPage} />
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => { setActiveScript(null); setPage('script-builder'); }}
            className="bg-indigo-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 flex items-center justify-center gap-3 text-lg"
          >
            <Plus size={24} /> Create New Script
          </button>
          <button
            onClick={() => {
              setError(null); // Clear previous errors when opening modal
              setIsModalOpen(true);
            }}
            className="bg-purple-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:bg-purple-700 transition duration-300 flex items-center justify-center gap-3 text-lg"
            disabled={isGenerating}
          >
            <Zap size={24} /> {isGenerating ? 'Generating...' : 'Generate AI Script'}
          </button>
          <button
            onClick={() => setPage('saved-scripts')}
            className="bg-green-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:bg-green-700 transition duration-300 flex items-center justify-center gap-3 text-lg"
          >
            View Saved Scripts
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Recent Activity</h2>
          <p className="text-gray-600">No recent activity to display.</p>
        </div>
      </div>

      {isModalOpen && (
        <GenerateScriptModal
          onSubmit={handleGenerateSubmit}
          onClose={() => setIsModalOpen(false)}
          isGenerating={isGenerating}
          error={error}
        />
      )}
    </div>
  );
}
