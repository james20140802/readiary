/** 기록 한 장 견본의 상태 — 서버 페이지와 클라이언트 견본이 함께 쓴다 */
export type EntryLabVariant =
  | 'full'
  | 'quote'
  | 'note'
  | 'empty'
  | 'private'
  | 'friend'
  | 'loading'
  | 'error';

export const VARIANTS: { key: EntryLabVariant; label: string }[] = [
  { key: 'full', label: '문장·생각·덧붙인 생각 셋' },
  { key: 'quote', label: '문장만, 덧붙인 생각 하나' },
  { key: 'note', label: '생각만' },
  { key: 'empty', label: '덧붙인 생각 없음' },
  { key: 'private', label: '나만 보기' },
  { key: 'friend', label: '친구의 기록' },
  { key: 'loading', label: '덧붙인 생각 불러오는 중' },
  { key: 'error', label: '덧붙인 생각 못 불러옴' },
];

export function pickVariant(v: string | undefined): EntryLabVariant {
  return VARIANTS.find((x) => x.key === v)?.key ?? 'full';
}
