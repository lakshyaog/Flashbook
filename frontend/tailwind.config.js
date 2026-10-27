/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceHover: '#F1F3F7',
        card: '#FFFFFF',
        border: '#E5E8EE',
        borderMuted: '#D3D8E1',
        buy: '#0E9F6E',
        buyHover: '#0B8A5F',
        buySubtle: 'rgba(14, 159, 110, 0.10)',
        sell: '#E11D48',
        sellHover: '#BE123C',
        sellSubtle: 'rgba(225, 29, 72, 0.08)',
        brand: '#3D5AFE',
        brandHover: '#2F47D9',
        textPrimary: '#0F1729',
        textSecondary: '#4B5563',
        textMuted: '#8A919E'
      },
      fontFamily: {
        mono: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15,23,41,0.04), 0 8px 24px -12px rgba(15,23,41,0.10)',
      },
    },
  },
  plugins: [],
}
