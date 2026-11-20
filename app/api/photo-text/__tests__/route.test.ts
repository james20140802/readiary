import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PhotoReadError, readPhotoText } from '@/lib/photo-quote/vision';
import { POST } from '../route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/photo-quote/vision', async (original) => ({
  ...(await original<typeof import('@/lib/photo-quote/vision')>()),
  readPhotoText: vi.fn(),
}));

const TEXT = {
  width: 1500,
  height: 2000,
  words: [{ text: '비밀스러운문장', box: [1, 2, 3, 4], sep: ' ' }],
};

function stub({
  user = { id: 'user-1' } as { id: string } | null,
  rpc = { data: 'ok', error: null } as { data: unknown; error: unknown },
} = {}) {
  const rpcMock = vi.fn().mockResolvedValue(rpc);
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    rpc: rpcMock,
  } as never);
  return rpcMock;
}

function photo(bytes: number | Uint8Array = 3, headers: Record<string, string> = {}) {
  const body = typeof bytes === 'number' ? new Uint8Array(bytes).fill(7) : bytes;
  return new Request('https://www.readiary.net/api/photo-text', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', ...headers },
    body,
  });
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', 'true');
  vi.stubEnv('GOOGLE_VISION_API_KEY', 'secret-key');
  vi.mocked(readPhotoText).mockResolvedValue(TEXT as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('POST /api/photo-text', () => {
  it('로그인이 없으면 세션 만료로 답하고 아무것도 부르지 않는다', async () => {
    const rpc = stub({ user: null });
    const res = await POST(photo());
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('session_expired');
    expect(rpc).not.toHaveBeenCalled();
    expect(readPhotoText).not.toHaveBeenCalled();
  });

  it.each([
    ['플래그가 꺼져 있으면', 'NEXT_PUBLIC_PHOTO_QUOTE_ENABLED'],
    ['키가 없으면', 'GOOGLE_VISION_API_KEY'],
  ])('%s 꺼진 기능으로 답하고 횟수를 쓰지 않는다', async (_label, name) => {
    vi.stubEnv(name, '');
    const rpc = stub();
    const res = await POST(photo());
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('disabled');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('JPEG가 아니면 거절한다', async () => {
    const rpc = stub();
    const res = await POST(photo(3, { 'Content-Type': 'application/json' }));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('빈 본문은 거절한다', async () => {
    const rpc = stub();
    const res = await POST(photo(0));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('2MB를 넘으면 길이 헤더와 상관없이 거절하고 횟수를 쓰지 않는다', async () => {
    const rpc = stub();
    const res = await POST(photo(2 * 1024 * 1024 + 1, { 'Content-Length': '10' }));
    expect(res.status).toBe(413);
    expect((await res.json()).code).toBe('too_large');
    expect(rpc).not.toHaveBeenCalled();
    expect(readPhotoText).not.toHaveBeenCalled();
  });

  it('동의하지 않았으면 사진을 Google로 보내지 않는다', async () => {
    const rpc = stub({ rpc: { data: 'consent_required', error: null } });
    const res = await POST(photo());
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('consent_required');
    expect(rpc).toHaveBeenCalledWith('begin_photo_text_read', { p_version: 1 });
    expect(readPhotoText).not.toHaveBeenCalled();
  });

  it('하루 한도를 넘으면 보내지 않는다', async () => {
    stub({ rpc: { data: 'daily_limit', error: null } });
    const res = await POST(photo());
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe('daily_limit');
    expect(readPhotoText).not.toHaveBeenCalled();
  });

  it('동의 확인이 실패하면 보내지 않는다', async () => {
    stub({ rpc: { data: null, error: { message: 'db down' } } });
    const res = await POST(photo());
    expect(res.status).toBe(503);
    expect(readPhotoText).not.toHaveBeenCalled();
  });

  it('알 수 없는 확인 결과도 보내지 않는다', async () => {
    stub({ rpc: { data: null, error: null } });
    const res = await POST(photo());
    expect(res.status).toBe(503);
    expect(readPhotoText).not.toHaveBeenCalled();
  });

  it('Vision이 실패하면 읽기 실패로 답한다', async () => {
    stub();
    vi.mocked(readPhotoText).mockRejectedValue(new PhotoReadError('vision_status_500'));
    const res = await POST(photo());
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe('read_failed');
  });

  it('읽은 낱말을 그대로 돌려주고 캐시하지 못하게 한다', async () => {
    stub();
    const bytes = new Uint8Array([255, 216, 255, 224]);
    const res = await POST(photo(bytes));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(TEXT);
    expect(res.headers.get('Cache-Control')).toContain('no-store');
    const [sent, key] = vi.mocked(readPhotoText).mock.calls[0];
    expect([...sent]).toEqual([...bytes]);
    expect(key).toBe('secret-key');
  });

  it('사진의 글과 키를 로그에 남기지 않는다', async () => {
    stub();
    const spies = (['log', 'info', 'warn', 'error'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {})
    );
    await POST(photo());
    vi.mocked(readPhotoText).mockRejectedValue(new PhotoReadError('vision_status_500'));
    await POST(photo());
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain('비밀스러운문장');
    expect(logged).not.toContain('secret-key');
  });
});
