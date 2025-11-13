import React, { useState } from 'react';
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
  const [activeScript, setActiveScript] = useState(null); // Unified state for the current script

  const renderPage = () => {
    switch (page) {
      case 'login':
        return <LoginPage setPage={setPage} />;
      case 'create-account':
        return <CreateAccountPage setPage={setPage} />;
      case 'forgot-password':
        return <ForgotPasswordPage setPage={setPage} />;
      case 'dashboard':
        return <DashboardPage setPage={setPage} setActiveScript={setActiveScript} />;
      case 'script-builder':
        return <ScriptBuilderPage setPage={setPage} activeScript={activeScript} setActiveScript={setActiveScript} />;
      case 'practice':
        return <PracticePage setPage={setPage} activeScript={activeScript} setActiveScript={setActiveScript} />;
      case 'feedback':
        return <FeedbackPage setPage={setPage} />;
      case 'saved-scripts':
        return <SavedScriptsPage setPage={setPage} />;
      case 'settings':
        return <SettingsPage setPage={setPage} />;
      default:
        return <LoginPage setPage={setPage} />;
    }
  };

  return (
    <div>
      {renderPage()}
    </div>
  );
}
