/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B0C',
        panel: '#141416',
        line: '#232326',
        mute: '#8A8A90',
        acid: '#D6FF3F',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      keyframes: {
        pop: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        blink: {
          '0%, 60%, 100%': { opacity: '.25' },
          '30%': { opacity: '1' },
        },
      },
      animation: {
        pop: 'pop .22s ease-out both',
        blink: 'blink 1.1s infinite',
      },
    },
  },
  plugins: [],
}
