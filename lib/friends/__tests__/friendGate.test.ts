import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isFriendWith } from '../isFriendWith';
import { fetchFriendBooks } from '../fetchFriendBooks';
import { fetchFriendEntryDetail } from '../fetchFriendEntryDetail';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('../isFriendWith', () => ({
  isFriendWith: vi.fn(),
}));

/**
 * 친구 게이트 회귀 테스트.
 * 예전엔 isFriendWith()를 await 없이 호출해 Promise(항상 truthy)가 게이트를 통과시켰다.
 * 친구가 아니면 user_books·entries 조회 없이 null을 돌려줘야 한다.
 */
function buildSupabaseStub() {
  const single = vi.fn().mockResolvedValue({
    data: { id: 'target-1', nickname: 'friend', tag: '0001' },
    error: null,
  });
  const eqTag = vi.fn().mockReturnValue({ single });
  const eqNickname = vi.fn().mockReturnValue({ eq: eqTag });
  const profilesSelect = vi.fn().mockReturnValue({ eq: eqNickname });

  const dataTables = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === 'profiles') return { select: profilesSelect };
    dataTables(table);
    throw new Error(`unexpected table ${table}`);
  });
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'me' } }, error: null });

  return { stub: { auth: { getUser }, from }, dataTables };
}

describe('친구 게이트', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchFriendBooks: 친구가 아니면 책장을 조회하지 않고 null', async () => {
    const { stub, dataTables } = buildSupabaseStub();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);
    vi.mocked(isFriendWith).mockResolvedValue(false);

    await expect(fetchFriendBooks('friend', '0001')).resolves.toBeNull();
    expect(isFriendWith).toHaveBeenCalledWith({ nickname: 'friend', tag: '0001' });
    expect(dataTables).not.toHaveBeenCalled();
  });

  it('fetchFriendEntryDetail: 친구가 아니면 엔트리를 조회하지 않고 null', async () => {
    const { stub, dataTables } = buildSupabaseStub();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);
    vi.mocked(isFriendWith).mockResolvedValue(false);

    await expect(fetchFriendEntryDetail('friend', '0001', 'entry-1')).resolves.toBeNull();
    expect(dataTables).not.toHaveBeenCalled();
  });
});
