import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { POST } from '../route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

const getUser = vi.fn();
const fetchMock = vi.fn();
const DAUM = 'https://search.daum.net/search?w=bookpage&bookId=1';
const daumHtml = (pages: string) =>
  `<dl><dt class="tit_base">페이지수</dt><dd class="cont">${pages}<span>쪽</span></dd></dl>`;
const ask = (body: unknown) =>
  POST(
    new Request('http://localhost/api/books/pages', { method: 'POST', body: JSON.stringify(body) })
  );
const aladinReply = (pages: number) =>
  Response.json({ item: [{ title: 't', isbn13: '9788936434267', subInfo: { itemPage: pages } }] });

beforeEach(() => {
  getUser.mockResolvedValue({ data: { user: { id: 'u' } } });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getUser } } as never);
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('ALADIN_TTB_KEY', 'ttb');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('쪽수 찾기 API', () => {
  it('다음 책 정보에서 읽으면 알라딘에 묻지 않는다', async () => {
    fetchMock.mockResolvedValue(new Response(daumHtml('216')));
    const res = await ask({ url: DAUM, isbn: '8936434268 9788936434267' });
    expect(await res.json()).toEqual({ totalPages: 216, source: 'daum' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('다음에서 못 읽으면 ISBN으로 알라딘에 묻는다', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('<html></html>'))
      .mockResolvedValueOnce(aladinReply(300));
    const res = await ask({ url: DAUM, isbn: '8936434268 9788936434267' });
    expect(await res.json()).toEqual({ totalPages: 300, source: 'aladin' });
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('ItemId')).toBe('9788936434267');
  });

  it('알라딘에서 온 책은 링크 없이 ISBN만으로 묻는다', async () => {
    fetchMock.mockResolvedValue(aladinReply(88));
    const res = await ask({ url: 'https://www.aladin.co.kr/x', isbn: '9788936434267' });
    expect(await res.json()).toEqual({ totalPages: 88, source: 'aladin' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('허용하지 않은 주소만 오면 열지 않는다', async () => {
    const res = await ask({ url: 'https://evil.example/' });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('둘 다 실패하면 404 — 화면은 쪽수를 비워 둔다', async () => {
    vi.stubEnv('ALADIN_TTB_KEY', '');
    fetchMock.mockResolvedValue(new Response('<html></html>'));
    expect((await ask({ url: DAUM, isbn: '9788936434267' })).status).toBe(404);
  });
});
