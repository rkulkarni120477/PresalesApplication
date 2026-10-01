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
          'dark-green': '#0B5D3B',
          'deep-green': '#06452D',
          'medium-green': '#148A58',
          'light-green': '#EAF6F0',
          'page-bg': '#F7F9F8',
          'text': '#1F2937',
          'text-secondary': '#6B7280',
          'border': '#DDE5E1',
        }
      }
    },
  },
  plugins: [],
}
