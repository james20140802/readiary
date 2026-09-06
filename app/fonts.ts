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

// Pretendard v1.3.9 (SIL OFL): serve locally so page visits do not contact a font CDN.
export const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  weight: '45 920',
  variable: '--font-sans',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'sans-serif'],
});
