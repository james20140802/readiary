import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { DELETE } from '../route';
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const id = '10000000-0000-4000-8000-000000000001';
const getUser = vi.fn();
const from = vi.fn();
const remove = vi.fn();
const eq = vi.fn();
let result: { error: null | { code: string } };
const request = (userBookId = id) =>
  DELETE(new Request(`http://localhost/api/books/${userBookId}`, { method: 'DELETE' }), {
    params: Promise.resolve({ user_book_id: userBookId }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  result = { error: null };
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  eq.mockImplementation((column: string) =>
    column === 'user_id' ? Promise.resolve(result) : { eq }
  );
  remove.mockReturnValue({ eq });
  from.mockReturnValue({ delete: remove });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getUser }, from } as never);
});
describe('book deletion', () => {
  it('deletes only the authenticated owner registration, never catalog or children separately', async () => {
    const response = await request();
    expect(response.status).toBe(204);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(from.mock.calls).toEqual([['user_books']]);
    expect(eq.mock.calls).toEqual([
      ['id', id],
      ['user_id', 'owner'],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
  it('accepts repeated deletion after a lost response without changing its target', async () => {
    expect((await request()).status).toBe(204);
    expect((await request()).status).toBe(204);
    expect(eq.mock.calls.filter(([column]) => column === 'id')).toEqual([
      ['id', id],
      ['id', id],
    ]);
  });
  it.each([null, { id: 'owner' }])('rejects missing or invalid authentication', async (user) => {
    getUser.mockResolvedValue({ data: { user }, error: user ? { message: 'expired' } : null });
    const response = await request();
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'session_expired' });
    expect(from).not.toHaveBeenCalled();
  });
  it('rejects malformed registration IDs', async () => {
    expect((await request('bad')).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
  it('does not report success or invalidate pages on a database failure', async () => {
    result = { error: { code: '23503' } };
    expect((await request()).status).toBe(500);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
