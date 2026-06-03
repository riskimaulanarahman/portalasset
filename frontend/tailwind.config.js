/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#ecfdfd',
          100: '#d1f8f8',
          200: '#a7f0f0',
          300: '#6de2e2',
          400: '#30cccc',
          500: '#14b1b1',
          600: '#0d8d8d',
          700: '#0d7171',
          800: '#0d4d4d',
          900: '#062c2c',
          950: '#031919',
        },
        wood: {
          light:   '#e1c182',
          primary: '#c5a059',
          dark:    '#a17e42',
        },
        surface: {
          DEFAULT: '#f8faf9',
          dark:    '#0f1a1a',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease both',
        'slide-left': 'slideInLeft 0.3s ease both',
        'scale-in':   'scaleIn 0.25s ease both',
        'shimmer':    'shimmer 1.5s infinite',
        'toast-in':   'toast-in 0.35s cubic-bezier(0.21,1.02,0.73,1) both',
        'toast-out':  'toast-out 0.4s ease forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'card':  '0 1px 4px rgba(13,77,77,0.06), 0 4px 16px rgba(13,77,77,0.04)',
        'card-hover': '0 4px 16px rgba(13,77,77,0.10), 0 12px 32px rgba(13,77,77,0.06)',
      },
    },
  },
  plugins: [],
}
