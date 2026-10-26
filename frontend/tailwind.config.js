/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // PULSE brand: a deep teal, used for primary actions and the active nav item.
        brand: {
          50: '#effaf8',
          100: '#d6f2ed',
          200: '#ade4da',
          300: '#79cfc1',
          400: '#45b3a3',
          500: '#2a9787',
          600: '#1f796d',
          700: '#1c6159',
          800: '#1a4e48',
          900: '#18413d',
        },
        // Ink: a slightly warm slate for text, borders and surfaces.
        ink: {
          50: '#f7f7f6',
          100: '#eeeeec',
          200: '#dcdcd8',
          300: '#bdbcb6',
          400: '#93918a',
          500: '#6f6d66',
          600: '#57554f',
          700: '#45443f',
          800: '#2f2e2b',
          900: '#1d1c1a',
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
