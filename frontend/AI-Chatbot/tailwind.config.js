/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 60px -12px rgba(45, 212, 191, 0.35)',
        'glow-rose': '0 0 50px -10px rgba(244, 63, 94, 0.35)',
      },
    },
  },
  plugins: [],
};
