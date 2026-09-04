import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { POST } from '../route';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

type Row = Record<string, unknown> | null;
type Err = { message: string } | null;

/**
 * 라우트가 쓰는 체인만 흉내 낸다.
 * ISBN 있음: books.upsert(row, { onConflict: 'isbn', ignoreDuplicates: true }).select('id').maybeSingle()
 *            → 충돌(행 없음)이면 books.select('id').eq('isbn', …).maybeSingle()
 * ISBN 없음: books.insert(row).select('id').single()
 * 그다음 user_books.insert(…)
 */
function buildSupabaseStub({
  user = { id: 'user-1' } as { id: string } | null,
  upserted = { id: 'book-new' } as Row,
  upsertError = null as Err,
  existing = null as Row,
  existingError = null as Err,
  inserted = { id: 'book-manual' } as Row,
  insertError = null as Err,
  userBookError = null as Err,
} = {}) {
  const upsertMaybeSingle = vi.fn().mockResolvedValue({ data: upserted, error: upsertError });
  const upsertSelect = vi.fn().mockReturnValue({ maybeSingle: upsertMaybeSingle });
  const booksUpsert = vi.fn().mockReturnValue({ select: upsertSelect });

  const lookupMaybeSingle = vi.fn().mockResolvedValue({ data: existing, error: existingError });
  const eq = vi.fn().mockReturnValue({ maybeSingle: lookupMaybeSingle });
  const booksSelect = vi.fn().mockReturnValue({ eq });

  const single = vi.fn().mockResolvedValue({ data: inserted, error: insertError });
  const insertSelect = vi.fn().mockReturnValue({ single });
  const booksInsert = vi.fn().mockReturnValue({ select: insertSelect });

  const userBooksInsert = vi.fn().mockResolvedValue({ error: userBookError });

  const from = vi.fn((table: string) => {
    if (table === 'books') return { select: booksSelect, insert: booksInsert, upsert: booksUpsert };
    if (table === 'user_books') return { insert: userBooksInsert };
    throw new Error(`unexpected table ${table}`);
  });
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });

  return { stub: { auth: { getUser }, from }, booksUpsert, booksInsert, userBooksInsert, eq };
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/books/new', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  title: '소설',
  author: '작가',
  total_pages: 300,
  isbn: '9780000000001',
  cover_url: 'https://example.test/cover.jpg',
};

const expectedRow = {
  title: validBody.title,
  author: validBody.author,
  total_pages: validBody.total_pages,
  isbn: validBody.isbn,
  cover_url: validBody.cover_url,
};

describe('POST /api/books/new', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ISBN이 있으면 ON CONFLICT DO NOTHING으로 넣고(UPDATE 없음) 새 id로 user_books를 연결한다', async () => {
    const { stub, booksUpsert, booksInsert, userBooksInsert, eq } = buildSupabaseStub({
      upserted: { id: 'book-new' },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(200);
    expect(booksUpsert).toHaveBeenCalledWith(expectedRow, {
      onConflict: 'isbn',
      ignoreDuplicates: true,
    });
    expect(eq).not.toHaveBeenCalled();
    expect(booksInsert).not.toHaveBeenCalled();
    expect(userBooksInsert).toHaveBeenCalledWith({ user_id: 'user-1', book_id: 'book-new' });
  });

  it('같은 ISBN의 책이 이미 있으면(충돌로 행 없음) 기존 id를 조회해 그대로 쓴다', async () => {
    const { stub, booksInsert, userBooksInsert, eq } = buildSupabaseStub({
      upserted: null,
      existing: { id: 'book-existing' },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith('isbn', validBody.isbn);
    expect(booksInsert).not.toHaveBeenCalled();
    expect(userBooksInsert).toHaveBeenCalledWith({ user_id: 'user-1', book_id: 'book-existing' });
  });

  it('ISBN이 없으면 조회 없이 바로 insert한다(수동 등록)', async () => {
    const { stub, booksUpsert, booksInsert, eq, userBooksInsert } = buildSupabaseStub({
      inserted: { id: 'book-manual' },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest({ title: '수동', author: '작가' }));

    expect(res.status).toBe(200);
    expect(booksUpsert).not.toHaveBeenCalled();
    expect(eq).not.toHaveBeenCalled();
    expect(booksInsert).toHaveBeenCalledWith({
      title: '수동',
      author: '작가',
      total_pages: null,
      isbn: undefined,
      cover_url: undefined,
    });
    expect(userBooksInsert).toHaveBeenCalledWith({ user_id: 'user-1', book_id: 'book-manual' });
  });

  it('충돌 후 기존 행 조회가 실패하면 500을 반환하고 user_books를 만들지 않는다', async () => {
    const { stub, userBooksInsert } = buildSupabaseStub({
      upserted: null,
      existing: null,
      existingError: { message: 'boom' },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(500);
    expect(userBooksInsert).not.toHaveBeenCalled();
  });

  it('upsert가 실패하면 500을 반환하고 user_books를 만들지 않는다', async () => {
    const { stub, userBooksInsert } = buildSupabaseStub({
      upserted: null,
      upsertError: { message: 'denied' },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(500);
    expect(userBooksInsert).not.toHaveBeenCalled();
  });

  it('비로그인이면 401', async () => {
    const { stub } = buildSupabaseStub({ user: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(401);
  });

  it('제목이나 저자가 없으면 400', async () => {
    const { stub } = buildSupabaseStub();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest({ title: '제목만' }));

    expect(res.status).toBe(400);
  });
});
