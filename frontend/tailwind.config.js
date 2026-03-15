/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        body:    ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        ink:   '#0A0A0F',
        paper: '#F5F0E8',
        amber: {
          DEFAULT: '#E8A020',
          light:   '#F5C842',
          dark:    '#B87818',
        },
        rust:  '#C44B2A',
        sage:  '#4A6741',
        slate: '#2A2A3A',
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'fade-up':      'fadeUp 0.6s ease forwards',
        'scan':         'scan 3s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%':   { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        }
      }
    },
  },
  plugins: [],
}
