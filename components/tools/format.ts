/**
 * 도구 화면(찾기·이번 주의 기록)의 작은 표기들. 날짜는 'YYYY-MM-DD' 문자열로만 다뤄
 * 서버·기기 시간대에 흔들리지 않게 한다.
 */

function parts(date: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** 기록 줄 왼쪽 날짜 칸 — 올해면 '9.29', 다른 해면 '25.12.3' */
export function shortEntryDate(date: string, today: string): string {
  const d = parts(date);
  if (!d) return date;
  const t = parts(today);
  const [y, m, day] = d;
  if (t && t[0] === y) return `${m}.${day}`;
  return `${String(y).slice(2)}.${m}.${day}`;
}

/** 쪽 표기 — 쪽은 선택 정보라 없으면 null */
export function pageLabel(from: number | null, to: number | null): string | null {
  if (from == null) return null;
  if (to == null || to === from) return `p.${from}`;
  return `p.${from}–${to}`;
}

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/** 날짜 묶음 머리 — '10월 21일 수요일' */
export function dayLabel(date: string): string {
  const d = parts(date);
  if (!d) return date;
  const [y, m, day] = d;
  // UTC 자정으로 만들어 요일만 읽는다 — 시간대가 끼어들지 않는다
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return `${m}월 ${day}일 ${weekday}`;
}

const NATIVE = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];

/** '한 권', '두 개' — 열까지는 고유어 수, 그 위는 숫자 */
function count(n: number, unit: string): string {
  return n <= 10 ? `${NATIVE[n]} ${unit}` : `${n}${unit}`;
}

/** 이번 주 요약 한 줄 — 몇 권에서 문장·생각을 몇 개 남겼는지 */
export function summarizeWeek(
  rows: { title: string | null; quote: string | null; note: string | null }[]
): string {
  const books = new Set(rows.map((r) => r.title ?? '')).size;
  const quotes = rows.filter((r) => r.quote).length;
  const notes = rows.filter((r) => r.note).length;
  const what =
    quotes && notes
      ? `문장 ${count(quotes, '개')}와 생각 ${count(notes, '개')}를`
      : quotes
        ? `문장 ${count(quotes, '개')}를`
        : notes
          ? `생각 ${count(notes, '개')}를`
          : `기록 ${count(rows.length, '개')}를`;
  return `이번 주엔 ${count(books, '권')}에서 ${what} 남겼어요.`;
}
