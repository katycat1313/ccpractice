import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './index.css';
import 'reactflow/dist/style.css';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

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
  const [script, setScript] = useState(null);
  const [session, setSession] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [transcript, setTranscript] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && (location.pathname === '/login' || location.pathname === '/create-account' || location.pathname === '/forgot-password')) {
        navigate('/dashboard');
      } else if (!session && location.pathname !== '/login' && location.pathname !== '/create-account' && location.pathname !== '/forgot-password') {
        navigate('/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session && (location.pathname === '/login' || location.pathname === '/create-account' || location.pathname === '/forgot-password')) {
        navigate('/dashboard');
      } else if (!session && location.pathname !== '/login' && location.pathname !== '/create-account' && location.pathname !== '/forgot-password') {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return (
    <Routes>
      {!session ? (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<LoginPage />} />
        </>
      ) : (
        <>
          <Route path="/dashboard" element={<DashboardPage setScript={setScript} />} />
          <Route path="/script-builder" element={<ScriptBuilderPage script={script} setScript={setScript} />} />
          <Route path="/practice" element={<PracticePage script={script} setScript={setScript} setFeedback={setFeedback} setTranscript={setTranscript} />} />
          <Route path="/feedback" element={<FeedbackPage feedback={feedback} transcript={transcript} script={script} />} />
          <Route path="/saved-scripts" element={<SavedScriptsPage setScript={setScript} />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage setScript={setScript} />} />
        </>
      )}
    </Routes>
  );
}
