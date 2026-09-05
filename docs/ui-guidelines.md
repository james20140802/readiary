# Readiary UI Guidelines — 먹과 종이

에디토리얼 디자인 시스템 규범. 시안: "먹과 종이" 아티팩트, 스펙 §6.
원칙: **문장이 주인공. 콘텐츠는 부리, 도구는 산세리프. 그림자 대신 헤어라인. 파랑은 잉크처럼 아껴서.**

## 색 (Colors)

모든 색은 `app/globals.css`의 CSS 변수를 Tailwind 토큰이 참조한다.
**라이트/다크는 변수가 자동 전환하므로 색상에 `dark:` 프리픽스를 쓰지 않는다.**

| 토큰 | 라이트 | 다크 | 용도 |
| --- | --- | --- | --- |
| `bg-paper` | `#F7F3EC` | `#1B1612` | 앱 바탕(종이) |
| `bg-card` | `#FDFBF7` | `#241E19` | 카드·입력 표면 |
| `bg-card-raised` | `#F2ECE1` | `#2E2721` | 눌린/돌출 표면 |
| `text-ink` | `#221E1A` | `#EAE2D6` | 기본 글 (먹) |
| `text-ink-sub` | `#6E665C` | `#9A8F81` | 보조 글 |
| `text-ink-faint` | `#A39A8D` | `#6E655A` | 흐린 글·플레이스홀더 |
| `text-ink-invert` | 카드색 | 종이색 | 먹 배경 위 글 |
| `border-hairline` | `#E3DCD0` | `#3A322A` | 기본 헤어라인 |
| `border-hairline-strong` | `#CFC5B4` | `#4A4036` | 강조 헤어라인(위계) |
| `*-accent` | `#2D5FB8` | `#85A9EC` | 강조(잉크). 아껴 쓴다 |
| `bg-accent-soft` | 잉크 7% | 잉크 7% | 강조 연한 배경 |
| `*-danger` / `*-success` | 가라앉힌 적갈/초록 | 밝힌 톤 | 상태 |

- 강조색은 파란 잉크(`#2D5FB8`, 다크 `#85A9EC`)로 확정(2026-08-31, 브랜드 대표색 포함). 주홍 후보와 `data-accent` 전환 스위치는 제거됨.
- 원색 Tailwind 팔레트(`blue-500`, `red-500` 등)와 하드코딩 hex 금지.

## 서체 (Typography)

2서체 체계. **책의 목소리는 부리, 나의 도구는 산세리프.**

- `font-serif` — 마루 부리(셀프호스팅, `app/fonts.ts`). 인용문, 책 제목, 워드마크, 회고 카피.
- `font-sans` — Pretendard. UI 크롬, 버튼, 라벨, 메타데이터. (기본값)

크기 토큰: `text-page-title`(24) `text-section-title`(18) `text-body`(15) `text-body-sm`(14) `text-button`(14) `text-caption`(12) `text-overline`(11) 그리고:

- `text-quote` — 20px/1.85. 인용 문장 전용(`font-serif`와 함께).
- `text-note` — 13.5px/1.8. 인용에 딸린 짧은 단상·주석(시안 .note).
- `text-seal` — 10.5px/굵게/자간 0.16em. 날짜·상태 표식 전용.

## 표면 규칙 (Surfaces)

- **그림자 금지.** `shadow-*` 클래스를 쓰지 않는다. 위계는 헤어라인 굵기·톤(`hairline` → `hairline-strong`)과 배경 단차(`paper` → `card` → `card-raised`)로.
- 곡률은 절제: 카드 `rounded-md`(6px), 알약형(버튼·칩) `rounded-full`. 큰 라운드(`rounded-2xl` 이상) 지양.
- 기울어진 도장 박스(스탬프) 장식 금지. 날짜 표식은 `<Seal>` 컴포넌트. 한자 장식(讀 등)은 허용.
- 이모지 장식 지양.

## 프리미티브 (components/ui)

| 컴포넌트 | 요지 |
| --- | --- |
| `Button` | 알약형. primary=먹 배경, secondary=헤어라인 아웃라인, ghost/danger/success |
| `Card` | 헤어라인 카드. `raised`는 진한 헤어라인(그림자 없음) |
| `Input`/`Textarea` | 기본(`box`): 카드 표면 + strong 헤어라인, 포커스에 accent 1px. `variant="line"`: 상자 없이 괘선 위에, 포커스는 괘선만 짙게 — 기록·책 등록·인증 화면 |
| `Modal` | `bg-ink/30` 스크림 + 헤어라인 패널 |
| `Tabs` | 밑줄형, 활성=accent |
| `Seal` | 잉크색 날짜/상태 라벨 ("1년 전 오늘", "완독") |
| `Chip` | 알약형 선택 칩, `dot`으로 잉크 점 |
| `Avatar` | card-raised 배경 + 헤어라인 |

## 다크 모드

어두운 종이. OS 설정 따름(`darkMode: 'media'`), 앱 내 토글 없음.
토큰이 자동 전환하므로 **컴포넌트 코드에는 다크 분기가 없어야 정상**이다. `dark:`가 필요하다고 느껴지면 토큰 선택이 잘못된 것.

## 아이콘

lucide-react 단일. `strokeWidth={1.75}` 권장. react-icons 금지(의존성 제거됨).
