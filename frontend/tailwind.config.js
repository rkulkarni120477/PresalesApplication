/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'presales': {
          'dark-green': '#2D66E8',
          'deep-green': '#1E4FC7',
          'medium-green': '#4C8BF5',
          'light-green': '#EAF2FF',
          'page-bg': '#F4F7FC',
          'text': '#1F2937',
          'text-secondary': '#66758D',
          'border': '#DFE7F3',
        }
      }
    },
  },
  plugins: [],
}
