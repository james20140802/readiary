import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { POST } from '../route';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

type FakeUser = { id: string } | null;
type FakeInsertError = { code?: string; message?: string } | null;

/** 라우트가 실제로 사용하는 체인만 흉내 내는 최소 supabase 스텁. */
function buildSupabaseStub({
  user = { id: 'user-1' } as FakeUser,
  userError = null as { message: string } | null,
  insertData = null as Record<string, unknown> | null,
  insertError = null as FakeInsertError,
} = {}) {
  const single = vi.fn().mockResolvedValue({ data: insertData, error: insertError });
  const select = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({ select });
  const from = vi.fn().mockReturnValue({ insert });
  const getUser = vi.fn().mockResolvedValue({ data: { user }, error: userError });

  return { stub: { auth: { getUser }, from }, insert };
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/onboarding', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validBody = { name: '홍길동', nickname: '길동이', tag: '0001', bio: '안녕하세요' };

describe('POST /api/onboarding', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('정상 등록 시 200과 { success: true }를 반환한다', async () => {
    const { stub, insert } = buildSupabaseStub({
      insertData: { id: 'user-1', ...validBody },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(insert).toHaveBeenCalledWith({
      id: 'user-1',
      name: validBody.name,
      nickname: validBody.nickname,
      tag: validBody.tag,
      bio: validBody.bio,
    });
  });

  it('pkey 유니크 위반(23505 + profiles_pkey) 시 409 profile_exists를 반환한다', async () => {
    const { stub } = buildSupabaseStub({
      insertError: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_pkey"',
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json).toEqual({ code: 'profile_exists', error: '이미 프로필이 존재합니다.' });
  });

  it('닉네임+태그 유니크 위반(23505, pkey 아님) 시 409 tag_conflict를 반환한다', async () => {
    const { stub } = buildSupabaseStub({
      insertError: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_nickname_tag_key"',
      },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json).toEqual({
      code: 'tag_conflict',
      error: '같은 닉네임과 태그 조합이 이미 있습니다.',
    });
  });

  it('분류되지 않는 DB 에러는 500과 일반 메시지를 반환하고 원본 DB 메시지를 노출하지 않는다', async () => {
    const sensitiveMessage =
      'relation "profiles_secret_internal_table" violates foreign key SECRET_DETAIL';
    const { stub } = buildSupabaseStub({
      insertError: { code: '23503', message: sensitiveMessage },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));
    const bodyText = await res.text();

    expect(res.status).toBe(500);
    expect(bodyText).not.toContain(sensitiveMessage);
    expect(bodyText).not.toContain('SECRET_DETAIL');
    expect(JSON.parse(bodyText)).toEqual({ error: '프로필 등록에 실패했습니다.' });
  });

  it('필수 필드가 없으면 400을 반환한다', async () => {
    const { stub } = buildSupabaseStub();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest({ name: '홍길동', nickname: '', tag: '0001' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: '이름과 닉네임을 입력해주세요.' });
  });

  it('JSON 파싱에 실패하면 400 Invalid JSON을 반환한다', async () => {
    const { stub } = buildSupabaseStub();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest('{ not valid json'));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: 'Invalid JSON' });
  });

  it('로그인하지 않은 사용자는 401 Unauthorized를 반환한다', async () => {
    const { stub } = buildSupabaseStub({ user: null });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json).toEqual({ error: 'Unauthorized' });
  });
});
