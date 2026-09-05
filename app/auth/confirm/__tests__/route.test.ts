import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET } from '../route';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

type AuthResult = { data: { user: { id: string } | null }; error: { message: string } | null };

const ok = (id = 'user-1'): AuthResult => ({ data: { user: { id } }, error: null });
const fail: AuthResult = { data: { user: null }, error: { message: 'Token has expired' } };

/** 라우트가 실제로 부르는 것만 흉내 내는 최소 supabase 스텁 */
function buildSupabaseStub({
  verify = ok(),
  exchange = ok(),
  profile = null as { id: string } | null,
} = {}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profile, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  const verifyOtp = vi.fn().mockResolvedValue(verify);
  const exchangeCodeForSession = vi.fn().mockResolvedValue(exchange);
  const updateUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  const stub = { auth: { verifyOtp, exchangeCodeForSession, updateUser }, from };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(stub as never);
  return { verifyOtp, exchangeCodeForSession, updateUser, from, eq };
}

function get(query: string) {
  return GET(new NextRequest(`https://readiary.test/auth/confirm${query}`));
}

function location(res: Response) {
  return res.headers.get('location');
}

describe('GET /auth/confirm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('token_hash도 code도 없으면 해시 토큰용 클라이언트 착지로 넘긴다', async () => {
    const { verifyOtp } = buildSupabaseStub();
    const res = await get('');
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://readiary.test/auth/callback');
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('OAuth가 취소·거절돼 code 없이 error만 오면 클라이언트 착지가 아니라 로그인으로 보낸다', async () => {
    const { verifyOtp, exchangeCodeForSession } = buildSupabaseStub();
    const res = await get(
      '?error=access_denied&error_code=user_cancelled&error_description=User+cancelled'
    );
    expect(res.status).toBe(307);
    expect(location(res)).toBe('https://readiary.test/login?error=oauth');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('OAuth 실패 시 error_description 하나만 와도 실패로 다루고, next 는 redirect 로 이어 준다', async () => {
    buildSupabaseStub();
    const res = await get('?error_description=Provider+rejected&next=%2Finvite%2Fxyz');
    expect(location(res)).toBe('https://readiary.test/login?error=oauth&redirect=%2Finvite%2Fxyz');
  });

  it('OAuth 실패의 next 가 외부 주소면 redirect 를 싣지 않는다', async () => {
    buildSupabaseStub();
    const res = await get('?error=access_denied&next=https%3A%2F%2Fevil.test');
    expect(location(res)).toBe('https://readiary.test/login?error=oauth');
  });

  it('type이 이메일 OTP 유형이 아니면 검증 없이 로그인으로 보낸다', async () => {
    const { verifyOtp } = buildSupabaseStub();
    const res = await get('?token_hash=abc&type=sms');
    expect(location(res)).toBe('https://readiary.test/login?error=invalid-link');
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('type이 없어도 검증 없이 로그인으로 보낸다', async () => {
    const { verifyOtp } = buildSupabaseStub();
    const res = await get('?token_hash=abc');
    expect(location(res)).toBe('https://readiary.test/login?error=invalid-link');
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('가입 인증 성공 + 프로필 없음 → 온보딩', async () => {
    const { verifyOtp, eq } = buildSupabaseStub();
    const res = await get('?token_hash=abc&type=signup');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'signup' });
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
    expect(location(res)).toBe('https://readiary.test/onboarding');
  });

  it('가입 인증 성공 + 프로필 있음 → 홈', async () => {
    buildSupabaseStub({ profile: { id: 'user-1' } });
    const res = await get('?token_hash=abc&type=email');
    expect(location(res)).toBe('https://readiary.test/protected/dashboard');
  });

  it('프로필이 있으면 next(같은 오리진 경로만)로 보낸다', async () => {
    buildSupabaseStub({ profile: { id: 'user-1' } });
    const res = await get('?token_hash=abc&type=signup&next=%2Finvite%2Fxyz');
    expect(location(res)).toBe('https://readiary.test/invite/xyz');
  });

  it('next가 외부 주소면 홈으로 대체한다', async () => {
    buildSupabaseStub({ profile: { id: 'user-1' } });
    const res = await get('?token_hash=abc&type=signup&next=https%3A%2F%2Fevil.test');
    expect(location(res)).toBe('https://readiary.test/protected/dashboard');
  });

  it('가입 인증 실패 → 로그인 + error=invalid-link', async () => {
    const { from } = buildSupabaseStub({ verify: fail });
    const res = await get('?token_hash=abc&type=signup');
    expect(location(res)).toBe('https://readiary.test/login?error=invalid-link');
    expect(from).not.toHaveBeenCalled();
  });

  it('비밀번호 재설정 성공 → 새 비밀번호 화면(프로필 조회 없음)', async () => {
    const { verifyOtp, from } = buildSupabaseStub();
    const res = await get('?token_hash=abc&type=recovery');
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: 'abc', type: 'recovery' });
    expect(location(res)).toBe('https://readiary.test/update-password');
    expect(from).not.toHaveBeenCalled();
  });

  it('비밀번호 재설정 실패 → 재설정 요청 화면 + error=invalid-link', async () => {
    buildSupabaseStub({ verify: fail });
    const res = await get('?token_hash=abc&type=recovery');
    expect(location(res)).toBe('https://readiary.test/reset-password?error=invalid-link');
  });

  it('검증은 됐는데 user가 비어 오면 실패로 다룬다', async () => {
    buildSupabaseStub({ verify: { data: { user: null }, error: null } });
    const res = await get('?token_hash=abc&type=signup');
    expect(location(res)).toBe('https://readiary.test/login?error=invalid-link');
  });

  it('code만 있으면 PKCE 교환 후 프로필 유무로 분기한다', async () => {
    const { exchangeCodeForSession, verifyOtp } = buildSupabaseStub({
      profile: { id: 'user-1' },
    });
    const res = await get('?code=pkce-code');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(location(res)).toBe('https://readiary.test/protected/dashboard');
  });

  it('PKCE 교환 실패(다른 브라우저 등) → 로그인 + error=invalid-link', async () => {
    buildSupabaseStub({ exchange: fail });
    const res = await get('?code=pkce-code');
    expect(location(res)).toBe('https://readiary.test/login?error=invalid-link');
  });

  it('OAuth로 처음 온 사람(프로필 없음)의 next는 메타데이터에 실어 두고 온보딩으로', async () => {
    const { updateUser } = buildSupabaseStub();
    const res = await get('?code=pkce-code&next=%2Finvite%2Fgildong-1234');
    expect(updateUser).toHaveBeenCalledWith({
      data: { pending_redirect: '/invite/gildong-1234' },
    });
    expect(location(res)).toBe('https://readiary.test/onboarding');
  });

  it('next가 없거나 기본 목적지면 메타데이터를 건드리지 않는다', async () => {
    const { updateUser } = buildSupabaseStub();
    await get('?code=pkce-code');
    await get('?code=pkce-code&next=%2Fprotected%2Fdashboard');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('가입 화면에서 동의하고 온 OAuth(consent=1)는 동의 표식을 메타데이터에 남긴다', async () => {
    const { updateUser } = buildSupabaseStub();
    const res = await get('?code=pkce-code&consent=1');
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ data: { consented_at: expect.any(String) } });
    expect(location(res)).toBe('https://readiary.test/onboarding');
  });

  it('동의 표식과 복귀 경로는 한 번의 updateUser 로 함께 싣는다', async () => {
    const { updateUser } = buildSupabaseStub();
    await get('?code=pkce-code&next=%2Finvite%2Fx&consent=1');
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({
      data: { pending_redirect: '/invite/x', consented_at: expect.any(String) },
    });
  });

  it("consent 가 '1' 이 아니면 표식을 남기지 않는다 — 로그인 화면 Google 은 온보딩에서 동의를 받는다", async () => {
    const { updateUser } = buildSupabaseStub();
    await get('?code=pkce-code&consent=true');
    await get('?code=pkce-code&consent=0');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('프로필이 이미 있으면 consent=1 이어도 메타데이터를 건드리지 않고 목적지로 보낸다', async () => {
    const { updateUser } = buildSupabaseStub({ profile: { id: 'user-1' } });
    const res = await get('?code=pkce-code&consent=1');
    expect(updateUser).not.toHaveBeenCalled();
    expect(location(res)).toBe('https://readiary.test/protected/dashboard');
  });

  it('실어 두기에 실패해도 온보딩으로는 보낸다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { updateUser } = buildSupabaseStub();
    updateUser.mockResolvedValue({ data: { user: null }, error: { message: 'boom' } });
    const res = await get('?code=pkce-code&next=%2Finvite%2Fx');
    expect(location(res)).toBe('https://readiary.test/onboarding');
  });

  it('token_hash와 code가 같이 오면 token_hash를 쓴다', async () => {
    const { exchangeCodeForSession, verifyOtp } = buildSupabaseStub();
    await get('?token_hash=abc&type=signup&code=pkce-code');
    expect(verifyOtp).toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
