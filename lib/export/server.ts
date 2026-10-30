import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/lib/supabase/fetchAllRows';
import type { Database } from '@/types/supabase';
import type { ExportBook, ExportEntry, ExportReflection } from './recordMarkdown';

type Client = SupabaseClient<Database>;

/** 꺼낸 기록은 개인 데이터 — 공유 캐시·브라우저 캐시에 남기지 않는다 */
export const exportHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
};

const ENTRY_COLUMNS = 'id,date,created_at,quote,note,from_page,to_page,user_book_id';

interface EntryRow {
  id: string;
  date: string;
  created_at: string | null;
  quote: string | null;
  note: string | null;
  from_page: number | null;
  to_page: number | null;
  user_book_id: string;
}

interface BookInfo {
  title: string | null;
  author: string | null;
}

const toEntry = (row: EntryRow, reflections: ExportReflection[]): ExportEntry => ({
  id: row.id,
  date: row.date,
  createdAt: row.created_at ?? row.date,
  quote: row.quote,
  note: row.note,
  fromPage: row.from_page,
  toPage: row.to_page,
  reflections,
});

/** 덧붙인 생각 전부 — 화면은 페이지 단위로 읽지만 꺼내기는 한 번에 필요하다. RLS가 읽기 범위를 정한다 */
export async function loadReflections(
  supabase: Client,
  entryIds: string[]
): Promise<Map<string, ExportReflection[]>> {
  const byEntry = new Map<string, ExportReflection[]>();
  for (let i = 0; i < entryIds.length; i += 100) {
    const chunk = entryIds.slice(i, i + 100);
    const { rows, error } = await fetchAllRows((from, to) =>
      supabase
        .from('entry_reflections')
        .select('id,entry_id,body,created_at')
        .in('entry_id', chunk)
        .order('created_at')
        .order('id')
        .range(from, to)
    );
    if (error) throw error;
    for (const row of rows) {
      const list = byEntry.get(row.entry_id) ?? [];
      list.push({ body: row.body, createdAt: row.created_at });
      byEntry.set(row.entry_id, list);
    }
  }
  return byEntry;
}

async function withReflections(
  supabase: Client,
  rows: EntryRow[],
  includeReflections: boolean
): Promise<ExportEntry[]> {
  const reflections = includeReflections
    ? await loadReflections(
        supabase,
        rows.map((r) => r.id)
      )
    : new Map<string, ExportReflection[]>();
  return rows.map((row) => toEntry(row, reflections.get(row.id) ?? []));
}

/** 내 책 한 권. 내 책이 아니거나 없으면 null */
export async function loadBookExport(
  supabase: Client,
  userId: string,
  userBookId: string,
  includeReflections: boolean
): Promise<ExportBook | null> {
  const { data: userBook, error } = await supabase
    .from('user_books')
    .select('id,is_finished,books(title,author)')
    .eq('id', userBookId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!userBook) return null;

  const { rows, error: entriesError } = await fetchAllRows<EntryRow>((from, to) =>
    supabase
      .from('entries')
      .select(ENTRY_COLUMNS)
      .eq('user_book_id', userBookId)
      .order('date')
      .order('created_at')
      .order('id')
      .range(from, to)
  );
  if (entriesError) throw entriesError;

  const book = userBook.books as unknown as BookInfo | null;
  return {
    userBookId,
    title: book?.title ?? '(제목 없음)',
    author: book?.author ?? null,
    isFinished: userBook.is_finished === true,
    entries: await withReflections(supabase, rows, includeReflections),
  };
}

/** 'YYYY-MM' → 그달 1일과 다음 달 1일 */
function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { start: `${month}-01`, end: `${next}-01` };
}

interface MonthEntryRow extends EntryRow {
  user_books: { user_id: string; is_finished: boolean | null; books: BookInfo | null };
}

/** 내 한 달 — 기록 날짜가 그달인 기록을 user_book별로 묶는다(묶음 순서는 마크다운 함수가 정한다) */
export async function loadMonthExport(
  supabase: Client,
  userId: string,
  month: string,
  includeReflections: boolean
): Promise<ExportBook[]> {
  const { start, end } = monthRange(month);
  const { rows, error } = await fetchAllRows<MonthEntryRow>(
    (from, to) =>
      supabase
        .from('entries')
        .select(`${ENTRY_COLUMNS},user_books!inner(user_id,is_finished,books(title,author))`)
        .eq('user_books.user_id', userId)
        .gte('date', start)
        .lt('date', end)
        .order('date')
        .order('created_at')
        .order('id')
        .range(from, to) as unknown as PromiseLike<{
        data: MonthEntryRow[] | null;
        error: null;
      }>
  );
  if (error) throw error;

  const entries = await withReflections(supabase, rows, includeReflections);
  const books = new Map<string, ExportBook>();
  rows.forEach((row, i) => {
    let book = books.get(row.user_book_id);
    if (!book) {
      book = {
        userBookId: row.user_book_id,
        title: row.user_books.books?.title ?? '(제목 없음)',
        author: row.user_books.books?.author ?? null,
        isFinished: row.user_books.is_finished === true,
        entries: [],
      };
      books.set(row.user_book_id, book);
    }
    book.entries.push(entries[i]);
  });
  return [...books.values()];
}
