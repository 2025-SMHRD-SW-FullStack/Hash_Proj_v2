/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
       colors: {
        'primary': '#5882F6',
        'sub': '#D29EEA',
        'error': '#ff8787',
        'success': '#10b981',
        'warning': '#f59e0b',
      },
      keyframes: {
        fadeInUp: {
          'from': { 
            opacity: '0',
            transform: 'translateY(20px)' 
          },
          'to': { 
            opacity: '1',
            transform: 'translateY(0)' 
          },
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
}

