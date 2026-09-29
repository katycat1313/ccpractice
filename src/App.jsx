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
import CoachPage from './pages/CoachPage';
import ProgressPage from './pages/ProgressPage';
import RebuttalsPage from './pages/RebuttalsPage';

const handleAuthNavigation = (session, currentPath, navigate) => {
  const isPublicRoute = PUBLIC_ROUTES.includes(currentPath);
  if (session && isPublicRoute) {
    navigate(ROUTES.COACH);
  } else if (!session && !isPublicRoute) {
    navigate(ROUTES.LOGIN);
  }
};

export default function App() {
  const [script, setScript] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [session, setSession] = useState(null);
  
  // NEW: Practice session state
  const [practiceSettings, setPracticeSettings] = useState({
    prospect: null,
    difficulty: null
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkSession = async () => {
      // Check if URL hash has access_token from Supabase
      if (window.location.hash.includes('access_token')) {
        try {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          if (accessToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || ''
            });
          }
        } catch (_) {}
      }

      const { data: { session: remoteSession } } = await supabase.auth.getSession();
      let localUser = JSON.parse(localStorage.getItem('scriptmaster_user') || 'null');
      
      // Auto-provision default guest closer profile if not already set,
      // so opening the app immediately greets the user with the Human Avatar Coach
      if (!localUser && !remoteSession) {
        localUser = {
          id: `usr-${Date.now()}`,
          name: 'Sales Rep',
          email: 'closer@scriptmaster.app',
          role: 'Sales Representative',
          created_at: new Date().toISOString()
        };
        localStorage.setItem('scriptmaster_user', JSON.stringify(localUser));
      }

      const effectiveSession = remoteSession || (localUser ? { user: localUser } : null);
      setSession(effectiveSession);
      handleAuthNavigation(effectiveSession, location.pathname, navigate);
    };

    checkSession();

    const handleAuthEvent = () => {
      checkSession();
    };

    window.addEventListener('scriptmaster_auth_changed', handleAuthEvent);
    window.addEventListener('storage', handleAuthEvent);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const localUser = JSON.parse(localStorage.getItem('scriptmaster_user') || 'null');
      const effectiveSession = session || (localUser ? { user: localUser } : null);
      setSession(effectiveSession);
      handleAuthNavigation(effectiveSession, location.pathname, navigate);
    });

    return () => {
      window.removeEventListener('scriptmaster_auth_changed', handleAuthEvent);
      window.removeEventListener('storage', handleAuthEvent);
      subscription.unsubscribe();
    };
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
          <Route path="/" element={<CoachPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path={ROUTES.DASHBOARD} element={<CoachPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path={ROUTES.COACH} element={<CoachPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path="/overview" element={<DashboardPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path={ROUTES.SCRIPT_BUILDER} element={<ScriptBuilderPage script={script} setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route 
            path={ROUTES.PRACTICE} 
            element={
              <PracticePage 
                onClose={() => navigate(ROUTES.COACH)} 
                prospect={practiceSettings.prospect}
                difficulty={practiceSettings.difficulty}
                callStage={practiceSettings.callStage}
                callStrategy={practiceSettings.callStrategy}
                script={script}
                setFeedback={setFeedback}
                setTranscript={setTranscript}
              />
            } 
          />
          <Route path={ROUTES.FEEDBACK} element={<FeedbackPage feedback={feedback} transcript={transcript} script={script} />} />
          <Route path={ROUTES.SAVED_SCRIPTS} element={<SavedScriptsPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/rebuttals" element={<RebuttalsPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path="*" element={<CoachPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
        </>
      )}
    </Routes>
  );
}
