import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './index.css';

import LoginPage from './pages/LoginPage';
import CreateAccountPage from './pages/CreateAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ScriptBuilderPage from './pages/ScriptBuilderPage';
import PracticePage from './pages/PracticePage';
import FeedbackPage from './pages/FeedbackPage';
import SavedScriptsPage from './pages/SavedScriptsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const [page, setPage] = useState('login');
  const [activeScript, setActiveScript] = useState(null);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setPage('dashboard');
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && page !== 'dashboard') {
        setPage('dashboard');
      } else if (!session && page !== 'login') {
        setPage('login');
      }
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, [page]); // Re-run effect if page changes to handle navigation correctly

  const renderPage = () => {
    // If there's no session, only show login/signup pages
    if (!session) {
      switch (page) {
        case 'login':
          return <LoginPage setPage={setPage} />;
        case 'create-account':
          return <CreateAccountPage setPage={setPage} />;
        case 'forgot-password':
          return <ForgotPasswordPage setPage={setPage} />;
        default:
          return <LoginPage setPage={setPage} />;
      }
    }

    // If there is a session, show the authenticated pages
    switch (page) {
      case 'dashboard':
        return <DashboardPage setPage={setPage} setActiveScript={setActiveScript} />;
      case 'script-builder':
        return <ScriptBuilderPage setPage={setPage} activeScript={activeScript} setActiveScript={setActiveScript} />;
      case 'practice':
        return <PracticePage setPage={setPage} activeScript={activeScript} setActiveScript={setActiveScript} />;
      case 'feedback':
        return <FeedbackPage setPage={setPage} />;
      case 'saved-scripts':
        return <SavedScriptsPage setPage={setPage} setActiveScript={setActiveScript} />;
      case 'settings':
        return <SettingsPage setPage={setPage} />;
      default:
        return <DashboardPage setPage={setPage} setActiveScript={setActiveScript} />; // Default to dashboard when logged in
    }
  };

  return (
    <div>
      {renderPage()}
    </div>
  );
}
