/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-edu-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-edu-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        edu: {
          bg: '#eef1f6',
          'bg-subtle': '#e6eaf2',
          surface: '#ffffff',
          ink: '#141823',
          muted: '#5a6270',
          subtle: '#8b93a4',
          border: '#d1d9e6',
          'border-strong': '#b8c4d6',
          navy: '#102a43',
          'navy-soft': '#1c3d5c',
          'navy-muted': '#2a4d6e',
          accent: '#2f6fad',
          'accent-hover': '#285f96',
          'accent-muted': '#6b93c4',
          danger: '#b42318',
          'danger-soft': '#fdf2f1',
          warning: '#a15c07',
          'warning-soft': '#fff8eb',
          success: '#0d5f4c',
          'success-soft': '#ecf8f4',
        },
      },
      boxShadow: {
        edu: '0 4px 24px rgba(16, 38, 67, 0.07)',
        'edu-sm': '0 1px 3px rgba(16, 38, 67, 0.06)',
        'edu-inner': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      keyframes: {
        'edu-spin': {
          to: { transform: 'rotate(360deg)' },
        },
        'edu-enter': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'edu-spin': 'edu-spin 0.75s linear infinite',
        'edu-enter': 'edu-enter 0.38s cubic-bezier(0.23, 1, 0.32, 1) forwards',
      },
      transitionTimingFunction: {
        'edu-out': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
};
