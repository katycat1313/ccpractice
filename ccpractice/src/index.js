import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';
import './index.css'; // We'll need a basic CSS file.

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);