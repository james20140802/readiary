/**
 * 프로필 책의 치수 — 3D 상자 한 권. 서버·클라이언트 양쪽에서 읽는 순수 상수/함수.
 */

/** 표지 폭·높이(px). 좁은 화면에서도 인덱스가 오른쪽으로 삐져나올 자리를 남긴 값 */
export const BOOK_W = 300;
export const BOOK_H = 430;

/** 두께 — 완독 권수에 비례한다. 한 권도 없어도 얇은 책 한 권은 된다 */
export const THICKNESS_MIN = 12;
export const THICKNESS_MAX = 52;
export const THICKNESS_PER_BOOK = 3;

export function spineThickness(finishedBooks: number): number {
  const n = Math.max(0, Math.floor(finishedBooks));
  return Math.min(THICKNESS_MAX, THICKNESS_MIN + n * THICKNESS_PER_BOOK);
}

/** "2026년 4월" → "2026.04" — 인덱스 탭에 찍는 짧은 라벨 */
export function indexLabel(monthLabel: string): string {
  const m = monthLabel.match(/^(\d{4})년\s*(\d{1,2})월$/);
  if (!m) return monthLabel;
  return `${m[1]}.${m[2].padStart(2, '0')}`;
}

/** 롱 인덱스 필름의 반투명 색 — 종이 위에 겹쳐 보이도록 알파를 낮게 */
export const INDEX_TINTS = [
  'rgb(228 118 128 / 0.55)',
  'rgb(238 158 96 / 0.55)',
  'rgb(226 196 72 / 0.6)',
  'rgb(116 188 138 / 0.55)',
  'rgb(112 168 222 / 0.55)',
  'rgb(160 140 212 / 0.55)',
];

/** 책갈피 종이색 — 표지 사진이 없을 때, 책 id로 정해지는 은은한 색 */
export const BOOKMARK_TINTS = [
  'rgb(214 196 170)',
  'rgb(176 196 184)',
  'rgb(196 184 206)',
  'rgb(224 190 168)',
  'rgb(170 190 210)',
];

export function bookmarkTint(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return BOOKMARK_TINTS[Math.abs(hash) % BOOKMARK_TINTS.length];
}

/** 책갈피 치수 — 1:3.4의 긴 카드. 꽂혀 있을 때 EXPOSED만큼이 책 위로 삐져나온다 */
export const BOOKMARK_W = 54;
export const BOOKMARK_H = 184;
export const BOOKMARK_EXPOSED = 84;
/** 책갈피를 들었을 때 종이 위로 올라가는 거리 — 아랫부분은 여전히 펼친 면 위에 얹혀 있다 */
export const BOOKMARK_LIFT = 48;

/** 인덱스 탭 치수 — 앞마구리 밖으로 (INDEX_W - INDEX_OVERLAP)만큼 나오고, OVERLAP만큼은 종이 위에 붙어 있다.
 *  덮으면 그 부분이 책 안에 숨고, 펼치면 오른쪽 면 위로 이어져 보인다 */
export const INDEX_W = 76;
export const INDEX_H = 20;
export const INDEX_OVERLAP = 28;
export const INDEX_GAP = 8;

/** 발췌집 공책 더미 — 한 더미에 이만큼까지 쌓이고, 넘치면 옆 더미로 */
export const EXCERPT_STACK_MAX = 6;
/** 공책 한 권의 책등 높이·기본 폭(px) */
export const NOTEBOOK_H = 46;
export const NOTEBOOK_W = 232;
/** 더미 안에서 권마다 조금씩 다른 폭·밀림 — 손으로 쌓은 티 */
export const NOTEBOOK_W_STEP = [0, 22, 8, 30, 14, 4];
export const NOTEBOOK_SHIFT = [0, 14, 6, 22, 2, 12];

/** 공책 표지 색조 — 먹의 농담으로만. 어두운 표지는 종이색 글씨 */
export const NOTEBOOK_TONES: { bg: string; fg: string; border: string }[] = [
  { bg: 'rgb(var(--ink) / 0.88)', fg: 'rgb(var(--paper))', border: 'rgb(var(--ink))' },
  { bg: 'rgb(var(--card))', fg: 'rgb(var(--ink))', border: 'rgb(var(--hairline-strong))' },
  { bg: 'rgb(var(--ink) / 0.62)', fg: 'rgb(var(--paper))', border: 'rgb(var(--ink) / 0.7)' },
  { bg: 'rgb(var(--card-raised))', fg: 'rgb(var(--ink))', border: 'rgb(var(--hairline-strong))' },
  { bg: 'rgb(var(--ink) / 0.76)', fg: 'rgb(var(--paper))', border: 'rgb(var(--ink) / 0.85)' },
  { bg: 'rgb(var(--ink) / 0.1)', fg: 'rgb(var(--ink))', border: 'rgb(var(--ink) / 0.25)' },
];

/** 목록을 더미로 나눈다 — 앞에서부터 max권씩. 첫 더미가 가장 최근 */
export function stackExcerpts<T>(items: T[], max = EXCERPT_STACK_MAX): T[][] {
  const size = Math.max(1, Math.floor(max));
  const stacks: T[][] = [];
  for (let i = 0; i < items.length; i += size) stacks.push(items.slice(i, i + size));
  return stacks;
}
