# 🧭 Readiary UI Guidelines

Readiary의 UI/UX 일관성을 유지하기 위한 스타일 가이드입니다.
최근 리팩터링된 시맨틱(Semantic) 디자인 시스템을 기반으로 작성되었습니다.

---

## 🎨 색상 (Colors)

Tailwind의 `tailwind.config.ts`에 정의된 시맨틱 토큰을 사용합니다. 하드코딩된 색상(예: `bg-blue-500`) 대신 아래의 토큰을 사용해주세요.

### Tint (주요/강조색 ✨)

| 토큰                      | 용도                                | 클래스 예시            |
| ------------------------- | ----------------------------------- | ---------------------- |
| `tint` (`#3B82F6`)        | 기본 강조색 (프라이머리 버튼, 링크) | `bg-tint`, `text-tint` |
| `tint-hover` (`#2563EB`)  | 사용자와 상호작용 시 강조색 (Hover) | `hover:bg-tint-hover`  |
| `tint-subtle` (`#EFF6FF`) | 강조 요소의 연한 배경               | `bg-tint-subtle`       |
| `tint-muted` (`#BFDBFE`)  | 비활성화 또는 은은한 강조 경계선    | `border-tint-muted`    |

### Surface (배경/표면 🔲)

| 토큰                         | 용도                                   | 클래스 예시         |
| ---------------------------- | -------------------------------------- | ------------------- |
| `surface-page` (`#FAF9F6`)   | 앱 전체의 기본 배경                    | `bg-surface-page`   |
| `surface` (`#FFFFFF`)        | 카드, 모달 등 주 표면 영역             | `bg-surface`        |
| `surface-raised` (`#F5F3EE`) | 약간 돌출된 듯한 배경 요소 (입력창 등) | `bg-surface-raised` |

### Label (텍스트 📝)

| 토큰                       | 용도                                    | 클래스 예시         |
| -------------------------- | --------------------------------------- | ------------------- |
| `label` (`#18181B`)        | 기본 텍스트 및 제목 수준                | `text-label`        |
| `label-sub` (`#52525B`)    | 부가 설명, 본문 텍스트                  | `text-label-sub`    |
| `label-muted` (`#A1A1AA`)  | 비활성 텍스트 또는 덜 중요한 메타데이터 | `text-label-muted`  |
| `label-invert` (`#FAFAFA`) | 어두운 배경 위의 흰색 텍스트            | `text-label-invert` |

### Border (경계선/구분선 📏)

| 토큰                        | 용도                        | 클래스 예시            |
| --------------------------- | --------------------------- | ---------------------- |
| `border` (`#E4E4E7`)        | 기본 경계선 및 디바이더     | `border-border`        |
| `border-strong` (`#D4D4D8`) | 뚜렷한 경계선이 필요한 경우 | `border-border-strong` |
| `border-subtle` (`#F4F4F5`) | 매우 은은한 경계선          | `border-border-subtle` |

### 다크 모드 (Dark 🌙)

| 토큰                       | 용도                       | 클래스 예시               |
| -------------------------- | -------------------------- | ------------------------- |
| `dark-page` (`#0F0F10`)    | 다크모드 기본 배경         | `dark:bg-dark-page`       |
| `dark-surface` (`#18181B`) | 다크모드 카드, 모달 표면   | `dark:bg-dark-surface`    |
| `dark-raised` (`#27272A`)  | 다크모드 입력창, 돌출 요소 | `dark:bg-dark-raised`     |
| `dark-border` (`#3F3F46`)  | 다크모드 기본 경계선       | `dark:border-dark-border` |

---

## 🔠 타이포그래피 (Typography)

폰트는 전역으로 적용된 **Pretendard**를 사용합니다.
Tailwind 크기 유틸리티 대신, `line-height`와 `font-weight`가 미리 포함된 커스텀 클래스들을 사용하세요.

| 용도           | 클래스               | 특성                    |
| -------------- | -------------------- | ----------------------- |
| 페이지 제목    | `text-page-title`    | `24px`, bold            |
| 섹션 제목      | `text-section-title` | `18px`, semibold        |
| 본문 기본      | `text-body`          | `15px`, 기본 밝기/간격  |
| 본문 작음      | `text-body-sm`       | `14px`, 보조 내용용     |
| 버튼 텍스트    | `text-button`        | `14px`, medium          |
| 캡션/설명      | `text-caption`       | `12px`, 부가메시지      |
| 오버라인(라벨) | `text-overline`      | `11px`, 대문자/넓은자간 |

사용 예시:

```tsx
<h1 className="text-page-title text-label dark:text-label-invert">홈</h1>
<p className="text-body text-label-sub">새로운 책을 읽어보세요.</p>
```

---

## 🎛️ 컴포넌트 패턴

### 버튼 (Buttons)

```tsx
<button className="bg-tint hover:bg-tint-hover text-surface text-button px-4 py-2 rounded-lg transition-colors">
  시작하기
</button>
```

### 입력창 및 텍스트영역 (Inputs)

기존에 사용하던 `border`, `rounded-lg`, 및 `dark:` 프리픽스 하드코딩을 아래와 같이 토큰으로 구성합니다.

```tsx
<input
  className="w-full px-4 py-2 text-body rounded-lg 
             bg-surface-raised dark:bg-dark-raised 
             border border-border dark:border-dark-border 
             text-label dark:text-label-invert 
             focus:ring-2 focus:ring-tint-muted outline-none transition-all"
  placeholder="제목을 입력하세요"
/>
```

---

## 📦 UI 효과 및 곡률 (Radius & Shadow)

- **곡률 (Radius):** 기본적으로 컴포넌트에는 `rounded-lg`(`16px`) 혹은 `rounded-2xl`(`24px` 카드용)를 추천합니다. (sm, md, lg, xl, 2xl, 3xl 커스텀 지원)
- **그림자 (Shadow):**
  - `shadow-card`: 가벼운 패널/카드용
  - `shadow-card-md`: 약간 떠있는 듯 한 컴포넌트
  - `shadow-card-lg`: 중요 모달 등 최상위 요소

---

## 🌙 다크 모드 (Dark Mode)

모든 컴포넌트를 설계할 때 다크 모드를 필수로 대응합니다. `dark:` 프리픽스와 시맨틱 토큰을 짝지어 구성합니다.

```tsx
<div className="bg-surface dark:bg-dark-surface border border-border dark:border-dark-border shadow-card rounded-2xl p-6">
  <h2 className="text-section-title text-label dark:text-label-invert">독서 통계</h2>
  <span className="text-caption text-label-muted">2026년 3월 기준</span>
</div>
```

---

## 🧩 컴포넌트 네이밍 규칙

- 공통 UI 요소: `Button`, `Input`, `Textarea`, `Modal`, `Card`
- 도메인 특화 컴포넌트: `BookCard`, `TimelineEntry`, `UserProfile`
- 스타일은 항상 위에서 정의된 디자인 토큰을 활용합니다.

---

## 📌 기타 규칙

- 로딩 스피너 및 인터랙션 상태(Disabled, Loading) 스타일 대응은 투명도(`opacity-50`) 등을 활용합니다.
- 여백과 간격은 일관된 Tailwind Spacing (`mt-4`, `space-y-6`, `p-5` 등)을 사용하여 시각적 하이어라키를 형성합니다.
