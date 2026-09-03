import { format, parseISO, subDays } from 'date-fns';

export interface RecallCandidate {
  id: string;
  date: string; // yyyy-MM-dd
}

/**
 * 7일 컷오프 — 이 날짜(포함) 이전 기록만 2단계(시드 무작위) 후보가 된다.
 * fetchRecallEntry의 SQL 폴백 경로도 같은 컷오프를 써야 selectRecall과 후보 집합이 일치한다.
 */
export function recallCutoffDate(todayKst: string): string {
  return format(subDays(parseISO(todayKst), 7), 'yyyy-MM-dd');
}

/**
 * seedKey로부터 [0, length) 범위의 결정적 인덱스를 뽑는다 — 같은 시드는 같은 인덱스.
 * fetchRecallEntry가 DB에서 count만 받아와도 selectRecall과 동일한 행을 고를 수 있도록 공유.
 */
export function seededIndex(length: number, seedKey: string): number {
  let seed = 0;
  for (const ch of seedKey) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  return seed % length;
}

/**
 * 회상 카드 선택 규칙 (스펙 §5):
 * 1) 같은 월-일의 과거 기록 우선 — 여러 해가 있으면 가장 오래된 해.
 * 2) 없으면 7일 이상 지난 기록 중 시드 기반 결정적 무작위(같은 날엔 같은 카드).
 *    (원래 30일 — 초기 사용자에게 너무 오래 숨겨져 2026-08-31 사용자 결정으로 완화)
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

  const cutoff = recallCutoffDate(todayKst);
  const old = candidates.filter((c) => c.date <= cutoff);
  if (old.length === 0) return null;

  return old[seededIndex(old.length, seedKey)];
}
