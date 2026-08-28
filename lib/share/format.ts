/** 'YYYY-MM-DD' → '2026년 8월 28일'. 타임존 파싱 없이 문자열 분해(KST 안전). */
export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return `${y}년 ${m}월 ${d}일`;
}
