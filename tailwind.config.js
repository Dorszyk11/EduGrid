/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Tokeny EduGrid (źródło prawdy: CSS vars w globals.css). Dodatkowe nazwy — nie nadpisują palety Tailwind.
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          strong: 'var(--accent-strong)',
          weak: 'var(--accent-weak)',
        },
        navy: {
          DEFAULT: 'var(--navy)',
          2: 'var(--navy-2)',
          line: 'var(--navy-line)',
        },
        ok: { DEFAULT: 'var(--ok)', bg: 'var(--ok-bg)' },
        warn: { DEFAULT: 'var(--warn)', bg: 'var(--warn-bg)' },
        danger: { DEFAULT: 'var(--danger)', bg: 'var(--danger-bg)' },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      // Nowe klucze (bez nadpisywania DEFAULT) — bezpieczne dla niezredesignowanych stron.
      borderRadius: {
        card: 'var(--radius-lg)',
      },
      boxShadow: {
        card: 'var(--shadow)',
        pop: 'var(--shadow-md)',
      },
      transitionTimingFunction: {
        brand: 'var(--ease)',
      },
    },
  },
  plugins: [],
}
