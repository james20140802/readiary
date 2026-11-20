import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DELETE, GET, POST } from '../consent/route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));

function stub({
  user = { id: 'user-1' } as { id: string } | null,
  rpc = { data: true, error: null } as { data: unknown; error: unknown },
} = {}) {
  const rpcMock = vi.fn().mockResolvedValue(rpc);
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    rpc: rpcMock,
  } as never);
  return rpcMock;
}

const URL_ = 'https://www.readiary.net/api/photo-text/consent';
const req = (method: string, origin?: string) =>
  new Request(URL_, { method, headers: origin ? { origin } : {} });

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', 'true');
  vi.stubEnv('GOOGLE_VISION_API_KEY', 'secret-key');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('/api/photo-text/consent', () => {
  it('지금 판의 문구에 동의했는지 알려 준다', async () => {
    const rpc = stub({ rpc: { data: true, error: null } });
    const res = await GET();
    expect(await res.json()).toEqual({ consented: true });
    expect(rpc).toHaveBeenCalledWith('photo_text_consented', { p_version: 1 });
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('로그인이 없으면 세 방법 모두 세션 만료다', async () => {
    stub({ user: null });
    for (const res of [await GET(), await POST(req('POST')), await DELETE(req('DELETE'))]) {
      expect(res.status).toBe(401);
      expect((await res.json()).code).toBe('session_expired');
    }
  });

  it('동의를 지금 판 번호로 남긴다', async () => {
    const rpc = stub({ rpc: { data: null, error: null } });
    const res = await POST(req('POST', 'https://www.readiary.net'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ consented: true });
    expect(rpc).toHaveBeenCalledWith('set_photo_text_consent', { p_version: 1 });
  });

  it('기능이 꺼져 있으면 새 동의를 받지 않는다', async () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', '');
    const rpc = stub();
    const res = await POST(req('POST'));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('disabled');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('철회는 기능이 꺼져 있어도 된다', async () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', '');
    const rpc = stub({ rpc: { data: null, error: null } });
    const res = await DELETE(req('DELETE'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ consented: false });
    expect(rpc).toHaveBeenCalledWith('withdraw_photo_text_consent');
  });

  it('다른 사이트에서 온 동의·철회 요청은 거절한다', async () => {
    const rpc = stub();
    expect((await POST(req('POST', 'https://evil.example'))).status).toBe(403);
    expect((await DELETE(req('DELETE', 'https://evil.example'))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('저장에 실패하면 동의했다고 답하지 않는다', async () => {
    stub({ rpc: { data: null, error: { message: 'db down' } } });
    expect((await POST(req('POST'))).status).toBe(503);
    expect((await DELETE(req('DELETE'))).status).toBe(503);
    expect((await GET()).status).toBe(503);
  });
});
