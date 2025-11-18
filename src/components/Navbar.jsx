import React from 'react';
import { Settings, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';

export default function Navbar() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    } else {
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white shadow-md p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link to="/dashboard" title="Go to Dashboard">
          <h1 className="text-3xl font-extrabold text-[#003366]">ScriptMaster</h1>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-lg font-semibold text-gray-600 hover:text-[#0055a4]">Dashboard</Link>
          <Link to="/saved-scripts" className="text-lg font-semibold text-gray-600 hover:text-[#0055a4]">Saved Scripts</Link>
          <Link to="/settings"
            className="p-2 rounded-full hover:bg-gray-200 transition duration-300"
            title="Settings"
            aria-label="Open settings"
          >
            <Settings size={24} className="text-gray-700" />
          </Link>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-full hover:bg-gray-200 transition duration-300"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut size={24} className="text-gray-700" />
          </button>
        </div>
      </div>
    </nav>
  );
}
