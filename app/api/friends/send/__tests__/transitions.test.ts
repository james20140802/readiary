import { beforeEach, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notifyFriendEvent, retractFriendRequestNotification } from '@/lib/notifications/notify';
import { POST as send } from '../route';
import { POST as accept } from '../../accept/route';
import { DELETE as decline } from '../../decline/route';
import { DELETE as cancel } from '../../cancel/route';
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/notifications/notify', () => ({
  notifyFriendEvent: vi.fn(),
  retractFriendRequestNotification: vi.fn(),
}));
function stub(result: unknown) {
  const eq = vi.fn();
  const chain = {
    eq,
    select: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
  };
  eq.mockReturnValue(chain);
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'me' } } }) },
    from: (table: string) =>
      table === 'profiles'
        ? {
            select: () => ({
              eq: () => ({ eq: () => ({ single: async () => ({ data: { id: 'friend' } }) }) }),
            }),
          }
        : {
            insert: async () => ({ error: { code: '23505' } }),
            select: () => chain,
            update: () => chain,
            delete: () => chain,
          },
  } as never);
  return eq;
}
const request = () =>
  new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ friendId: 'friend', friendUserId: 'friend' }),
  });
beforeEach(() => vi.clearAllMocks());
it.each(['pending', 'accepted'])(
  'repeated send returns existing %s with no notification',
  async (status) => {
    stub({ data: { status }, error: null });
    const response = await send(request());
    expect(await response.json()).toEqual({ success: true, status, already_exists: true });
    expect(notifyFriendEvent).not.toHaveBeenCalled();
  }
);
it.each([accept, decline, cancel])(
  'returns conflict for an absent or already changed pending request %#',
  async (route) => {
    const eq = stub({ data: [], error: null });
    expect((await route(request())).status).toBe(409);
    expect(eq).toHaveBeenCalledWith('status', 'pending');
    expect(notifyFriendEvent).not.toHaveBeenCalled();
    expect(retractFriendRequestNotification).not.toHaveBeenCalled();
  }
);
it('only a successful accept sends a notification', async () => {
  stub({ data: [{ id: 'friendship' }], error: null });
  expect((await accept(request())).status).toBe(200);
  expect(notifyFriendEvent).toHaveBeenCalledTimes(1);
});
