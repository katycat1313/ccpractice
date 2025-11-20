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
  const [savedApiKey, setSavedApiKey] = useState('');
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
        if (user.user_metadata.gemini_api_key) {
          setSavedApiKey(user.user_metadata.gemini_api_key);
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

  const handleApiChange = (e) => {
    setApiKey(e.target.value);
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    const updateData = { ...profile };
    if (apiKey) {
      updateData.gemini_api_key = apiKey;
    }

    const { error } = await updateUser({ data: updateData });
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess('Settings updated successfully!');
      if (apiKey) {
        setSavedApiKey(apiKey);
        setApiKey('');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#f8f9fa]">
        <Navbar />
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa]">
      <Navbar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-[#212529] mb-8">Settings</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
              <p className="text-lg text-red-700 font-semibold">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <p className="text-lg text-green-700 font-semibold">{success}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-[#212529]">
              <User className="mr-3 text-[#003366]" /> Profile Information
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">Your Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleProfileChange}
                  className="appearance-none block w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00a8e8] focus:border-[#00a8e8]"
                />
              </div>
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-2">Your Role</label>
                <input
                  type="text"
                  name="role"
                  value={profile.role}
                  onChange={handleProfileChange}
                  className="appearance-none block w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00a8e8] focus:border-[#00a8e8]"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center text-[#212529]">
              <Key className="mr-3 text-[#003366]" /> API Configuration
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              Your API key is stored securely and is only used to connect to your AI provider.
            </p>
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-2">Gemini AI API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={handleApiChange}
                className="appearance-none block w-full px-4 py-3 text-lg border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#00a8e8] focus:border-[#00a8e8]"
                placeholder={savedApiKey ? `••••••••••••${savedApiKey.slice(-4)}` : "Enter your secret API key"}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              className="bg-[#003366] text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-[#0055a4] transition duration-300 flex items-center gap-2 text-lg"
            >
              <Save size={20} /> Save All Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
