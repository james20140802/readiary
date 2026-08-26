import localFont from 'next/font/local';

export const maruBuri = localFont({
  src: [
    { path: './fonts/MaruBuri-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/MaruBuri-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/MaruBuri-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-serif',
  display: 'swap',
  fallback: ['Noto Serif KR', 'serif'],
});
