/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #22c55e)',
        dark: {
          bg: '#05060a',
          elevated: '#11131a',
          elevatedSoft: '#181b25',
          card: '#11131a',
          cardHover: '#181b25',
          border: '#262a3a',
          text: '#f7f7ff',
          textSecondary: '#b0b3c2',
          textMuted: '#7b7f92'
        }
      },
      borderRadius: {
        'card': '16px'
      },
      boxShadow: {
        'soft': '0 12px 40px rgba(0, 0, 0, 0.45)'
      }
    },
  },
  plugins: [],
}
