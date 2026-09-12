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
        'page-title': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'section-title': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.75', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.375rem', fontWeight: '400' }],
        note: ['0.9375rem', { lineHeight: '1.75', fontWeight: '400' }],
        input: ['1rem', { lineHeight: '1.5rem' }],
        button: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'button-sm': ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'button-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        caption: ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        overline: ['0.75rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.05em' }],
        seal: ['0.6875rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.08em' }],
        ornament: ['0.75rem', { lineHeight: '1rem' }],
        quote: ['1.25rem', { lineHeight: '1.85', fontWeight: '400' }],
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
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        serif: ['var(--font-serif)', 'Noto Serif KR', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
