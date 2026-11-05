import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const fetchExcerptOwner = vi.fn();
const fetchFriendMonthlyExcerpt = vi.fn();
const fetchFriendExcerptYears = vi.fn();
const fetchFriendExcerptYear = vi.fn();
const isFriendWith = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NOT_FOUND');
});
const redirect = vi.fn((to: string) => {
  throw new Error(`REDIRECT:${to}`);
});

vi.mock('next/navigation', () => ({ notFound, redirect }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));
vi.mock('@/lib/friends/isFriendWith', () => ({ isFriendWith }));
vi.mock('@/lib/monthly-excerpt/server', () => ({
  fetchExcerptOwner,
  fetchFriendMonthlyExcerpt,
  fetchFriendExcerptYears,
  fetchFriendExcerptYear,
}));
vi.mock('@/components/monthly-excerpt/MonthlyExcerptReader', () => ({ default: () => null }));
vi.mock('@/components/monthly-excerpt/MonthlyExcerptArchive', () => ({
  FriendMonthlyExcerptArchive: () => null,
}));
vi.mock('@/components/social/SocialTopBar', () => ({ default: () => null }));

const { default: ReaderPage } = await import('../[month]/page');
const { default: ArchivePage } = await import('../page');

const SLUG = 'minji-0001';
const read = (month: string, slug = SLUG) =>
  ReaderPage({ params: Promise.resolve({ nicknameAndTag: slug, month }) });
const archive = (slug = SLUG) => ArchivePage({ params: Promise.resolve({ nicknameAndTag: slug }) });
const propsOf = (el: unknown, type: unknown) => {
  const found = (el as { props: { children: { type: unknown; props: Record<string, unknown> }[] } })
    .props.children;
  return found.find((c) => c.type === type)?.props as Record<string, unknown>;
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
  fetchExcerptOwner.mockResolvedValue({ id: 'owner', name: '민지' });
  isFriendWith.mockResolvedValue(true);
});

describe('친구의 달의 발췌집 읽기', () => {
  it.each(['2026-13', '2026-3', 'abc'])('형식이 틀린 달 %s는 404, 조회도 안 한다', async (m) => {
    await expect(read(m)).rejects.toThrow('NOT_FOUND');
    expect(fetchFriendMonthlyExcerpt).not.toHaveBeenCalled();
  });

  it('주소가 틀리거나 없는 사람이면 404다', async () => {
    await expect(read('2026-03', 'nodash')).rejects.toThrow('NOT_FOUND');
    fetchExcerptOwner.mockResolvedValue(null);
    await expect(read('2026-03')).rejects.toThrow('NOT_FOUND');
    expect(fetchFriendMonthlyExcerpt).not.toHaveBeenCalled();
  });

  it('로그인하지 않았으면 404다', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(read('2026-03')).rejects.toThrow('NOT_FOUND');
    expect(fetchFriendMonthlyExcerpt).not.toHaveBeenCalled();
  });

  it('내 주소면 내 화면으로 보낸다', async () => {
    fetchExcerptOwner.mockResolvedValue({ id: 'me', name: '나' });
    await expect(read('2026-03')).rejects.toThrow('REDIRECT:/excerpts/2026-03');
    expect(fetchFriendMonthlyExcerpt).not.toHaveBeenCalled();
  });

  it('볼 수 없으면(친구 아님, 나만 보기, 공개 문장 없음, 없는 달) 모두 404다', async () => {
    fetchFriendMonthlyExcerpt.mockResolvedValue(null);
    await expect(read('2026-03')).rejects.toThrow('NOT_FOUND');
    expect(fetchFriendMonthlyExcerpt).toHaveBeenCalledWith('owner', '2026-03');
  });

  it('불러오지 못한 것은 없음으로 오해하지 않고 던진다', async () => {
    fetchFriendMonthlyExcerpt.mockRejectedValue(new Error('Monthly excerpt unavailable'));
    await expect(read('2026-03')).rejects.toThrow('Monthly excerpt unavailable');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('볼 수 있으면 친구 화면으로 그린다', async () => {
    const items = [{ entryId: 'a' }];
    fetchFriendMonthlyExcerpt.mockResolvedValue({ id: 'x', month: '2026-03', items });
    const { default: Reader } = await import('@/components/monthly-excerpt/MonthlyExcerptReader');
    expect(propsOf(await read('2026-03'), Reader)).toMatchObject({
      month: '2026-03',
      items,
      viewer: 'friend',
      ownerName: '민지',
    });
  });
});

describe('친구의 달의 발췌집 모아 보기', () => {
  it('친구가 아니면 404다. 해 목록을 묻지도 않는다', async () => {
    isFriendWith.mockResolvedValue(false);
    await expect(archive()).rejects.toThrow('NOT_FOUND');
    expect(fetchFriendExcerptYears).not.toHaveBeenCalled();
  });

  it('없는 사람도 같은 404다', async () => {
    fetchExcerptOwner.mockResolvedValue(null);
    await expect(archive()).rejects.toThrow('NOT_FOUND');
  });

  it('내 주소면 내 모아 보기로 보낸다', async () => {
    fetchExcerptOwner.mockResolvedValue({ id: 'me', name: '나' });
    await expect(archive()).rejects.toThrow('REDIRECT:/excerpts');
  });

  it('해 목록을 못 불러오면 던지고, 첫 해만 실패하면 그 해 안에서 다시 시도하게 한다', async () => {
    fetchFriendExcerptYears.mockRejectedValue(new Error('years'));
    await expect(archive()).rejects.toThrow('years');

    fetchFriendExcerptYears.mockResolvedValue([{ year: 2026, excerptCount: 1, hasUnmade: false }]);
    fetchFriendExcerptYear.mockRejectedValue(new Error('year'));
    const el = (await archive()) as unknown as { props: Record<string, unknown> };
    expect(el.props).toMatchObject({ firstYearMonths: null, ownerId: 'owner', slug: SLUG });
  });

  it('보여 준 달이 없어도 친구에게는 빈 화면이다', async () => {
    fetchFriendExcerptYears.mockResolvedValue([]);
    const el = (await archive()) as unknown as { props: Record<string, unknown> };
    expect(el.props).toMatchObject({ years: [], firstYearMonths: [], ownerName: '민지' });
    expect(fetchFriendExcerptYear).not.toHaveBeenCalled();
  });
});
