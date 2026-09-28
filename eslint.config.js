import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import { fixupConfigRules } from '@eslint/compat';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '.backup/**',
      'untitled folder/**',
      'apps/**',
      'ccpractice/**',
      'jest.config.js',
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': 'off',
    },
  },
  pluginJs.configs.recommended,
  ...fixupConfigRules(pluginReactConfig),
  {
    files: ['src/__tests__/**', 'src/setupTests.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['scripts/**/*.js', '*.cjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];

