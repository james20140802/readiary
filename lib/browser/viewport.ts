/** 입력칸을 누를 때 자동 확대하는 iOS(iPhone·iPod·iPad, 데스크톱 UA의 iPad 포함)인지 — Android는 아니다 */
export function noFocusZoom(userAgent: string): boolean {
  if (/Android/i.test(userAgent)) return false;
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent);
}
