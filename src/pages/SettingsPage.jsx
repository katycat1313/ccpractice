import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { User, Key, Save } from 'lucide-react';
import { getUser, updateUser } from '../lib/supabaseAuth';

export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: '',
    role: '',
  });
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await getUser();
      if (user) {
        setProfile({
          name: user.user_metadata.name || '',
          role: user.user_metadata.role || '',
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleApiChange = (e) => {
    setApiKey(e.target.value);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    const { error } = await updateUser({ data: profile });
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Profile updated successfully!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-open-dyslexic">
      <Navbar />
      <div className="max-w-4xl mx-auto p-8 w-full">
        <h1 className="text-4xl font-bold mb-8 text-gray-900">Settings</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

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
