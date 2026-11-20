import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const getUser = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NOT_FOUND');
});

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => ({ rpc }),
}));
vi.mock('@/lib/debate/map', () => ({ mapDebate: (raw: unknown) => raw }));
vi.mock('@/components/debate/DebateView', () => ({ default: () => null }));

const { default: Page } = await import('../page');
const ID = '11111111-1111-4111-8111-111111111111';
const open = (id: string) => Page({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  getUser.mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
});

describe('토론 한 편 페이지', () => {
  it('형식이 틀린 id는 404, 조회도 안 한다', async () => {
    await expect(open('abc')).rejects.toThrow('NOT_FOUND');
    expect(rpc).not.toHaveBeenCalled();
  });
  it('없거나 볼 수 없는 토론은 404', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_found', code: 'P0001' } });
    await expect(open(ID)).rejects.toThrow('NOT_FOUND');
  });
  it('조회 실패는 없는 토론으로 오해하지 않고 그대로 던진다', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'connection reset', code: '08006' } });
    await expect(open(ID)).rejects.toThrow('Debate unavailable');
    expect(notFound).not.toHaveBeenCalled();
  });
  it('불러왔으면 화면을 그린다', async () => {
    const debate = { id: ID };
    rpc.mockResolvedValue({ data: debate, error: null });
    const el = await open(ID);
    expect(el?.props.initial).toBe(debate);
    expect(el?.props.viewerId).toBe('me');
  });
});
