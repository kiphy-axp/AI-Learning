import type { Config } from 'tailwindcss';

export default {
  content: ['./web/index.html', './web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      opacity: {
        8: '0.08',
        12: '0.12',
        15: '0.15',
      },
      colors: {
        ink: {
          950: '#070a12',
          900: '#0b1020',
          850: '#111729',
          800: '#161d33',
          700: '#1f2942',
          600: '#2b3757',
        },
        brand: {
          400: '#7dd3fc',
          500: '#38bdf8',
          600: '#0ea5e9',
        },
        accent: {
          400: '#c4b5fd',
          500: '#a78bfa',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"SF Mono"', 'Menlo', 'Monaco', '"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
