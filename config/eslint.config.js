'use strict';

const js = require('@eslint/js');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: [
      'dist/**',
      'assets/**',
      'documentation/**',
      'premium-plan/**',
      '*.html',
      'eslint.config.js',
      'npm-audit*.json',
      'Squailor.code-workspace'
    ],
  },
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        // Node/Electron globals
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        // Browser globals used in renderer
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        URL: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        requestAnimationFrame: 'readonly',
        Blob: 'readonly',
        CustomEvent: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-console': 'off',
      'no-control-regex': 'off', // allow binary buffers regex when needed
    },
  },
  // Jest tests
  {
    files: ['__tests__/**/*.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
        it: 'readonly',
      },
    },
  },
  // Renderer files
  {
    files: ['src/renderer/**/*.js'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        requestAnimationFrame: 'readonly',
        CustomEvent: 'readonly',
      },
    },
  },
];
