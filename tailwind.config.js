/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        paper: 'rgb(var(--paper) / <alpha-value>)',
        margin: 'rgb(var(--margin) / <alpha-value>)',
        sheet: 'rgb(var(--sheet) / <alpha-value>)',
        scrim: 'rgb(var(--scrim) / <alpha-value>)',
        flag: {
          yellow: 'rgb(var(--flag-yellow) / <alpha-value>)',
          pink: 'rgb(var(--flag-pink) / <alpha-value>)',
          orange: 'rgb(var(--flag-orange) / <alpha-value>)',
          green: 'rgb(var(--flag-green) / <alpha-value>)',
          blue: 'rgb(var(--flag-blue) / <alpha-value>)',
          purple: 'rgb(var(--flag-purple) / <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          raised: 'rgb(var(--card-raised) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          sub: 'rgb(var(--ink-sub) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
          invert: 'rgb(var(--ink-invert) / <alpha-value>)',
        },
        hairline: {
          DEFAULT: 'rgb(var(--hairline) / <alpha-value>)',
          strong: 'rgb(var(--hairline-strong) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          soft: 'rgb(var(--accent) / 0.07)',
        },
        danger: {
          DEFAULT: 'rgb(var(--danger) / <alpha-value>)',
          soft: 'rgb(var(--danger) / 0.08)',
        },
        success: {
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          soft: 'rgb(var(--success) / 0.08)',
        },
      },
      fontSize: {
        'page-title': [
          '2.125rem',
          { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.01em' },
        ],
        'page-title-lg': [
          '2.5rem',
          { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.01em' },
        ],
        'section-title': [
          '1.625rem',
          { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.01em' },
        ],
        body: ['1.0625rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.5', fontWeight: '400' }],
        note: ['1.1875rem', { lineHeight: '1.65', fontWeight: '400' }],
        input: ['1.125rem', { lineHeight: '1.5' }],
        button: ['1.0625rem', { lineHeight: '1.25', fontWeight: '600' }],
        'button-sm': ['0.9375rem', { lineHeight: '1.25', fontWeight: '600' }],
        'button-lg': ['1.0625rem', { lineHeight: '1.25', fontWeight: '600' }],
        caption: ['0.9375rem', { lineHeight: '1.4', fontWeight: '500' }],
        overline: ['0.875rem', { lineHeight: '1.4', fontWeight: '600' }],
        tab: ['0.75rem', { lineHeight: '1', fontWeight: '600' }],
        fine: ['0.8125rem', { lineHeight: '1.5', fontWeight: '500' }],
        seal: ['0.6875rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.08em' }],
        ornament: ['0.75rem', { lineHeight: '1rem' }],
        quote: ['1.5625rem', { lineHeight: '1.6', fontWeight: '600', letterSpacing: '-0.01em' }],
        'quote-lg': [
          '1.875rem',
          { lineHeight: '1.55', fontWeight: '600', letterSpacing: '-0.015em' },
        ],
        'display-sm': ['2rem', { lineHeight: '1.375' }],
        display: ['3rem', { lineHeight: '1.25' }],
        'display-lg': ['3.75rem', { lineHeight: '1' }],
        'quote-mark': ['2.5rem', { lineHeight: '1' }],
        monogram: ['2.25rem', { lineHeight: '1' }],
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      // globals.css의 --ease-* 토큰과 같은 값. Tailwind 기본 ease-out/ease-in은 약해서 따로 둔다
      transitionTimingFunction: {
        'ink-out': 'var(--ease-out)',
        'ink-in-out': 'var(--ease-in-out)',
        drawer: 'var(--ease-drawer)',
        page: 'var(--ease-page)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-serif)', 'Noto Serif KR', 'Georgia', 'serif'],
      },
    },
  },
  // hover: 스타일은 마우스·트랙패드처럼 hover가 되는 기기에서만 — 터치 후 들린 채 남지 않게
  future: { hoverOnlyWhenSupported: true },
  plugins: [],
};
