import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { updateProgress } from '@/utils/sync';
import { PATCH } from '../route';
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/utils/sync', () => ({ updateProgress: vi.fn() }));
it('reports removal between ownership lookup and update truthfully', async () => {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: 'entry', user_books: { user_id: 'me' } } }),
        }),
      }),
      update: () => ({
        eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      }),
    }),
  } as never);
  const response = await PATCH(
    new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ quote: 'new quote' }),
    }),
    { params: Promise.resolve({ entry_id: 'entry' }) }
  );
  expect(response.status).toBe(404);
  expect(updateProgress).not.toHaveBeenCalled();
});
