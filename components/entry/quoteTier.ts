export type QuoteTier = 'lg' | 'md' | 'sm' | 'xs';

/** 가장 좁은 모바일 간지의 큰 글자 기준으로 어림한 한 줄의 글자 수 */
const CHARS_PER_LINE = 14;

/**
 * 문장의 글자 크기 단계 — 길수록 작게 써서 간지와 피드 글이 일정한 높이 안에 들게 한다.
 * 화면 폭을 재지 않고 글만으로 정해 서버와 클라이언트가 같은 크기로 그린다.
 * 줄바꿈을 살려 보여 주므로 짧은 시도 줄마다 한 줄을 차지하는 것으로 센다.
 */
export function quoteTier(text: string): QuoteTier {
  const lines = text
    .trim()
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil([...line].length / CHARS_PER_LINE)), 0);
  if (lines <= 5) return 'lg';
  if (lines <= 9) return 'md';
  if (lines <= 13) return 'sm';
  return 'xs';
}
