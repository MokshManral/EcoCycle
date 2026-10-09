/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#17382B', 700: '#1F4A39', 900: '#0F261D' },
        moss: { DEFAULT: '#2F6B4F', 600: '#3B7F5F' },
        sage: { DEFAULT: '#E6EEE3', 200: '#D3E2CE', 50: '#F1F6EF' },
        paper: '#FAF8F3',
        ink: '#1F2421',
        muted: '#5B665F',
        line: '#DCE2D7',
        amber: { soft: '#FBF1DC', DEFAULT: '#8A5A00' },
        clay: { soft: '#F8E5E0', DEFAULT: '#A53A24' },
        sky: { soft: '#E3EEF6', DEFAULT: '#1F5578' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(23,56,43,0.06), 0 4px 16px rgba(23,56,43,0.04)' },
    },
  },
  plugins: [],
};
