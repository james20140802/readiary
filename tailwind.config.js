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
      // ============================================================
      // 🎨 COLOR TOKENS
      // 규칙: zinc 계열로 통일. gray/slate 직접 사용 금지.
      // ============================================================
      colors: {
        // --- Brand ---
        tint: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB',
          subtle: '#EFF6FF',
          muted: '#BFDBFE',
        },

        // --- Surface (배경/카드) ---
        surface: {
          DEFAULT: '#FFFFFF', // 카드, 모달 배경
          page: '#FAF9F6', // 페이지 배경 (크림톤 유지)
          raised: '#F5F3EE', // 살짝 올라온 느낌 (hover 등)
          overlay: 'rgba(0,0,0,0.5)',
        },

        // --- Text ---
        label: {
          DEFAULT: '#18181B', // 제목, 강조 텍스트 (zinc-900)
          sub: '#52525B', // 보조 텍스트 (zinc-600)
          muted: '#A1A1AA', // 힌트, 비활성 (zinc-400)
          invert: '#FAFAFA', // 다크 배경 위 텍스트
        },

        // --- Border ---
        border: {
          DEFAULT: '#E4E4E7', // 기본 테두리 (zinc-200)
          strong: '#D4D4D8', // 강조 테두리 (zinc-300)
          subtle: '#F4F4F5', // 아주 연한 구분선 (zinc-100)
        },

        // --- Semantic ---
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
        warning: {
          DEFAULT: '#F59E0B',
          subtle: '#FFFBEB',
        },

        // --- Dark mode surfaces ---
        dark: {
          page: '#0F0F10', // 다크 페이지 배경
          surface: '#18181B', // 다크 카드 배경 (zinc-900)
          raised: '#27272A', // 다크 hover (zinc-800)
          border: '#3F3F46', // 다크 테두리 (zinc-700)
        },

        // --- Legacy (기존 코드 호환, 점진적으로 위 토큰으로 교체) ---
        secondary: '#52525B',
        background: '#FFFFFF',
        darkbg: '#18181B',
      },

      // ============================================================
      // 📐 BORDER RADIUS TOKENS
      // 규칙: 이 토큰만 사용. rounded-[x.xrem] 직접 사용 금지.
      // ============================================================
      borderRadius: {
        none: '0',
        sm: '0.375rem', // input, badge
        DEFAULT: '0.75rem', // 기본 카드 (rounded-xl)
        md: '0.75rem', // 기본 카드
        lg: '1rem', // 모달, 바텀시트
        xl: '1.25rem', // 피드 카드
        '2xl': '1.5rem', // 프로필 이미지, 버튼 pill
        full: '9999px', // pill badge, avatar
      },

      // ============================================================
      // 📏 SPACING TOKENS
      // ============================================================
      spacing: {
        'page-x': '1rem', // 모바일 좌우 패딩
        'page-x-md': '1.5rem', // 데스크탑 좌우 패딩
        section: '1.5rem', // 섹션 간 간격
        card: '1rem', // 카드 내부 패딩
        'card-lg': '1.25rem', // 카드 내부 패딩 (large)
      },

      // ============================================================
      // 🔠 TYPOGRAPHY TOKENS
      // ============================================================
      fontSize: {
        // 페이지/섹션 타이틀
        'page-title': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'section-title': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],

        // 본문
        body: ['0.9375rem', { lineHeight: '1.6rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5rem', fontWeight: '400' }],

        // UI 요소
        button: ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        caption: ['0.75rem', { lineHeight: '1.125rem', fontWeight: '400' }],
        overline: ['0.6875rem', { lineHeight: '1rem', fontWeight: '700', letterSpacing: '0.05em' }],
      },

      fontFamily: {
        // 한국어 독서 앱 감성에 맞는 폰트 스택
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },

      // ============================================================
      // 🌑 BOX SHADOW TOKENS
      // ============================================================
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px 0 rgba(0,0,0,0.08)',
        'card-lg': '0 8px 24px 0 rgba(0,0,0,0.10)',
        tint: '0 4px 14px 0 rgba(59,130,246,0.25)',
      },

      // ============================================================
      // 🎞️ ANIMATION
      // ============================================================
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        'slide-up': 'slide-up 0.4s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
