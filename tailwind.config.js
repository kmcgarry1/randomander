/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Google Sans Flex"', 'Roboto', 'system-ui', 'sans-serif'],
        body: ['"Google Sans Flex"', 'Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
