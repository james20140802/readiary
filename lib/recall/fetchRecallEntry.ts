import { todayKST } from '@/lib/dates';
import {
  recallCutoffDate,
  seededIndex,
  selectRecall,
  type RecallCandidate,
} from '@/lib/recall/selectRecall';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface RecallEntry {
  id: string;
  date: string;
  quote: string;
  bookTitle: string;
  bookAuthor: string | null;
  yearsAgo: number | null;
}

interface EntryRow {
  id: string;
  date: string;
  quote: string | null;
  user_book_id: string;
}

/** 실제로 존재하는 달력 날짜인지 — 2/29처럼 평년엔 없는 월-일 후보를 걸러낸다 */
function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * 오늘과 월-일이 같은 과거 날짜들 — 사용자의 최초 기록 연도부터 올해 이전까지.
 * PostgREST의 date 컬럼은 LIKE로 텍스트 매칭할 수 없어(타입이 date), 대신
 * 연도별 후보 날짜를 만들어 .in()으로 쓴다. 존재하지 않는 날짜(윤년 2/29 등)는 제외.
 */
function buildSameMonthDayCandidates(todayKst: string, earliestYear: number): string[] {
  const [todayYear, month, day] = todayKst.split('-').map(Number);
  const dates: string[] = [];
  for (let year = earliestYear; year < todayYear; year++) {
    if (!isValidCalendarDate(year, month, day)) continue;
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
}

/**
 * 홈 회상 카드용 기록 선택 — 실패·미로그인·후보 없음은 전부 null (홈이 조용히 숨김).
 * 본인 데이터 전용(비공개 포함) — RLS 하 로그인 사용자 소유 entries만 조회.
 * 문장(quote)이 있는 기록만 후보 — 생각(note)만 적은 기록은 회상에 부르지 않는다.
 *
 * selectRecall과 선택 결과가 항상 같도록, DB에서 먼저 후보를 좁힌다(전량 스캔 없음):
 * 1) 같은 월-일 후보 날짜로 .in() 조회 → selectRecall 1단계와 동일한 승자(가장 오래된 해).
 * 2) 없으면 7일 컷오프 이전 기록 수만 count로 받아 seededIndex로 오프셋을 구하고
 *    .range(idx, idx)로 정확히 그 한 행만 가져온다 — selectRecall 2단계(시드 무작위)와 동일 인덱스.
 */
export async function fetchRecallEntry(): Promise<RecallEntry | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) return null;

  const todayKst = todayKST();
  const seedKey = `${user.id}|${todayKst}`;

  // 같은 월-일 후보 연도 범위를 정하기 위해 최초 기록(문장 있는 것) 연도를 먼저 확인한다.
  const { data: earliestRow, error: earliestError } = await supabase
    .from('entries')
    .select('date, user_books!inner(user_id)')
    .eq('user_books.user_id', user.id)
    .not('quote', 'is', null)
    .lt('date', todayKst)
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (earliestError || !earliestRow) return null;

  const earliestYear = Number(earliestRow.date.slice(0, 4));
  const sameMonthDayDates = buildSameMonthDayCandidates(todayKst, earliestYear);

  let entry: EntryRow | null = null;

  if (sameMonthDayDates.length > 0) {
    const { data: sameDayRows, error: sameDayError } = await supabase
      .from('entries')
      .select('id, date, quote, user_book_id, user_books!inner(user_id)')
      .eq('user_books.user_id', user.id)
      .not('quote', 'is', null)
      .in('date', sameMonthDayDates)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (sameDayError) return null;

    if (sameDayRows && sameDayRows.length > 0) {
      const candidates: RecallCandidate[] = sameDayRows.map((e) => ({ id: e.id, date: e.date }));
      const picked = selectRecall(candidates, todayKst, seedKey);
      entry = picked ? (sameDayRows.find((e) => e.id === picked.id) ?? null) : null;
    }
  }

  // 1단계(같은 월-일)에서 못 골랐으면 2단계 폴백 — count로 후보 수만 받고, 시드로 정한 인덱스 한 행만 가져온다.
  if (!entry) {
    const cutoff = recallCutoffDate(todayKst);

    const { count, error: countError } = await supabase
      .from('entries')
      .select('id, user_books!inner(user_id)', { count: 'exact', head: true })
      .eq('user_books.user_id', user.id)
      .not('quote', 'is', null)
      .lte('date', cutoff);

    if (countError || !count || count === 0) return null;

    const idx = seededIndex(count, seedKey);

    const { data: fallbackRows, error: fallbackError } = await supabase
      .from('entries')
      .select('id, date, quote, user_book_id, user_books!inner(user_id)')
      .eq('user_books.user_id', user.id)
      .not('quote', 'is', null)
      .lte('date', cutoff)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(idx, idx);

    if (fallbackError || !fallbackRows || fallbackRows.length === 0) return null;

    entry = fallbackRows[0];
  }

  if (!entry || !entry.quote) return null;

  const { data: userBook, error: userBookError } = await supabase
    .from('user_books')
    .select('id, books(title, author)')
    .eq('id', entry.user_book_id)
    .maybeSingle();

  if (userBookError || !userBook) return null;

  const bookTitle = userBook.books?.title;
  if (!bookTitle) return null;

  const isSameMonthDay = entry.date.slice(5) === todayKst.slice(5);
  const yearsAgo = isSameMonthDay
    ? Number(todayKst.slice(0, 4)) - Number(entry.date.slice(0, 4))
    : null;

  return {
    id: entry.id,
    date: entry.date,
    quote: entry.quote,
    bookTitle,
    bookAuthor: userBook.books?.author ?? null,
    yearsAgo,
  };
}
