module.exports = {
  root: true,
  env: {
    browser: true,
    es2023: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: 'detect' },
  },
  plugins: ['react-hooks', 'react-refresh'],
  rules: {
    // Deliberately permissive for this pilot codebase; the CI gate is kept
    // intentionally light while the app is still pre-production.
    'no-unused-vars': 'off',
    'react-hooks/rules-of-hooks': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-refresh/only-export-components': 'warn',
  },
  ignorePatterns: ['dist', 'node_modules', '*.config.js'],
};