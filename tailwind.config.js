/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    fontFamily: {
      sans: ['ui-sans-serif', 'system-ui'],
      'space-mono': ['Space Mono', 'ui-sans-serif', 'system-ui'],
      roboto: ['Roboto', 'ui-sans-serif', 'system-ui'],
    },
    extend: {
      colors: {
        'charcoal-100': '#bfbfbf',
        'charcoal-200': '#727272',
        'charcoal-300': '#3a3a3a',
        'charcoal-400': '#2e3135',
        'charcoal-500': '#1f1f1f',
        'charcoal-600': '#191919',
        'charcoal-700': '#171717',
        'charcoal-800': '#111113',

        'light-yellow': '#ffc53d',
        'light-orange': '#ff8a30 ',
        'light-blue': '#70b8ff',
        'light-green': '#3ddb8f',
        'light-purple': '#c96cff',

        'dark-yellow': '#362b00',
        'dark-orange': '#331e10',
        'dark-blue': '#0d2849',
        'dark-green': '#132d23',
        'dark-purple': '#2b132d',
      },
    },
  },
  plugins: [],
};
