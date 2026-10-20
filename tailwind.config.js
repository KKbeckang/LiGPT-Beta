/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './video.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070B',
          900: '#0A0D14',
          800: '#10151F',
          700: '#19202D',
          600: '#283143',
          500: '#465269',
          400: '#7A859A',
          300: '#A2ACBE',
          200: '#C9D0DC',
          100: '#E8ECF3',
        },
        kg: { DEFAULT: '#2DD4BF', soft: '#7EE8D8', deep: '#0F766E' },
        llm: { DEFAULT: '#A78BFA', soft: '#CDBEFE', deep: '#6D28D9' },
        salt: '#FBBF24',
        solvent: '#38BDF8',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};
