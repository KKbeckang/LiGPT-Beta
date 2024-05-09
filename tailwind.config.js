/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        black: "#202123",
        lightBlack: "#343541",
      },
      ringWidth: {
        '0.5': '0.5px'
      }
    },
  },
  plugins: [
    require("tailwind-scrollbar-hide")
  ],
}
