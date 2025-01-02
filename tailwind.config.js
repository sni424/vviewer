/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gray010: '#f1f1f1',
        gray080: '#3A3A3C',
      },
    },
  },
  plugins: [],
};
