import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        surface2: 'rgb(var(--surface2) / <alpha-value>)',
        sunken: 'rgb(var(--sunken) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        line2: 'rgb(var(--line2) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        ink2: 'rgb(var(--ink2) / <alpha-value>)',
        ink3: 'rgb(var(--ink3) / <alpha-value>)',
        accent: { DEFAULT: 'rgb(var(--accent) / <alpha-value>)', ink: 'rgb(var(--accent-ink) / <alpha-value>)', soft: 'rgb(var(--accent-soft) / <alpha-value>)', line: 'rgb(var(--accent-line) / <alpha-value>)' },
        ok: { DEFAULT: 'rgb(var(--ok) / <alpha-value>)', soft: 'rgb(var(--ok-soft) / <alpha-value>)', line: 'rgb(var(--ok-line) / <alpha-value>)' },
        bad: { DEFAULT: 'rgb(var(--bad) / <alpha-value>)', soft: 'rgb(var(--bad-soft) / <alpha-value>)', line: 'rgb(var(--bad-line) / <alpha-value>)' },
        warn: { DEFAULT: 'rgb(var(--warn) / <alpha-value>)', soft: 'rgb(var(--warn-soft) / <alpha-value>)', line: 'rgb(var(--warn-line) / <alpha-value>)' },
        code: { DEFAULT: '#1C1B19', ink: '#E9E6DF', dim: '#9C988F', add: '#1E3A27', del: '#46221D', line: '#2E2C29' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(29,28,26,0.05)',
        pop: '0 12px 32px rgba(29,28,26,0.14), 0 2px 6px rgba(29,28,26,0.06)',
        ring: '0 0 0 3px rgb(var(--accent) / 0.18)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-left': { from: { opacity: '0', transform: 'translateX(24px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulse2: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
        caret: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0' } },
        tour: { '0%,100%': { boxShadow: '0 0 0 3px rgb(var(--accent) / 0.28)' }, '50%': { boxShadow: '0 0 0 9px rgb(var(--accent) / 0.06)' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
        'slide-left': 'slide-left 220ms ease-out',
        pulse2: 'pulse2 1.4s ease-in-out infinite',
        caret: 'caret 1s step-end infinite',
        tour: 'tour 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
