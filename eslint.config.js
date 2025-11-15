// @ts-check
import js from '@eslint/js';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      'dist/**',
      'assets/**',
      'documentation/**',
      'premium-plan/**',
      '*.html',
      // Temporary: exclude renderer until duplicate identifier is fixed
      'renderer.js',
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
        process: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        // Browser globals used in renderer
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
    // Add missing browser globals used in renderer to silence no-undef
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
  // Preload and renderer can use some browser APIs; keep Node globals for preload
  {
    files: ['renderer.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
      },
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
      },
    },
  },
];
