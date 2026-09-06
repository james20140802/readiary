import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseClient: vi.fn(),
}));

type RefreshResult = { data: { session: object | null }; error: { message: string } | null };

const REFRESH_OK: RefreshResult = { data: { session: { access_token: 'new' } }, error: null };
const REFRESH_FAIL: RefreshResult = {
  data: { session: null },
  error: { message: 'Invalid Refresh Token' },
};

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** 매 테스트가 모듈을 새로 불러와 "이동은 한 번만" 가드를 초기 상태로 되돌린다 */
async function loadModule({
  responses,
  refresh = REFRESH_OK,
  pathname = '/protected/books/1',
  search = '?tab=x',
}: {
  responses: Response[];
  refresh?: RefreshResult;
  pathname?: string;
  search?: string;
}) {
  vi.resetModules();

  const fetchMock = vi.fn();
  for (const res of responses) fetchMock.mockResolvedValueOnce(res);
  vi.stubGlobal('fetch', fetchMock);

  const assign = vi.fn();
  vi.stubGlobal('window', { location: { pathname, search, assign } });

  const refreshSession = vi.fn().mockResolvedValue(refresh);
  const { createSupabaseClient } = await import('@/lib/supabase/client');
  vi.mocked(createSupabaseClient).mockReturnValue({
    auth: { refreshSession },
  } as unknown as ReturnType<typeof createSupabaseClient>);

  const mod = await import('../fetch');
  return { ...mod, fetchMock, assign, refreshSession };
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('401 이 아니면 응답을 그대로 돌려주고 갱신·이동을 하지 않는다', async () => {
    const { apiFetch, fetchMock, assign, refreshSession } = await loadModule({
      responses: [jsonResponse(200, { ok: true })],
    });

    const res = await apiFetch('/api/likes', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/likes', { method: 'POST' });
    expect(refreshSession).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('500 같은 다른 실패도 호출자에게 그대로 넘긴다', async () => {
    const { apiFetch, refreshSession, assign } = await loadModule({
      responses: [jsonResponse(500, { error: 'boom' })],
    });

    const res = await apiFetch('/api/likes');

    expect(res.status).toBe(500);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('401 이면 세션을 한 번 갱신하고 같은 요청을 다시 보낸다 — 성공하면 그 응답을 돌려준다', async () => {
    const init = { method: 'POST', body: JSON.stringify({ entryId: 'e1' }) };
    const { apiFetch, fetchMock, assign, refreshSession } = await loadModule({
      responses: [jsonResponse(401, { error: 'Unauthorized' }), jsonResponse(200, { liked: true })],
    });

    const res = await apiFetch('/api/likes', init);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ liked: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/likes', init);
    expect(assign).not.toHaveBeenCalled();
  });

  it('본문이 있는 Request 객체도 복제본으로 재시도한다 — 첫 요청이 본문을 읽어 버려도 된다', async () => {
    const body = JSON.stringify({ entryId: 'e1' });
    const request = new Request('http://localhost/api/likes', { method: 'POST', body });
    const { apiFetch, fetchMock, assign } = await loadModule({
      responses: [jsonResponse(401), jsonResponse(200, { liked: true })],
    });

    // 진짜 fetch 처럼 첫 호출이 본문을 소비한다
    fetchMock.mockImplementationOnce(async (input: Request) => {
      await input.text();
      return jsonResponse(401);
    });

    const res = await apiFetch(request);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(request);
    const retriedWith = fetchMock.mock.calls[1][0] as Request;
    expect(retriedWith).toBeInstanceOf(Request);
    expect(retriedWith).not.toBe(request);
    expect(retriedWith.bodyUsed).toBe(false);
    expect(retriedWith.method).toBe('POST');
    expect(await retriedWith.text()).toBe(body);
    expect(assign).not.toHaveBeenCalled();
  });

  it('갱신이 실패하면 현재 경로를 redirect 에 실어 /login 으로 보내고 SessionExpiredError 를 던진다', async () => {
    const { apiFetch, SessionExpiredError, fetchMock, assign } = await loadModule({
      responses: [jsonResponse(401, { error: 'Unauthorized' })],
      refresh: REFRESH_FAIL,
    });

    await expect(apiFetch('/api/likes')).rejects.toBeInstanceOf(SessionExpiredError);

    // 갱신에 실패했으니 재시도는 없다
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(
      '/login?redirect=%2Fprotected%2Fbooks%2F1%3Ftab%3Dx&error=session-expired'
    );
  });

  it('갱신은 됐는데 재시도도 401 이면 로그인으로 보낸다', async () => {
    const { apiFetch, SessionExpiredError, fetchMock, assign } = await loadModule({
      responses: [jsonResponse(401), jsonResponse(401)],
    });

    await expect(apiFetch('/api/likes')).rejects.toBeInstanceOf(SessionExpiredError);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it('복귀 경로가 기본 홈이면 redirect 없이 안내 파라미터만 붙인다', async () => {
    const { apiFetch, assign } = await loadModule({
      responses: [jsonResponse(401)],
      refresh: REFRESH_FAIL,
      pathname: '/protected/dashboard',
      search: '',
    });

    await apiFetch('/api/likes').catch(() => {});

    expect(assign).toHaveBeenCalledWith('/login?error=session-expired');
  });

  it('여러 요청이 동시에 401 을 받아도 이동은 한 번만 한다', async () => {
    const { apiFetch, SessionExpiredError, assign } = await loadModule({
      responses: [jsonResponse(401), jsonResponse(401), jsonResponse(401)],
      refresh: REFRESH_FAIL,
    });

    const results = await Promise.allSettled([
      apiFetch('/api/likes'),
      apiFetch('/api/comments'),
      apiFetch('/api/friends/send'),
    ]);

    for (const r of results) {
      expect(r.status).toBe('rejected');
      expect((r as PromiseRejectedResult).reason).toBeInstanceOf(SessionExpiredError);
    }
    expect(assign).toHaveBeenCalledTimes(1);
  });
});
