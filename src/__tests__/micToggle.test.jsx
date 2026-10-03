import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CoachPage from '../pages/CoachPage';

// Setup mocks
beforeEach(() => {
  localStorage.clear();
  window.speechSynthesis = {
    getVoices: () => [],
    cancel: jest.fn(),
    speak: jest.fn(),
    resume: jest.fn()
  };

  // Mock AudioContext with resume
  const mockResume = jest.fn().mockResolvedValue();
  window.AudioContext = jest.fn(() => ({
    resume: mockResume,
    state: 'suspended',
    createAnalyser: jest.fn(() => ({
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn()
    })),
    createMediaStreamSource: jest.fn(() => ({
      connect: jest.fn()
    })),
    createScriptProcessor: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn()
    })),
    destination: {}
  }));
  window.webkitAudioContext = window.AudioContext;

  // Mock SpeechRecognition
  window.SpeechRecognition = jest.fn(() => ({
    continuous: true,
    interimResults: false,
    lang: 'en-US',
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn()
  }));
  window.webkitSpeechRecognition = window.SpeechRecognition;

  // Mock navigator.mediaDevices.getUserMedia
  const mockTrack = { stop: jest.fn() };
  const mockStream = {
    getTracks: () => [mockTrack],
    getAudioTracks: () => [mockTrack],
    active: true
  };
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: jest.fn().mockResolvedValue(mockStream)
    }
  });
});

describe('Mic Toggle Component Tests', () => {
  test('renders with [Mic: OFF] initially and toggles to [Mic: ON] on click', async () => {
    render(
      <BrowserRouter>
        <CoachPage />
      </BrowserRouter>
    );

    // Initial state: Mic: OFF
    const micButton = screen.getByRole('button', { name: /Mic: OFF/i });
    expect(micButton).toBeInTheDocument();
    expect(micButton.textContent).toContain('Mic: OFF');

    // Click toggle
    fireEvent.click(micButton);

    // Resolves getUserMedia and updates immediately to Mic: ON
    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mic: ON/i })).toBeInTheDocument();
    });

    // Clicking again turns it back to Mic: OFF
    const onButton = screen.getByRole('button', { name: /Mic: ON/i });
    fireEvent.click(onButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mic: OFF/i })).toBeInTheDocument();
    });
  });

  test('awaits AudioContext.resume() on mic click', async () => {
    render(
      <BrowserRouter>
        <CoachPage />
      </BrowserRouter>
    );

    const micButton = screen.getByRole('button', { name: /Mic: OFF/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(window.AudioContext).toHaveBeenCalled();
    });
  });

  test('keeps mic state ON and falls back to SpeechRecognition when Deepgram Agent ID is missing', async () => {
    localStorage.removeItem('deepgram_agent_id');
    localStorage.removeItem('scriptmaster_user');

    render(
      <BrowserRouter>
        <CoachPage />
      </BrowserRouter>
    );

    const micButton = screen.getByRole('button', { name: /Mic: OFF/i });
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mic: ON/i })).toBeInTheDocument();
    });

    // SpeechRecognition fallback started
    expect(window.SpeechRecognition).toHaveBeenCalled();
  });

  test('displays error alert banner with exact error message when getUserMedia fails', async () => {
    const errorText = 'Permission to access microphone denied by user.';
    navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(new Error(errorText));

    render(
      <BrowserRouter>
        <CoachPage />
      </BrowserRouter>
    );

    const micButton = screen.getByRole('button', { name: /Mic: OFF/i });
    fireEvent.click(micButton);

    // Banner with role="alert" displays exact error message
    const alertBanner = await screen.findByRole('alert');
    expect(alertBanner).toBeInTheDocument();
    expect(alertBanner.textContent).toContain(errorText);

    // Mic remains OFF
    expect(screen.getByRole('button', { name: /Mic: OFF/i })).toBeInTheDocument();
  });
});
