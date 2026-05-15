/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#06B6D4',
        'primary-dark': '#0891B2',
        bg: {
          primary: '#121414',
          secondary: '#1a1d1f',
          elevated: '#22262a',
        },
        ink: {
          primary: '#e3e2e2',
          secondary: '#a8acb0',
          muted: '#6b7280',
        },
        brand: {
          cyan: '#06b6d4',
          'cyan-dark': '#0891b2',
          violet: '#a78bfa',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'DM Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(6, 182, 212, 0.2)',
        'glow-lg': '0 0 48px rgba(6, 182, 212, 0.3)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delay': 'float 8s ease-in-out 2s infinite',
        'float-slow': 'float 10s ease-in-out 1s infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'fade-in-up': 'fadeInUp 0.5s ease forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
