/**
 * 책등(spine) 치수 — 시안 04 "책장의 책등 두께는 총 페이지 수에 비례".
 * 화면 전용 순수 함수. 값은 px.
 */

export const SPINE_MIN_WIDTH = 24;
export const SPINE_MAX_WIDTH = 48;
/** 쪽수를 모르는 책은 보통 두께(≈ 300쪽)로 꽂는다 */
export const SPINE_DEFAULT_WIDTH = 30;

/** 총 쪽수 → 책등 두께. 100쪽 ≈ 24px, 300쪽 ≈ 30px, 600쪽 ≈ 40px, 900쪽 이상은 48px. */
export function spineWidth(totalPages: number | null | undefined): number {
  if (totalPages == null || !Number.isFinite(totalPages) || totalPages <= 0) {
    return SPINE_DEFAULT_WIDTH;
  }
  const raw = Math.round(20 + totalPages / 30);
  return Math.min(SPINE_MAX_WIDTH, Math.max(SPINE_MIN_WIDTH, raw));
}

/** 선반 한 칸의 높이 — 가장 큰 책 기준. 책등은 이 안에서 바닥 정렬. */
export const SHELF_SLOT_HEIGHT = 176;
export const SPINE_HEIGHTS = [176, 164, 152] as const;

/**
 * 책마다 키가 조금씩 다르다 — 제목 문자열로 결정되는 고정값이라
 * 같은 책은 언제 봐도 같은 키다(렌더마다 흔들리지 않음).
 */
export function spineHeight(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return SPINE_HEIGHTS[Math.abs(hash) % SPINE_HEIGHTS.length];
}
