// iOS Safari의 캔버스 픽셀 상한(약 16.7M px) — 넘으면 캡처가 빈/잘린 이미지가 된다.
// 면적과 별개로 한 변의 길이에도 브라우저별 상한이 있다(낮은 쪽 기준 보수적으로).
const SAFE_CANVAS_AREA = 16_000_000;
const SAFE_CANVAS_DIM = 16_000;

export function exceedsCanvasLimits(width: number, height: number): boolean {
  return width * height > SAFE_CANVAS_AREA || Math.max(width, height) > SAFE_CANVAS_DIM;
}

/** 긴 이미지는 두 상한 아래로 배율을 낮춰 찍는다 */
export function pixelRatioFor(el: HTMLElement): number {
  const { width, height } = el.getBoundingClientRect();
  if (width <= 0 || height <= 0) return 2;
  const maxRatio = Math.min(
    Math.sqrt(SAFE_CANVAS_AREA / (width * height)),
    SAFE_CANVAS_DIM / Math.max(width, height)
  );
  return Math.min(2, Math.max(1, Math.floor(maxRatio * 10) / 10));
}
