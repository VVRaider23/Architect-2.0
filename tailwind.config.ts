import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F4F2EE',
        surface: '#FFFFFF',
        surface2: '#F9F8F5',
        sunken: '#EFEDE8',
        line: '#E3E0D8',
        line2: '#CBC7BD',
        ink: '#1D1C1A',
        ink2: '#57544E',
        ink3: '#7C786F',
        accent: { DEFAULT: '#2446B5', ink: '#1B3690', soft: '#E8EDFB', line: '#B9C6F0' },
        ok: { DEFAULT: '#1F7A45', soft: '#E4F2E9', line: '#A9D3B8' },
        bad: { DEFAULT: '#B3261E', soft: '#FBE7E4', line: '#EDB5AE' },
        warn: { DEFAULT: '#8A5A00', soft: '#FBF0D9', line: '#E8CD8F' },
        code: { DEFAULT: '#1C1B19', ink: '#E9E6DF', dim: '#9C988F', add: '#1E3A27', del: '#46221D', line: '#2E2C29' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,28,26,0.05)',
        pop: '0 12px 32px rgba(29,28,26,0.14), 0 2px 6px rgba(29,28,26,0.06)',
        ring: '0 0 0 3px rgba(36,70,181,0.18)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-left': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
        caret: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-left': 'slide-left 220ms ease-out',
        pulse2: 'pulse2 1.4s ease-in-out infinite',
        caret: 'caret 1s step-end infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
