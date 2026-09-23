import { beforeEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/entries/[entry_id]/edit/route';
import { DELETE } from '@/app/api/entries/[entry_id]/delete/route';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), progress: vi.fn() }));
vi.mock('@/utils/sync', () => ({ updateProgress: mocks.progress }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
    rpc: mocks.rpc,
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: 'entry', user_books: { user_id: 'owner' } } }),
          single: async () => ({
            data: table === 'entries' ? { user_book_id: 'ub' } : { user_id: 'owner' },
          }),
        }),
      }),
    }),
  }),
}));
beforeEach(() => vi.resetAllMocks());
const params = Promise.resolve({ entry_id: 'entry' });
it('passes absent legacy acknowledgement to the atomic RPC and returns a conflict without updating progress', async () => {
  mocks.rpc.mockResolvedValue({ data: { confirmation_required: true, count: 2 }, error: null });
  const edit = await PATCH(
    new NextRequest('https://readiary.net', {
      method: 'PATCH',
      body: JSON.stringify({ quote: '수정', is_private: false }),
    }),
    { params }
  );
  expect(edit.status).toBe(409);
  expect((await edit.json()).code).toBe('reflection_confirmation_required');
  expect(mocks.rpc).toHaveBeenCalledWith('mutate_entry_with_reflection_ack', {
    p_entry_id: 'entry',
    p_patch: { quote: '수정', is_private: false },
    p_reflection_count: null,
  });
  const remove = await DELETE(new Request('https://readiary.net?book_id=book'), { params });
  expect(remove.status).toBe(409);
  expect((await remove.json()).code).toBe('reflection_confirmation_required');
  expect(mocks.progress).not.toHaveBeenCalled();
});
it('passes the actual acknowledged delete count and only updates progress after success', async () => {
  mocks.rpc.mockResolvedValue({ data: { id: 'entry' }, error: null });
  const response = await DELETE(
    new Request('https://readiary.net?book_id=book&reflection_count=2'),
    { params }
  );
  expect(response.status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith('mutate_entry_with_reflection_ack', {
    p_entry_id: 'entry',
    p_delete: true,
    p_reflection_count: 2,
  });
  expect(mocks.progress).toHaveBeenCalledOnce();
});
