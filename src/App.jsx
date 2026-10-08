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
import PracticePage from './pages/PracticePage';
import FeedbackPage from './pages/FeedbackPage';
import SavedScriptsPage from './pages/SavedScriptsPage';
import SettingsPage from './pages/SettingsPage';
import CoachPage from './pages/CoachPage';
import ProgressPage from './pages/ProgressPage';
import RebuttalsPage from './pages/RebuttalsPage';
import RecordingsPage from './pages/RecordingsPage';
import WorkshopsPage from './pages/WorkshopsPage';

const getInitialSession = () => {
  if (typeof window === 'undefined') return null;
  try {
    let localUser = JSON.parse(localStorage.getItem('scriptmaster_user') || 'null');
    if (!localUser) {
      localUser = {
        id: `usr-${Date.now()}`,
        name: 'Sales Rep',
        email: 'closer@scriptmaster.app',
        role: 'Sales Representative',
        created_at: new Date().toISOString()
      };
      localStorage.setItem('scriptmaster_user', JSON.stringify(localUser));
    }
    return { user: localUser };
  } catch {
    return null;
  }
};

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
  const [transcript, setTranscript] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [session, setSession] = useState(() => getInitialSession());
  const [isCoachOpen, setIsCoachOpen] = useState(true);
  
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

  // Coach starts open on the Dashboard, then follows the user as a compact
  // bubble when they navigate into another learning area.
  useEffect(() => {
    const isDashboard = location.pathname === '/' || location.pathname === ROUTES.DASHBOARD || location.pathname === '/overview';
    setIsCoachOpen(isDashboard);
  }, [location.pathname]);

  useEffect(() => {
    const openCoach = () => setIsCoachOpen(true);
    window.addEventListener('scriptmaster_open_coach', openCoach);
    return () => window.removeEventListener('scriptmaster_open_coach', openCoach);
  }, []);

  return (
    <>
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
          {/* Dashboard is the home screen, with Coach guiding the next step. */}
          <Route path="/" element={<DashboardPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path={ROUTES.DASHBOARD} element={<DashboardPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path="/overview" element={<DashboardPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path={ROUTES.PRACTICE} element={<PracticePage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path={ROUTES.COACH} element={<CoachPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path={ROUTES.SCRIPT_BUILDER} element={<ScriptBuilderPage script={script} setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path="/scripts" element={<SavedScriptsPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path="/recordings" element={<RecordingsPage />} />
          <Route path={ROUTES.FEEDBACK} element={<FeedbackPage feedback={feedback} transcript={transcript} script={script} />} />
          <Route path={ROUTES.SAVED_SCRIPTS} element={<SavedScriptsPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/rebuttals" element={<RebuttalsPage />} />
          <Route path="/workshops" element={<WorkshopsPage />} />
          <Route path="/workshop" element={<WorkshopsPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage setScript={setScript} setPracticeSettings={setPracticeSettings} />} />
        </>
      )}
    </Routes>
    {session && (
      <>
        {!isCoachOpen && location.pathname !== ROUTES.COACH && (
          <button
            type="button"
            onClick={() => setIsCoachOpen(true)}
            className="fixed bottom-5 right-5 z-[90] rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-3 shadow-2xl shadow-indigo-900/40 border border-indigo-400/40 font-bold text-sm transition"
            aria-label="Open Coach"
          >
            Coach
          </button>
        )}
        {location.pathname !== ROUTES.COACH && (
          <div className={`${isCoachOpen ? 'fixed' : 'hidden'} inset-y-0 right-0 z-[85] w-full sm:w-[min(720px,92vw)] bg-slate-950/95 border-l border-indigo-500/40 shadow-2xl`}>
            <div className="relative h-full overflow-y-auto">
              <button
                type="button"
                onClick={() => setIsCoachOpen(false)}
                className="absolute right-4 top-4 z-10 px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
              >
                Close Coach
              </button>
              <CoachPage setScript={setScript} embedded active={isCoachOpen} />
            </div>
          </div>
        )}
      </>
    )}
    </>
  );
}
