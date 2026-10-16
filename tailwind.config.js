/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17201E', forest: { DEFAULT: '#0F3D3A', 700: '#16524E', 100: '#DCE9E6' },
        sun: { DEFAULT: '#F2B705', 700: '#B88A00', 100: '#FBEFC2' },
        crane: '#C8372D', field: '#F1F3EF', line: '#D5DAD4', mute: '#5B6762',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
