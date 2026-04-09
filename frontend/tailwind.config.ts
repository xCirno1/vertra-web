import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'vertra-bg': '#0a0a0c',
        'vertra-surface': '#12121a',
        'vertra-surface-alt': '#1a1a24',
        'vertra-border': '#2a2a3e',
        'vertra-cyan': '#1dd4f6',
        'vertra-teal': '#8ecfbe',
        'vertra-text': '#e8e8f0',
        'vertra-text-dim': '#8a8a9e',
        'vertra-success': '#51cf66',
        'vertra-error': '#ff6b6b',
        'vertra-lime': '#c5f135',
        'vertra-slate': '#4a4a5a',
        'vertra-obsidian': '#07070a',
      },
      backgroundImage: {
        'vertra-gradient': 'linear-gradient(135deg, #1dd4f6, #8ecfbe)',
        'vertra-gradient-hover': 'linear-gradient(135deg, #1dd4f6 0%, #8ecfbe 100%)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-mono)', ...defaultTheme.fontFamily.mono],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
