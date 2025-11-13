import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import GenerateScriptModal from '../components/GenerateScriptModal';
import { Plus, Zap, Settings } from 'lucide-react';

export default function DashboardPage({ setPage, setActiveScript }) { // Changed prop
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleGenerateSubmit = (formData) => {
    // Create a more realistic, two-sided placeholder script
    const nodes = [
      { 
        id: '1', type: 'script', position: { x: 0, y: 0 }, 
        data: { speaker: 'You', text: `Hi, my name is ${formData.yourName || 'Alex'}. I'm calling from ${formData.yourBusiness || 'our company'}.` } 
      },
      { 
        id: '2', type: 'script', position: { x: 400, y: 200 }, 
        data: { speaker: 'Prospect', text: `Okay, what is this regarding?` } 
      },
      { 
        id: '3', type: 'script', position: { x: 0, y: 400 }, 
        data: { speaker: 'You', text: `We work with companies in the ${formData.niche || 'your'} space to solve ${formData.painPoint || 'a common problem'} with our ${formData.product || 'solution'}.` } 
      },
      { 
        id: '4', type: 'script', position: { x: 400, y: 600 }, 
        data: { speaker: 'Prospect', text: `I'm not sure we have that problem.` } 
      },
      { 
        id: '5', type: 'script', position: { x: 0, y: 800 }, 
        data: { speaker: 'You', text: `I understand. I was hoping to ${formData.cta || 'learn more about your needs'}. Are you available for a brief chat next week?` } 
      },
    ];

    const edges = [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2-3', source: '2', target: '3', animated: true },
      { id: 'e3-4', source: '3', target: '4', animated: true },
      { id: 'e4-5', source: '4', target: '5', animated: true },
    ];

    // Pass the generated script up to the App component
    setActiveScript({ nodes, edges }); // Use setActiveScript
    
    setIsModalOpen(false);
    setPage('script-builder'); // Navigate to the builder
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar setPage={setPage} />
      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => { setActiveScript(null); setPage('script-builder'); }} // Use setActiveScript
            className="bg-indigo-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 flex items-center justify-center gap-3 text-lg"
          >
            <Plus size={24} /> Create New Script
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-purple-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md hover:bg-purple-700 transition duration-300 flex items-center justify-center gap-3 text-lg"
          >
            <Zap size={24} /> Generate Script Template
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
        />
      )}
    </div>
  );
}
