/**
 * 서가의 책등 모양 — 시안 docs/design/concept-2026-10/shelf.js.
 * 표지가 없는 책은 표지 색을 흉내 낸 책등으로 그린다. 색은 제목으로 정해지는 고정값이라
 * 같은 책은 언제 봐도 같은 색·같은 키다.
 *
 * 아래 색은 UI 색이 아니라 "책 표지 색"을 흉내 내는 내용물이다(시안 SHELF_C 그대로).
 * 그래서 토큰으로 만들지 않고 여기에만 둔다 — 플래그 색처럼 강조색 규칙과 별개다.
 */

/** [바탕, 글자] — 시안 SHELF_C */
export const SPINE_COLORS: readonly (readonly [string, string])[] = [
  ['#0F4A3C', '#F2D57A'],
  ['#DCE4EC', '#2A2F38'],
  ['#C9D9D5', '#24403A'],
  ['#F4F2EE', '#D23A2C'],
  ['#E6542C', '#FFF2E2'],
  ['#2F3E5C', '#E9E3D6'],
  ['#E9E4DA', '#3B3A36'],
  ['#B9C7A8', '#2C3324'],
  ['#F2EEE4', '#6B2E2E'],
  ['#7A2E2B', '#F1E6D2'],
  ['#D8C9A6', '#3D3426'],
  ['#1F2A30', '#E7E1D6'],
  ['#C46A3E', '#FFF4E6'],
  ['#3E4A6B', '#EAE6DC'],
  ['#EAD9B8', '#4A3B22'],
  ['#5F6F52', '#F3EEE2'],
];

/** 표지 사진 위 책등 글자 — 어두운 막 위에 얹는 밝은 종이색(시안 SHELF_C의 밝은 글자) */
export const SPINE_ON_COVER_TEXT = '#FFF4E6';

function hash(text: string, salt = 0): number {
  let h = salt | 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 같은 제목은 늘 같은 [바탕, 글자] */
export function spineColor(title: string): readonly [string, string] {
  return SPINE_COLORS[hash(title) % SPINE_COLORS.length];
}

/** 책등 키 — 선반 높이의 80~98%(시안 `80+r*18`). 제목으로 고정 */
export function spineHeightPercent(title: string): number {
  return 80 + (hash(title, 17) % 19);
}

/**
 * 책등 두께(px) — 시안 `24+r*16(+6, 제목이 8자 넘으면)`. 쪽수를 알면 쪽수에 비례(24~46),
 * 모르면 제목으로 고정한 값. 데스크톱은 1.25배(시안 scale).
 */
export function spineWidthPx(title: string, totalPages: number | null, scale = 1): number {
  let w: number;
  if (totalPages != null && Number.isFinite(totalPages) && totalPages > 0) {
    w = Math.min(40, 24 + totalPages / 40);
  } else {
    w = 24 + (hash(title, 5) % 17);
  }
  if (title.length > 8) w += 6;
  return Math.round(w * scale);
}
