/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tint: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          subtle: '#EFF6FF',
          muted: '#BFDBFE',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          page: '#FAF9F6',
          raised: '#F5F3EE',
        },
        label: {
          DEFAULT: '#18181B',
          sub: '#52525B',
          muted: '#A1A1AA',
          invert: '#FAFAFA',
        },
        border: {
          DEFAULT: '#E4E4E7',
          strong: '#D4D4D8',
          subtle: '#F4F4F5',
        },
        success: {
          DEFAULT: '#22C55E',
          subtle: '#F0FDF4',
          muted: '#BBF7D0',
        },
        danger: {
          DEFAULT: '#EF4444',
          subtle: '#FEF2F2',
          muted: '#FECACA',
        },
        dark: {
          page: '#0F0F10',
          surface: '#18181B',
          raised: '#27272A',
          border: '#3F3F46',
        },
      },
      fontSize: {
        'page-title': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'section-title': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.6rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        button: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        caption: ['0.75rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        overline: ['0.6875rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.05em' }],
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        'card-lg': '0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
      },
      fontFamily: {
        sans: ['Pretendard', 'var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
