import { countLines, type QuoteTier } from '@/components/entry/quoteTier';

/**
 * 모바일 회상 간지 문장의 글자 단계 — 큰 글자부터 차례로, 그 단계의 줄 수 안에 드는 가장 큰 글자를 고른다.
 * 어느 단계든 문장 높이가 110~120px 안팎이라, 긴 문장은 작아지는 대신 더 많이 보이고 간지 키는 고르다.
 * 줄당 글자 수는 좁은 폰(390pt)의 간지 안쪽 폭(약 310px)에서 부리 한글 폭으로 어림했다.
 * 간지는 줄바꿈을 이어 쓰므로 줄바꿈은 한 칸 띄움으로 센다.
 */
const STEPS: { tier: QuoteTier; charsPerLine: number; lines: number }[] = [
  { tier: 'lg', charsPerLine: 13, lines: 3 },
  { tier: 'md', charsPerLine: 15, lines: 4 },
  { tier: 'sm', charsPerLine: 17, lines: 4 },
];

export function recallTier(text: string): QuoteTier {
  const flat = text.trim().replace(/\s*\n\s*/g, ' ');
  for (const step of STEPS) {
    if (countLines(flat, step.charsPerLine) <= step.lines) return step.tier;
  }
  return 'xs';
}
