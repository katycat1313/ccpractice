import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './index.css';
import 'reactflow/dist/style.css';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, PUBLIC_ROUTES } from './config/constants';

import LoginPage from './pages/LoginPage';
import CreateAccountPage from './pages/CreateAccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ScriptBuilderPage from './pages/ScriptBuilderPage';
import PracticePage from './pages/PracticePageSimple';
import FeedbackPage from './pages/FeedbackPage';
import SavedScriptsPage from './pages/SavedScriptsPage';
import SettingsPage from './pages/SettingsPage';

// Helper function to handle auth-based navigation
const handleAuthNavigation = (session, currentPath, navigate) => {
  const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);

  if (session && isPublicRoute) {
    navigate(ROUTES.DASHBOARD);
  } else if (!session && !isPublicRoute) {
    navigate(ROUTES.LOGIN);
  }
};

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
      handleAuthNavigation(session, location.pathname, navigate);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      handleAuthNavigation(session, location.pathname, navigate);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  return (
    <Routes>
      {!session ? (
        <>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={ROUTES.CREATE_ACCOUNT} element={<CreateAccountPage />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
          <Route path="*" element={<LoginPage />} />
        </>
      ) : (
        <>
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage setScript={setScript} />} />
          <Route path={ROUTES.SCRIPT_BUILDER} element={<ScriptBuilderPage script={script} setScript={setScript} />} />
          <Route path={ROUTES.PRACTICE} element={<PracticePage onClose={() => navigate(ROUTES.DASHBOARD)} />} />
          <Route path={ROUTES.FEEDBACK} element={<FeedbackPage feedback={feedback} transcript={transcript} script={script} />} />
          <Route path={ROUTES.SAVED_SCRIPTS} element={<SavedScriptsPage setScript={setScript} />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage setScript={setScript} />} />
        </>
      )}
    </Routes>
  );
}
