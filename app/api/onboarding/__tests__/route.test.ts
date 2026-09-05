import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { POST } from '../route';
import { validateNickname } from '@/lib/profile/nickname';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

type FakeUser = { id: string; user_metadata?: Record<string, unknown> } | null;
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
  const updateUser = vi.fn().mockResolvedValue({ data: { user }, error: null });

  return { stub: { auth: { getUser, updateUser }, from }, insert, updateUser };
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/onboarding', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validBody = { name: '홍길동', nickname: 'gildong', tag: '0001', bio: '안녕하세요' };

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

  it('이름·닉네임·자기소개의 앞뒤 공백을 지우고, 빈 자기소개는 null로 넣는다', async () => {
    const { stub, insert } = buildSupabaseStub({ insertData: { id: 'user-1' } });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(
      makeRequest({ name: '  홍길동 ', nickname: ' gildong ', tag: '0001', bio: '   ' })
    );

    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith({
      id: 'user-1',
      name: '홍길동',
      nickname: 'gildong',
      tag: '0001',
      bio: null,
    });
  });

  it('공백만 친 이름은 빈 것으로 보고 400', async () => {
    const { stub, insert } = buildSupabaseStub();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest({ ...validBody, name: '   ' }));

    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it('가입 때 실어 둔 복귀 경로(pending_redirect)가 있으면 redirectTo로 돌려주고 메타데이터를 비운다', async () => {
    const { stub, updateUser } = buildSupabaseStub({
      user: { id: 'user-1', user_metadata: { pending_redirect: '/invite/gildong-1234' } },
      insertData: { id: 'user-1', ...validBody },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, redirectTo: '/invite/gildong-1234' });
    expect(updateUser).toHaveBeenCalledWith({ data: { pending_redirect: null } });
  });

  it('복귀 경로가 외부 주소면 redirectTo를 내지 않는다 — 메타데이터는 사용자가 고칠 수 있다', async () => {
    const { stub, updateUser } = buildSupabaseStub({
      user: { id: 'user-1', user_metadata: { pending_redirect: 'https://evil.test/x' } },
      insertData: { id: 'user-1', ...validBody },
    });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('메타데이터 정리에 실패해도 등록은 성공으로 답하고 redirectTo를 준다', async () => {
    const { stub, updateUser } = buildSupabaseStub({
      user: { id: 'user-1', user_metadata: { pending_redirect: '/invite/gildong-1234' } },
      insertData: { id: 'user-1', ...validBody },
    });
    updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'boom' } });
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, redirectTo: '/invite/gildong-1234' });
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

  it('닉네임 형식이 규칙(영문·숫자·밑줄)에 어긋나면 400을 반환하고 insert를 호출하지 않는다', async () => {
    const { stub, insert } = buildSupabaseStub();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest({ ...validBody, nickname: 'gil-dong' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({ error: validateNickname('gil-dong') });
    expect(insert).not.toHaveBeenCalled();
  });

  it('닉네임이 문자열이 아니면(배열 등) 강제 변환 없이 400을 반환하고 insert를 호출하지 않는다', async () => {
    const { stub, insert } = buildSupabaseStub();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);

    const res = await POST(makeRequest({ ...validBody, nickname: ['gildong'] }));

    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
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
