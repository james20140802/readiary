# Readiary 📚🌙

Readiary는 매일의 독서 기록을 작성하고 친구들과 공유할 수 있는 감성적인 독서 일기 앱입니다.  
PWA(Progressive Web App)로 제공되어 홈 화면에 설치하고 앱처럼 사용할 수 있습니다.

## ✨ 주요 기능

- 📖 책 등록 및 진행률 관리
- ✍️ 매일의 줄거리/감상 기록 작성
- 🎯 독서 성취도 기반 배지 시스템
- 👥 친구의 독서 기록 확인 (소셜 기능)
- 🔒 기본은 비공개, 친구와 공유 가능
- 💡 애니메이션 기반 감성 UI + 다크모드 대응
- 📲 PWA 지원 (설치형 웹앱)

## 🛠️ 개발 환경

- Framework: [Next.js 14 (App Router)](https://nextjs.org/docs/app)
- Styling: Tailwind CSS
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Deployment: Vercel
- PWA: next-pwa + Workbox

## 🎨 디자인 가이드

Readiary의 일관된 UI/UX를 위해 커스텀 디자인 시스템(시맨틱 토큰)을 구축하여 사용하고 있습니다. 
자세한 디자인 규칙과 Tailwind 토큰 사용법은 [UI Guidelines](docs/ui-guidelines.md) 문서를 참고하세요.

## 🧪 로컬 개발 방법

```bash
# 패키지 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

## 🚀 배포

[Vercel](https://vercel.com) 을 통해 배포됩니다.

## 📁 디렉토리 구조

```
app/                 # Next.js App Router 기반 디렉토리
 ├─ layout.tsx       # 전체 레이아웃 (Navbar 포함)
 ├─ page.tsx         # 홈 (랜딩) 페이지
 ├─ protected/       # 로그인 후 접근 가능한 보호된 영역
 ├─ onboarding/      # 회원가입 후 추가정보 입력
components/          # 재사용 가능한 UI 컴포넌트
lib/                 # Supabase 클라이언트 등 유틸
public/              # 정적 파일 (아이콘, 이미지, manifest 등)
utils/               # 유틸리티 함수
```

## 📦 PWA 지원

- `/public/manifest.json`
- `/public/icons/` 디렉토리의 아이콘들
- 자동 생성된 `sw.js`, `workbox-*.js`

Readiary는 Android 및 Desktop 브라우저에서 설치 가능한 앱으로 작동합니다.

---

개선 아이디어나 피드백이 있다면 언제든지 제안해주세요!
