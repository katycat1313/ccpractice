module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg|ico)$': '<rootDir>/src/__mocks__/fileMock.js',
    '.*supabaseClient.*': '<rootDir>/src/__mocks__/supabaseClient.js',
    '.*deepgramService.*': '<rootDir>/src/__mocks__/deepgramService.js',
    '.*ColdCalling3DScene.*': '<rootDir>/src/__mocks__/sceneMock.jsx',
    '^@google/genai$': '<rootDir>/src/__mocks__/genaiMock.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.cjs' }],
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.css',
  ],
};
