import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ auth: { getUser: mocks.user }, rpc: mocks.rpc }),
}));
import { POST } from '@/app/api/search/route';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: 'owner' } } });
  mocks.rpc.mockResolvedValue({ data: { items: [], next: null }, error: null });
});
const request = (body: unknown) =>
  new Request('http://localhost/api/search', { method: 'POST', body: JSON.stringify(body) });
it('checks authentication before issuing a search and uses the session contract', async () => {
  mocks.user.mockResolvedValue({ data: { user: null } });
  const res = await POST(request({ query: '기억', kind: 'entries' }));
  expect(res.status).toBe(401);
  expect((await res.json()).code).toBe('session_expired');
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('passes validated conditions, never a supplied owner, and disables caching', async () => {
  const res = await POST(request({ query: ' 기억 ', kind: 'entries', userId: 'someone-else' }));
  expect(res.status).toBe(200);
  expect(res.headers.get('Cache-Control')).toContain('no-store');
  expect(mocks.rpc).toHaveBeenCalledWith(
    'search_library',
    expect.objectContaining({ p_query: '기억', p_kind: 'entries' })
  );
  expect(mocks.rpc.mock.calls[0][1]).not.toHaveProperty('userId');
});
it('rejects invalid input before database work', async () => {
  expect((await POST(request({ query: '', kind: 'entries' }))).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('does not expose database errors or search contents in an error response', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'private database detail' } });
  const res = await POST(request({ query: '개인 내용', kind: 'books' }));
  expect(res.status).toBe(500);
  expect(await res.text()).not.toContain('private database detail');
});
