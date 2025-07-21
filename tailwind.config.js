/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tint: '#3B82F6',
        label: '#111827',
        secondary: '#6B7280',
        background: '#FFFFFF',
        darkbg: '#1F2937',
      },
      fontSize: {
        'page-title': ['1.5rem', '2rem'], // text-2xl leading-tight
        'section-title': ['1.25rem', '1.75rem'], // text-xl leading-snug
        'body-text': ['1rem', '1.5rem'], // text-base leading-relaxed
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
