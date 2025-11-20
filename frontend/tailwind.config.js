/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        turquoise: '#40E0D0',
        navy: '#0A1D37',
        pagebg: '#ffffff'
      },
      fontFamily: {
        sans: ['Vazirmatn', 'Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
