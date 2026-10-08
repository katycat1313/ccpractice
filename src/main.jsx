import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import "@fontsource/opendyslexic";

// Chrome treats 0.0.0.0 as an insecure origin for microphone capture. Keep
// local development on localhost so getUserMedia and audio playback work
// consistently after refreshes.
if (window.location.hostname === '0.0.0.0') {
  window.location.replace(`http://localhost:${window.location.port || '3000'}${window.location.pathname}${window.location.search}${window.location.hash}`);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
