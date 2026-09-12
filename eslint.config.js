'use strict';

const globals = require('globals');

/* Global variables injected via <script> tags or inline HTML */
const projectGlobals = {
  // Canvas drawing helpers
  roundRect: 'readonly',
  drawSelectionRect: 'readonly',
  Component: 'readonly',
  PIN_TYPE: 'readonly',
  defComp: 'readonly',
  registerComponent: 'readonly',

  // Core simulator objects
  ArduinoSim: 'readonly',
  CircuitCanvas: 'readonly',
  App: 'readonly',
  EditorManager: 'readonly',
  SerialMonitor: 'readonly',
  Oscilloscope: 'readonly',
  Plotter: 'readonly',
  LogicAnalyzer: 'readonly',
  Output: 'readonly',
  StorageManager: 'readonly',
  RemoteControl: 'readonly',
  ElectricalEngine: 'readonly',
  QRCode: 'readonly',

  // Component helpers
  getInstPinState: 'readonly',
  getInstPinPWM: 'readonly',
  resistorBands: 'readonly',
  formatResistance: 'readonly',
  hexToRgba: 'readonly',
  escapeHtml: 'readonly',
  sensorValue: 'readonly',

  // Simulator constants
  HIGH: 'readonly',
  LOW: 'readonly',

  // DSP / oscilloscope
  DSP: 'readonly',
  getNetResistance: 'readonly',

  // Monaco editor
  monaco: 'readonly',
  require: 'readonly',
};

module.exports = [
  /* ── Browser scripts (main app, components, libraries) ── */
  {
    files: ['js/**/*.js'],
    ignores: ['js/lib/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.worker,
        ...projectGlobals,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(sw|sh|posX|posY|vdivX|vdivY|pathR|totalTime|refTotalTime|panelX|brightness|PROBE_CHANNEL_LABELS|COMPONENT_DEFS|getNetResistance)$' }],
      'no-undef': 'error',
      'no-redeclare': 'off',
      'eqeqeq': ['warn', 'smart'],
      'no-constant-condition': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-extra-semi': 'error',
      'no-unreachable': 'error',
    },
  },

  /* ── ES module files ── */
  {
    files: ['js/safetyChecker.js', 'js/sharing.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...projectGlobals,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-redeclare': 'off',
      'eqeqeq': ['warn', 'smart'],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  /* ── Node.js backend & scripts ── */
  {
    files: ['server.js', 'scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^(app|stmtAll|EXAMPLE_CIRCUITS|sandbox|sketchesStart)$' }],
      'no-undef': 'error',
      'no-redeclare': 'off',
      'eqeqeq': ['warn', 'smart'],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  /* ── Test files ── */
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.mocha,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },

  /* ── Global ignores ── */
  {
    ignores: [
      'node_modules/**',
      '*.json',
      'sw.js',
      'js/lib/**',
      'js/dso-fullscreen.js',
    ],
  },
];
