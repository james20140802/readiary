import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { POST } from '../route';
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const id = '10000000-0000-4000-8000-000000000001';
const rpc = vi.fn();
const getUser = vi.fn();
const request = (body: unknown) =>
  new Request('http://localhost/api/books/new', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  rpc.mockReset().mockResolvedValue({
    data: { book_id: 'book', user_book_id: 'shelf', replayed: false },
    error: null,
  });
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getUser }, rpc } as never);
});
describe('atomic book registration API', () => {
  it('normalizes optional fields and passes no caller-supplied owner to the RPC', async () => {
    const response = await POST(
      request({
        title: ' 제목 ',
        author: ' 작가 ',
        isbn: '',
        client_request_id: id,
        user_id: 'intruder',
      })
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('register_book_idempotently', {
      p_request_id: id,
      p_title: '제목',
      p_author: '작가',
      p_total_pages: null,
      p_isbn: null,
      p_cover_url: null,
    });
    expect(await response.json()).toEqual({
      success: true,
      book_id: 'book',
      user_book_id: 'shelf',
      replayed: false,
    });
  });
  it('preserves replay results', async () => {
    rpc.mockResolvedValue({
      data: { book_id: 'book', user_book_id: 'shelf', replayed: true },
      error: null,
    });
    expect(
      (await (await POST(request({ title: 't', author: 'a', client_request_id: id }))).json())
        .replayed
    ).toBe(true);
  });
  it('uses a fresh UUID for legacy clients', async () => {
    await POST(request({ title: 't', author: 'a' }));
    expect(rpc.mock.calls[0][1].p_request_id).toMatch(/^[0-9a-f-]{36}$/);
  });
  it.each(['bad', null, 123])('rejects invalid request ID %s', async (client_request_id) => {
    expect((await POST(request({ title: 't', author: 'a', client_request_id }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('returns conflict for changed payload', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PT409' } });
    expect((await POST(request({ title: 't', author: 'a', client_request_id: id }))).status).toBe(
      409
    );
  });
  it('does not report success on transactional failure', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '23503' } });
    expect((await POST(request({ title: 't', author: 'a' }))).status).toBe(500);
  });
  it('requires authentication', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request({ title: 't', author: 'a' }))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });
});
