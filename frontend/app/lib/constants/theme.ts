export const VERTRA_THEME = {
  // Main colors
  background: '#0a0a0c',
  surfacePrimary: '#12121a',
  surfaceSecondary: '#1a1a24',

  // Gradient accents
  accentStart: '#1dd4f6', // Cyan
  accentEnd: '#8ecfbe', // Teal

  // Semantic
  text: '#e8e8f0',
  textDim: '#8a8a9e',
  border: '#2a2a3e',
  error: '#ff6b6b',
  success: '#51cf66',
  warning: '#ffd43b',

  // Component-specific
  button: {
    hover: 'rgba(29, 212, 246, 0.1)',
    active: 'rgba(29, 212, 246, 0.2)',
  },
  sidebar: {
    width: 280,
    minWidth: 200,
  },
  inspector: {
    width: 320,
    minWidth: 250,
  },
  bottomPanel: {
    height: 180,
    minHeight: 100,
  },
};

export const GRID_PRESETS = {
  small: 0.5,
  medium: 1.0,
  large: 2.0,
  custom: 1.0,
};

export const SHORTCUT_KEYS = {
  translate: 'g',
  rotate: 'r',
  scale: 's',
  delete: 'Delete',
  duplicate: 'Shift+D',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Shift+Z',
  save: 'Ctrl+S',
  export: 'Ctrl+E',
  selectAll: 'Ctrl+A',
  deselect: 'Escape',
};
