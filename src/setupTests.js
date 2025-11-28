import '@testing-library/jest-dom';

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn(() =>
      Promise.resolve({
        getTracks: jest.fn(() => [{ stop: jest.fn() }]),
        getAudioTracks: jest.fn(() => [{ stop: jest.fn() }]),
      })
    ),
  },
});

// Mock Web Audio API
global.AudioContext = jest.fn(() => ({
  createAnalyser: jest.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn((array) => {
      for (let i = 0; i < array.length; i++) array[i] = 50;
    }),
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
  })),
  close: jest.fn(),
}));

global.webkitAudioContext = global.AudioContext;

// Mock MediaRecorder
global.MediaRecorder = jest.fn(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  state: 'recording',
  ondataavailable: null,
  onstop: null,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock window.requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => {
  setTimeout(cb, 0);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});