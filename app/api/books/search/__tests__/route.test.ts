import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from '../route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

const getUser = vi.fn();
const fetchMock = vi.fn();
const kakaoDoc = { title: '소년이 온다', authors: ['한강'], isbn: '8936434268 9788936434267' };
const search = (q: string) =>
  GET(new Request(`http://localhost/api/books/search?q=${encodeURIComponent(q)}`));
const kakaoUrl = () => new URL(fetchMock.mock.calls[0][0]);

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getUser } } as never);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('KAKAO_REST_API_KEY', 'kakao');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('책 찾기 API', () => {
  it('로그인하지 않으면 찾지 않는다', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await search('한강')).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('제목만이 아니라 지은이로도 찾도록 대상을 정하지 않는다', async () => {
    fetchMock.mockResolvedValue(Response.json({ documents: [kakaoDoc] }));
    const res = await search('한강');
    expect(kakaoUrl().searchParams.get('target')).toBeNull();
    expect(kakaoUrl().searchParams.get('query')).toBe('한강');
    expect((await res.json()).documents).toEqual([kakaoDoc]);
  });

  it('ISBN 하나면 하이픈을 걷어 ISBN으로만 찾는다', async () => {
    fetchMock.mockResolvedValue(Response.json({ documents: [kakaoDoc] }));
    await search('978-89-364-3426-7');
    expect(kakaoUrl().searchParams.get('target')).toBe('isbn');
    expect(kakaoUrl().searchParams.get('query')).toBe('9788936434267');
  });

  it('카카오가 모르는 ISBN은 빈 결과 그대로', async () => {
    fetchMock.mockResolvedValue(Response.json({ documents: [] }));
    const { documents } = await (await search('9788936434267')).json();
    expect(documents).toEqual([]);
  });

  it('카카오 오류는 502로 알린다', async () => {
    fetchMock.mockResolvedValue(Response.json({ errorType: 'x' }, { status: 401 }));
    expect((await search('한강')).status).toBe(502);
  });
});
