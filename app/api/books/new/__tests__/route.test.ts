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
 * books: select('id').eq('isbn', …).maybeSingle() / insert(…).select('id').single()
 * user_books: insert(…)
 */
function buildSupabaseStub({
  user = { id: 'user-1' } as { id: string } | null,
  existingBook = null as Row,
  existingError = null as Err,
  insertedBook = { id: 'book-new' } as Row,
  insertError = null as Err,
  userBookError = null as Err,
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: existingBook, error: existingError });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const booksSelect = vi.fn().mockReturnValue({ eq });

  const single = vi.fn().mockResolvedValue({ data: insertedBook, error: insertError });
  const insertSelect = vi.fn().mockReturnValue({ single });
  const booksInsert = vi.fn().mockReturnValue({ select: insertSelect });
  const booksUpsert = vi.fn();

  const userBooksInsert = vi.fn().mockResolvedValue({ error: userBookError });

  const from = vi.fn((table: string) => {
    if (table === 'books') return { select: booksSelect, insert: booksInsert, upsert: booksUpsert };
    if (table === 'user_books') return { insert: userBooksInsert };
    throw new Error(`unexpected table ${table}`);
  });
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: null });

  return { stub: { auth: { getUser }, from }, booksInsert, booksUpsert, userBooksInsert, eq };
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

describe('POST /api/books/new', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('같은 ISBN의 책이 이미 있으면 그 행을 그대로 쓰고 books를 쓰지 않는다', async () => {
    const { stub, booksInsert, booksUpsert, userBooksInsert, eq } = buildSupabaseStub({
      existingBook: { id: 'book-existing' },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(200);
    expect(eq).toHaveBeenCalledWith('isbn', validBody.isbn);
    expect(booksInsert).not.toHaveBeenCalled();
    expect(booksUpsert).not.toHaveBeenCalled();
    expect(userBooksInsert).toHaveBeenCalledWith({ user_id: 'user-1', book_id: 'book-existing' });
  });

  it('같은 ISBN의 책이 없으면 insert하고 새 id로 user_books를 연결한다', async () => {
    const { stub, booksInsert, booksUpsert, userBooksInsert } = buildSupabaseStub({
      existingBook: null,
      insertedBook: { id: 'book-new' },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(200);
    expect(booksInsert).toHaveBeenCalledWith({
      title: validBody.title,
      author: validBody.author,
      total_pages: validBody.total_pages,
      isbn: validBody.isbn,
      cover_url: validBody.cover_url,
    });
    expect(booksUpsert).not.toHaveBeenCalled();
    expect(userBooksInsert).toHaveBeenCalledWith({ user_id: 'user-1', book_id: 'book-new' });
  });

  it('ISBN이 없으면 조회 없이 바로 insert한다(수동 등록)', async () => {
    const { stub, booksInsert, eq } = buildSupabaseStub({ insertedBook: { id: 'book-manual' } });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest({ title: '수동', author: '작가' }));

    expect(res.status).toBe(200);
    expect(eq).not.toHaveBeenCalled();
    expect(booksInsert).toHaveBeenCalledWith({
      title: '수동',
      author: '작가',
      total_pages: null,
      isbn: undefined,
      cover_url: undefined,
    });
  });

  it('ISBN 조회가 실패하면 500을 반환하고 insert하지 않는다', async () => {
    const { stub, booksInsert } = buildSupabaseStub({ existingError: { message: 'boom' } });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));

    expect(res.status).toBe(500);
    expect(booksInsert).not.toHaveBeenCalled();
  });

  it('books insert가 실패하면 500을 반환하고 user_books를 만들지 않는다', async () => {
    const { stub, userBooksInsert } = buildSupabaseStub({
      insertedBook: null,
      insertError: { message: 'denied' },
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
