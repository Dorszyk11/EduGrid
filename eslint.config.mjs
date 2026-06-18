// Flat config (ESLint 9+). Migracja z .eslintrc.json (next/core-web-vitals).
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'dist/**',
      '**/*.config.js',
      'payload.config.ts',
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'warn',
      // Nowe reguły z eslint-config-next 16 (eslint-plugin-react-hooks v6,
      // React Compiler readiness). Strzelają w istniejące, działające wzorce
      // (setState w efektach ładujących dane itp.) — to osobny wymiar
      // code-quality, nie część upgrade'u toolingu. Na warn (widoczny dług,
      // gate nie blokuje); do domknięcia w dedykowanym przejściu.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
];
