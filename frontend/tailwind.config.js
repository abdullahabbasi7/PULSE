/** @type {import('tailwindcss').Config} */
// PULSE theme — taken from Multani blue pottery: porcelain white, cobalt glaze,
// kashi turquoise and a little saffron. Class names stay the same (brand-*, ink-*),
// so every module picks up the theme automatically.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cobalt: primary actions, active navigation, links.
        brand: {
          50: '#eff3ff',
          100: '#dfe7ff',
          200: '#c1cffd',
          300: '#97adf8',
          400: '#6a85ef',
          500: '#4763e3',
          600: '#3048c9',
          700: '#2639a6',
          800: '#223286',
          900: '#1f2c69',
          950: '#141b42',
        },
        // Kashi turquoise: success, "live" states, secondary accents.
        kashi: {
          50: '#ecfbfa',
          100: '#cff4f2',
          200: '#a3e8e5',
          300: '#69d4d2',
          400: '#33b8b8',
          500: '#199c9e',
          600: '#147d81',
          700: '#156468',
          800: '#165055',
          900: '#164347',
        },
        // Saffron: things that need attention.
        saffron: {
          50: '#fff8eb',
          100: '#feebc7',
          200: '#fdd58a',
          300: '#fbba4d',
          400: '#f6a127',
          500: '#e7840f',
          600: '#c9620a',
          700: '#a6450d',
          800: '#873712',
          900: '#6f2e12',
        },
        // Ink: a cool indigo-grey for text, borders and the porcelain background.
        ink: {
          50: '#f6f7fb',
          100: '#eceef6',
          200: '#dde1ee',
          300: '#c3c8dc',
          400: '#9096b3',
          500: '#6b7192',
          600: '#525875',
          700: '#3f445e',
          800: '#2a2e45',
          900: '#171c34',
        },
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['Marcellus', 'Georgia', '"Times New Roman"', 'serif'],
      },
      borderRadius: {
        panel: '1.25rem',
      },
      boxShadow: {
        // Soft cobalt-tinted shadows instead of grey ones.
        glaze: '0 1px 2px rgba(23, 28, 52, 0.04), 0 4px 16px -6px rgba(38, 57, 166, 0.10)',
        lift: '0 2px 4px rgba(23, 28, 52, 0.05), 0 14px 32px -12px rgba(38, 57, 166, 0.25)',
        pop: '0 10px 40px -10px rgba(23, 28, 52, 0.30)',
      },
      keyframes: {
        'page-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'drawer-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.97)' },
          to: { opacity: '1', transform: 'none' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          to: { opacity: '1', transform: 'none' },
        },
        'toast-out': {
          from: { opacity: '1', transform: 'none' },
          to: { opacity: '0', transform: 'translateX(24px)' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        draw: { to: { strokeDashoffset: '0' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        scan: { '0%': { top: '8%' }, '50%': { top: '84%' }, '100%': { top: '8%' } },
        'ring-pulse': { '0%': { transform: 'scale(0.9)', opacity: '0.7' }, '100%': { transform: 'scale(1.35)', opacity: '0' } },
        'chip-in': { from: { opacity: '0', transform: 'translateY(4px) scale(0.92)' }, to: { opacity: '1', transform: 'none' } },
        'card-in': { from: { opacity: '0', transform: 'translateY(18px) scale(0.97)' }, to: { opacity: '1', transform: 'none' } },
        steam: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '40%': { opacity: '0.8' }, '100%': { opacity: '0', transform: 'translateY(-14px)' } },
        'shake': {
          '0%, 100%': { transform: 'none' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
      },
      animation: {
        'page-in': 'page-in 260ms cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'drawer-in': 'drawer-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'pop-in': 'pop-in 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'toast-in': 'toast-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'toast-out': 'toast-out 220ms ease-in both',
        'rise-in': 'rise-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        shake: 'shake 360ms ease-in-out',
        float: 'float 6s ease-in-out infinite',
        scan: 'scan 2.6s ease-in-out infinite',
        'ring-pulse': 'ring-pulse 2s ease-out infinite',
        'chip-in': 'chip-in 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'card-in': 'card-in 700ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        steam: 'steam 2.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}
