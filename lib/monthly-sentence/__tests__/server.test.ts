import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchLibrarySentences, fetchMySentences } from '../server';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

const rpc = vi.fn();

beforeEach(() => {
  rpc.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

const own = { mode: 'own', rule: 'likes', reflectionsOn: true, rows: [], nextBefore: null };

describe('달마다 한 문장 서버 조회', () => {
  it('내 일기장: 첫 여섯 줄을 내 id로 부른다', async () => {
    rpc.mockResolvedValue({ data: own, error: null });
    expect(await fetchMySentences('u1')).toEqual(own);
    expect(rpc).toHaveBeenCalledWith('get_monthly_sentences', { p_owner: 'u1', p_limit: 6 });
  });

  it('불러오지 못하면 throw하고 로그에는 코드만 남긴다', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: '문장 본문' } });
    await expect(fetchMySentences('u1')).rejects.toThrow();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('문장 본문');
  });

  it('내 일기장인데 본인 응답이 아니면 throw한다', async () => {
    rpc.mockResolvedValue({ data: { mode: 'none', rows: [], nextBefore: null }, error: null });
    await expect(fetchMySentences('u1')).rejects.toThrow();
  });

  it('서재: 친구 응답은 그대로, 볼 수 없으면 빈 친구 응답', async () => {
    const friend = { mode: 'friend', hasAnyExcerpt: true, rows: [], nextBefore: null };
    rpc.mockResolvedValue({ data: friend, error: null });
    expect(await fetchLibrarySentences('u2')).toEqual(friend);
    rpc.mockResolvedValue({ data: { mode: 'none', rows: [], nextBefore: null }, error: null });
    expect(await fetchLibrarySentences('u2')).toEqual({
      mode: 'friend',
      hasAnyExcerpt: false,
      rows: [],
      nextBefore: null,
    });
    rpc.mockResolvedValue({ data: own, error: null });
    expect(await fetchLibrarySentences('u1')).toEqual(own);
  });
});
