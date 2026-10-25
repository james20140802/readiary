/**
 * 나 화면 '언제 읽었나' — 달마다 기록을 남긴 요일 × 시간대.
 * 개수는 DB 함수 reading_rhythm이 센다(supabase/migrations/20261025120000_reading_rhythm.sql).
 * 여기서는 그 칸들을 달별 판으로 펼치고, 겹쳤을 때 가장 진한 칸을 고른다.
 */

/** 보여 주는 달 수 */
export const RHYTHM_MONTHS = 3;
export const RHYTHM_DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
/** 5–11시 아침, 11–17시 낮, 17–21시 저녁, 그 밖은 밤 */
export const RHYTHM_TIMES = ['아침', '낮', '저녁', '밤'] as const;

/** reading_rhythm 한 줄 — month 'YYYY-MM'(KST), day 0=월, slot 0=아침 */
export interface RhythmCount {
  month: string;
  day: number;
  slot: number;
  count: number;
}

export interface RhythmMonth {
  /** 'YYYY-MM' */
  key: string;
  /** '10월' */
  label: string;
  /** cells[day * 4 + time] = 그 칸에 남긴 기록 수 */
  cells: number[];
  total: number;
}

/** 오늘(KST 'YYYY-MM-DD')이 속한 달부터 거슬러 count개 달의 키 — 오래된 달이 앞 */
export function rhythmMonthKeys(todayKst: string, count: number): string[] {
  const [y, m] = todayKst.split('-').map(Number);
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export function buildRhythm(
  counts: RhythmCount[],
  todayKst: string,
  count = RHYTHM_MONTHS
): RhythmMonth[] {
  const months = rhythmMonthKeys(todayKst, count).map((key) => ({
    key,
    label: `${Number(key.slice(5))}월`,
    cells: Array<number>(RHYTHM_DAYS.length * RHYTHM_TIMES.length).fill(0),
    total: 0,
  }));
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const row of counts) {
    const month = byKey.get(row.month);
    const inRange =
      Number.isInteger(row.day) &&
      row.day >= 0 &&
      row.day < RHYTHM_DAYS.length &&
      Number.isInteger(row.slot) &&
      row.slot >= 0 &&
      row.slot < RHYTHM_TIMES.length;
    if (!month || !inRange || !(row.count > 0)) continue;
    month.cells[row.day * RHYTHM_TIMES.length + row.slot] += row.count;
    month.total += row.count;
  }
  return months;
}

/**
 * 고른 달들을 겹쳤을 때 가장 진한 칸. 두 달 이상에 걸쳐 나타난 칸만 '습관'으로 본다.
 * 더 많은 달에 나타난 칸이 먼저, 같으면 기록이 많은 칸. 그런 칸이 없으면 null.
 */
export function strongestCell(months: RhythmMonth[]): { day: number; time: number } | null {
  if (months.length < 2) return null;
  let best: { index: number; months: number; sum: number } | null = null;
  const size = RHYTHM_DAYS.length * RHYTHM_TIMES.length;
  for (let i = 0; i < size; i++) {
    const present = months.filter((m) => m.cells[i] > 0).length;
    const sum = months.reduce((acc, m) => acc + m.cells[i], 0);
    if (present < 2) continue;
    if (!best || present > best.months || (present === best.months && sum > best.sum)) {
      best = { index: i, months: present, sum };
    }
  }
  return (
    best && {
      day: Math.floor(best.index / RHYTHM_TIMES.length),
      time: best.index % RHYTHM_TIMES.length,
    }
  );
}
