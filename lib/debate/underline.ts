// 밑줄 계산 — 화면(펜 긋기)과 API 검증이 함께 쓴다.
// 위치는 코드 포인트 인덱스이고 끝을 포함한다. DB의 char_length·substr와 같은 단위다(이모지도 한 글자).

export interface Range {
  start: number;
  end: number;
}

export const MAX_UNDERLINES = 3;

const EDGE = /[\s.,!?·…'"“”‘’()]/u;
const SPACE = /\s/u;

/** 문자열을 코드 포인트 배열로 */
export function toChars(text: string): string[] {
  return Array.from(text);
}

/** 앞뒤 공백·문장부호를 걷는다. 남는 글자가 없으면 null */
export function trimRange(chars: string[], r: Range): Range | null {
  let { start, end } = r;
  while (start <= end && EDGE.test(chars[start] ?? '')) start++;
  while (end >= start && EDGE.test(chars[end] ?? '')) end--;
  return start <= end ? { start, end } : null;
}

/** i 글자가 든 어절(공백으로 나뉜 덩어리). 끝 문장부호는 뺀다 */
export function wordAt(chars: string[], i: number): Range | null {
  if (i < 0 || i >= chars.length || SPACE.test(chars[i])) return null;
  let start = i;
  let end = i;
  while (start > 0 && !SPACE.test(chars[start - 1])) start--;
  while (end < chars.length - 1 && !SPACE.test(chars[end + 1])) end++;
  return trimRange(chars, { start, end });
}

const overlaps = (a: Range, b: Range) => a.start <= b.end && b.start <= a.end;

export type StrokePlan =
  | { ok: true; ranges: Range[]; merged: number }
  | { ok: false; reason: 'limit' };

/** 새 획을 더한 결과. 걸치거나 품은 밑줄은 하나로 합치고, 개수가 넘치면 막는다 */
export function planStroke(ranges: Range[], stroke: Range, max = MAX_UNDERLINES): StrokePlan {
  const hit = ranges.filter((r) => overlaps(r, stroke));
  const rest = ranges.filter((r) => !overlaps(r, stroke));
  if (rest.length + 1 > max) return { ok: false, reason: 'limit' };
  const merged: Range = {
    start: Math.min(stroke.start, ...hit.map((r) => r.start)),
    end: Math.max(stroke.end, ...hit.map((r) => r.end)),
  };
  return {
    ok: true,
    ranges: [...rest, merged].sort((a, b) => a.start - b.start),
    merged: hit.length,
  };
}

/** 서버로 보낼 수 있는 밑줄인가: 0~3개, 정수, 문장 안, 겹침 없음 */
export function isValidUnderlines(chars: string[], ranges: Range[]): boolean {
  if (ranges.length > MAX_UNDERLINES) return false;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let prevEnd = -1;
  for (const r of sorted) {
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) return false;
    if (r.start < 0 || r.end < r.start || r.end >= chars.length || r.start <= prevEnd) return false;
    prevEnd = r.end;
  }
  return true;
}
