/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B7294A',
          dark: '#9a1f3d',
          light: '#d63557',
        }
      }
    },
  },
  plugins: [],
}

