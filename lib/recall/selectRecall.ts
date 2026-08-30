import { format, parseISO, subDays } from 'date-fns';

export interface RecallCandidate {
  id: string;
  date: string; // yyyy-MM-dd
}

/**
 * 회상 카드 선택 규칙 (스펙 §5):
 * 1) 같은 월-일의 과거 기록 우선 — 여러 해가 있으면 가장 오래된 해.
 * 2) 없으면 30일 이상 지난 기록 중 시드 기반 결정적 무작위(같은 날엔 같은 카드).
 * 3) 그것도 없으면 null — 기록이 적은 신규 사용자에게는 카드를 숨긴다.
 */
export function selectRecall(
  candidates: RecallCandidate[],
  todayKst: string,
  seedKey: string
): RecallCandidate | null {
  const monthDay = todayKst.slice(5); // 'MM-dd'
  const sameDay = candidates
    .filter((c) => c.date < todayKst && c.date.slice(5) === monthDay)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sameDay.length > 0) return sameDay[0];

  const cutoff = format(subDays(parseISO(todayKst), 30), 'yyyy-MM-dd');
  const old = candidates.filter((c) => c.date <= cutoff);
  if (old.length === 0) return null;

  let seed = 0;
  for (const ch of seedKey) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return old[seed % old.length];
}
