/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0E14',
        surface: '#121722',
        surfaceHover: '#182030',
        card: '#161D2C',
        border: '#1E293B',
        borderMuted: '#2D3748',
        buy: '#00F59B',
        buyHover: '#00D887',
        buySubtle: 'rgba(0, 245, 155, 0.12)',
        sell: '#FF4B72',
        sellHover: '#E0385D',
        sellSubtle: 'rgba(255, 75, 114, 0.12)',
        brand: '#00E5FF',
        brandHover: '#00C8DE',
        textPrimary: '#F8FAFC',
        textSecondary: '#94A3B8',
        textMuted: '#64748B'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
