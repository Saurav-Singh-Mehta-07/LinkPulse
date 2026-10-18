import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'frontend/dist/**', '.vite/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['frontend/**/*.jsx'],
    plugins: { react },
    rules: {
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',
    },
  },
]
