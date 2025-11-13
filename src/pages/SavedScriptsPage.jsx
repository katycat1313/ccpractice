import React from 'react';

export default function SavedScriptsPage({ setPage }) {
  return (
    <div>
      <h1>Saved Scripts Page</h1>
      <button onClick={() => setPage('dashboard')}>Back to Dashboard</button>
    </div>
  );
}