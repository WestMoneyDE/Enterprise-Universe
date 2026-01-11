/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./frontend/**/*.html",
    "./frontend/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        'bau-primary': '#00c853',
        'bau-secondary': '#ff6d00',
        'bau-accent': '#00b0ff',
        'bau-dark': '#0a1628',
        'bau-surface': '#112240'
      }
    },
  },
  plugins: [],
}
