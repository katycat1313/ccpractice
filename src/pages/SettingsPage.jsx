import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { User, Key, Save } from 'lucide-react';

export default function SettingsPage({ setPage }) {
  const [profile, setProfile] = useState({
    name: 'Alex',
    role: 'Sales Development Rep',
  });
  const [apiKey, setApiKey] = useState('');

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleApiChange = (e) => {
    setApiKey(e.target.value);
  };

  const handleSave = () => {
    // In a real app, this would save to a backend.
    // For now, it just logs to the console.
    console.log('Saving Profile:', profile);
    console.log('Saving API Key:', apiKey);
    alert('Settings saved! (Check console for values)');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-open-dyslexic">
      <Navbar setPage={setPage} />
      <div className="max-w-4xl mx-auto p-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Settings</h1>

        {/* Profile Information Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-800">
            <User className="mr-3" /> Profile Information
          </h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
              <input
                type="text"
                name="role"
                value={profile.role}
                onChange={handleProfileChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* API Key Section */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold mb-6 flex items-center text-gray-800">
            <Key className="mr-3" /> API Configuration
          </h2>
          <p className="text-gray-600 mb-4">
            Your API key is stored securely and is only used to connect to your AI provider.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vertex AI API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={handleApiChange}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your secret API key"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 flex items-center gap-2"
          >
            <Save size={20} /> Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
}
