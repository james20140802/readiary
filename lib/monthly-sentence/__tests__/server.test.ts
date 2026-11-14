import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { fetchLibrarySentences, fetchMySentences, fetchSentenceRule } from '../server';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

const rpc = vi.fn();
const maybeSingle = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

beforeEach(() => {
  rpc.mockReset();
  maybeSingle.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc, from } as never);
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

describe('설정에 보일 자동 기준', () => {
  it('저장한 기준과 이어 남긴 생각이 켜져 있는지를 함께 돌려준다', async () => {
    maybeSingle.mockResolvedValue({ data: { rule: 'recent' }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await fetchSentenceRule('u1')).toEqual({ rule: 'recent', reflectionsOn: true });
    expect(from).toHaveBeenCalledWith('monthly_sentence_settings');
    expect(eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(rpc).toHaveBeenCalledWith('entry_reflections_enabled');
  });

  it('저장한 적이 없으면 좋아요 기준이다', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await fetchSentenceRule('u1')).toEqual({ rule: 'likes', reflectionsOn: false });
  });

  it('이어 남긴 생각을 확인하지 못하면 꺼진 것으로 본다', async () => {
    maybeSingle.mockResolvedValue({ data: { rule: 'likes' }, error: null });
    rpc.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    expect(await fetchSentenceRule('u1')).toEqual({ rule: 'likes', reflectionsOn: false });
  });

  it('기준을 불러오지 못하면 throw한다', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { code: 'XX000' } });
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(fetchSentenceRule('u1')).rejects.toThrow();
  });
});
