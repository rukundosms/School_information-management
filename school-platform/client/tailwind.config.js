/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        school: {
          DEFAULT: 'rgb(8, 58, 8)',
          dark: 'rgb(5, 40, 5)',
          bright: '#4caf50',
        },
      },
    },
  },
  plugins: [],
};
