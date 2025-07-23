# 🧭 Readiary UI Guidelines

Readiary의 UI/UX 일관성을 유지하기 위한 스타일 가이드입니다.

---

## 🎨 색상 (Colors)

| 이름       | 색상 코드 | 용도                        |
| ---------- | --------- | --------------------------- |
| Tint       | `#3B82F6` | 주요 강조색 (버튼, 링크 등) |
| Label      | `#111827` | 기본 텍스트 색상            |
| Secondary  | `#6B7280` | 보조 텍스트 색상            |
| Background | `#FFFFFF` | 기본 배경색                 |
| Dark BG    | `#1F2937` | 다크 모드 배경색            |

---

## 🧱 간격 (Spacing)

| 용도           | 클래스 예시   | 비고                     |
| -------------- | ------------- | ------------------------ |
| 섹션 간격      | `mt-10`       | 주요 섹션 위쪽 간격      |
| 제목 아래 간격 | `mb-4`        | `<h2>` 등 제목 하단 간격 |
| 리스트 항목    | `space-y-4`   | 리스트 항목 사이 간격    |
| 내부 여백      | `p-4`, `px-6` | 카드, 버튼 등에 사용     |

---

## 🔠 타이포그래피 (Typography)

| 용도        | 클래스                                     |
| ----------- | ------------------------------------------ |
| 페이지 제목 | `text-2xl font-semibold leading-tight`     |
| 섹션 제목   | `text-xl font-semibold leading-snug`       |
| 본문 텍스트 | `text-base text-gray-900 dark:text-white`  |
| 보조 텍스트 | `text-sm text-gray-500 dark:text-gray-400` |

---

## 🎛️ 컴포넌트 스타일

### 버튼

```tsx
<button className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-4 py-2 rounded">
  버튼 텍스트
</button>
```

- 비활성 상태: `opacity-50 cursor-not-allowed`
- 로딩 상태: `relative`, 내부에 spinner 가능

### 입력창

```tsx
<input className="border px-4 py-2 rounded-lg w-full text-sm dark:bg-gray-900 dark:text-white" />
```

### 텍스트 영역

```tsx
<textarea className="border px-4 py-2 rounded-lg w-full text-sm resize-none dark:bg-gray-900 dark:text-white" />
```

---

## 🌙 다크 모드

Tailwind의 `dark:` 프리픽스를 사용하여 아래와 같이 정의합니다:

```tsx
<div className="text-gray-900 dark:text-white">텍스트</div>
```

---

## 🧩 컴포넌트 네이밍

- 공통 버튼: `PrimaryButton`, `SecondaryButton`
- 공통 입력창: `FormInput`, `SearchInput`, `Textarea`
- 섹션 제목: `SectionHeader`
- 카드: `Card`
- 아바타: `Avatar`
- 리스트 항목: `BookListItem`, `EntryListItem`, `FriendListItem`

---

## 📐 반응형 처리

| 브레이크포인트 | Tailwind 기준 | 사용 예시               |
| -------------- | ------------- | ----------------------- |
| 모바일         | `default`     | 기본값                  |
| 태블릿 이상    | `md:`         | `md:text-xl` 등         |
| 데스크탑 이상  | `lg:`         | `lg:p-6`, `lg:gap-6` 등 |

---

## 📌 기타 규칙

- 로딩 스피너는 항상 버튼 안에 위치시킵니다.
- 상태 메시지(`toast`)는 sonner를 통해 통일된 형태로 제공합니다.
- UI 간격, 폰트 크기 등은 이 문서를 기반으로 통일합니다.
