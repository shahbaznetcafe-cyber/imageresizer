/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        punjab: {
          blue: {
            light: '#3b82f6',
            DEFAULT: '#1e3a8a', // Deep Education Blue
            dark: '#172554',
          },
          green: {
            light: '#10b981',
            DEFAULT: '#059669', // Punjab Official Green
            dark: '#064e3b',
          }
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
