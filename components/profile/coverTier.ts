/**
 * 문장 표지의 글자 크기 단계 — 긴 문장일수록 작게 써서 표지 안에 끝까지 들어가게 한다.
 * '나' 화면과 친구 서재 표지가 같은 기준을 쓴다.
 */
export function coverTier(text: string): 'lg' | 'md' | 'sm' {
  const n = [...text.trim()].length;
  if (n <= 28) return 'lg';
  if (n <= 56) return 'md';
  return 'sm';
}
