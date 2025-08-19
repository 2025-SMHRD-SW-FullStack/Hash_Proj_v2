/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': ''
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

