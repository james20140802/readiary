/**
 * 펼친 책의 입체 — 쪽 두께와 붙인 사진의 기울기.
 * 숫자는 전부 px·deg 단위, 렌더 쪽에서 그대로 쓴다.
 */

/** 한쪽에 쌓이는 종이 두께의 상한(px) */
export const STACK_MAX = 28;
/** 쪽수를 모를 때 양쪽 합친 두께 */
export const STACK_DEFAULT = 12;

const clamp = (min: number, max: number, v: number) => Math.min(max, Math.max(min, v));

/**
 * 읽은 만큼 왼쪽에, 남은 만큼 오른쪽에 종이가 쌓인다.
 * 전체 두께는 총 쪽수 비례(6 + 쪽수/40, 8–28px — 1px이 종이 한 장), 완독이면 전부 왼쪽.
 */
export function pageStacks(
  totalPages: number | null,
  lastReadPage: number | null,
  isFinished: boolean
): { left: number; right: number } {
  const total =
    totalPages == null || !Number.isFinite(totalPages) || totalPages <= 0
      ? STACK_DEFAULT
      : clamp(8, STACK_MAX, Math.round(6 + totalPages / 40));
  let ratio: number;
  if (isFinished) ratio = 1;
  else if (totalPages != null && totalPages > 0)
    ratio = clamp(0, 1, (lastReadPage ?? 0) / totalPages);
  else ratio = lastReadPage != null && lastReadPage > 0 ? 0.3 : 0;
  const left = Math.round(ratio * total);
  return { left, right: total - left };
}

/**
 * 종이 단면을 box-shadow 줄로 그린다 — 1px마다 옅은 선과 종이색이 번갈아 쌓인다.
 * dir -1은 왼쪽(읽은 쪽), 1은 오른쪽(남은 쪽). 아래로 살짝 부채꼴.
 */
export function pageStackShadow(px: number, dir: -1 | 1): string {
  if (px <= 0) return 'none';
  const lines: string[] = [];
  for (let i = 1; i <= px; i += 1) {
    const color = i % 2 === 1 ? 'rgb(var(--ink) / 0.2)' : 'rgb(var(--card))';
    lines.push(`${dir * i}px ${Math.round(i * 0.3 * 10) / 10}px 0 0 ${color}`);
  }
  return lines.join(', ');
}

/** 붙인 사진의 기울기(deg) — id로 정해지는 ±2.7°, 0은 없다 */
export function photoTilt(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const step = (Math.abs(hash) % 7) - 3; // -3..3
  return step === 0 ? 1.2 : step * 0.9;
}
