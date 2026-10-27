# Readiary

Readiary는 마음에 남은 문장과 그때의 생각을 가볍게 남기고, 시간이 지난 뒤 다시 읽도록 돕는 한국어 독서 일기입니다.
PWA(Progressive Web App)로 제공되어 홈 화면에 설치하고 앱처럼 사용할 수 있습니다.

## 주요 기능

- 책의 문장이나 나의 생각 중 하나만 있어도 기록이 됩니다. 쪽수는 선택이고, 완독은 직접 선언합니다.
- 오늘 화면에서 지난 문장을 간지로 다시 만나고, 지난 7일의 기록을 돌아봅니다.
- 책장에서 책등이나 목록으로 책을 찾고, 완독한 책의 문장을 발췌집으로 모아 읽습니다.
- 친구의 문장을 읽고 좋아요와 댓글을 남깁니다.
- 기록은 기본 비공개이고, 친구 공개와 외부 링크 공유는 따로 켭니다.
- 라이트·다크모드는 기기 설정을 따릅니다.
- 홈 화면에 설치하고 기기별 독서 알림을 받을 수 있습니다.

## 개발 환경

- Framework: [Next.js 16 (App Router)](https://nextjs.org/docs/app), React 19
- Styling: Tailwind CSS 3, 시맨틱 토큰(`app/globals.css` → `tailwind.config.js`)
- Database·Auth: Supabase (PostgreSQL, RLS)
- Deployment: Vercel (서울 리전 `icn1`)
- PWA: next-pwa + Workbox

정확한 버전은 `package.json`과 `package-lock.json`을 확인하세요.

## 디자인

화면은 "일기장과 간지" 문법을 따릅니다. 일기장 괘선 위에 반투명한 간지가 겹쳐 놓인 모습입니다.
한 장 요약은 [DESIGN.md](DESIGN.md), 규칙과 토큰 사용법은 [UI Guidelines](docs/ui-guidelines.md)를 참고하세요.

## 로컬 개발

```bash
npm ci            # 패키지 설치
npm run dev       # 개발 서버 (next dev --webpack)
npm test          # 테스트 (vitest)
npm run lint      # 린트 (eslint)
npm run build     # 프로덕션 빌드 (next build --webpack)
```

브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속합니다. Supabase 환경값이 필요합니다.

## 디렉터리 구조

```
app/                 # Next.js App Router
 ├─ page.tsx         # 랜딩
 ├─ (app)/           # 로그인 후 앱 화면: 오늘·책장·소셜·프로필·알림 (주소에 나타나지 않는 route group)
 ├─ api/             # API 라우트
 ├─ share/           # 외부 링크로 공유받은 문장
 └─ login/ signup/ onboarding/ …  # 인증과 가입
components/          # 재사용 UI (화면 틀은 components/shell/, 공용 부품은 components/ui/)
hooks/               # React 훅
lib/                 # 인증·데이터·도메인 로직
supabase/migrations/ # DB 스키마와 RLS
docs/                # 설계·운영 문서
public/              # 아이콘, manifest 등 정적 파일
```

## PWA

- `public/manifest.json`과 `public/icons/`의 아이콘을 씁니다.
- 빌드할 때 `sw.js`와 `workbox-*.js`가 생성됩니다.
- iOS Safari, Android, 데스크톱 브라우저에서 홈 화면에 설치할 수 있습니다.

---

작업 규칙은 [AGENTS.md](AGENTS.md)에 있습니다.
