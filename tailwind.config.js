/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          100: '#d1e0ff',
          200: '#a4c2ff',
          300: '#76a3ff',
          400: '#4985ff',
          500: '#1c67ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
        },
        accent: {
          100: '#fff1d1',
          200: '#ffe4a3',
          300: '#ffd675',
          400: '#ffc947',
          500: '#ff9f19',
          600: '#cc7f14',
          700: '#995f0f',
          800: '#66400a',
          900: '#332005',
        },
        background: {
          dark: '#0a0a0c',
          card: '#13131a',
          input: '#121218',
        },
      },
      fontFamily: {
        logo: ['MuseoModerno', 'cursive'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease forwards',
      },
    },
  },
  plugins: [],
};