import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirect';
import { PENDING_REDIRECT_KEY, toPendingRedirect } from '@/lib/auth/pendingRedirect';
import { CONSENTED_AT_KEY, consentStamp } from '@/lib/auth/consent';
import { OAUTH_CONSENT_PARAM } from '@/lib/auth/oauthRedirect';

const DEFAULT_NEXT = '/protected/dashboard';

/** Supabase가 OAuth 실패(사용자 취소, 제공자 거절)를 알릴 때 붙이는 쿼리 — 하나라도 있으면 실패다 */
const OAUTH_ERROR_PARAMS = ['error', 'error_code', 'error_description'] as const;

const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'email',
  'recovery',
  'email_change',
  'magiclink',
  'invite',
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

/** 링크가 만료·재사용됐을 때 보내는 곳 — 재설정은 재설정 화면에서, 나머지는 로그인에서 다시 시작한다 */
function failureDestination(isRecovery: boolean): string {
  return isRecovery ? '/reset-password?error=invalid-link' : '/login?error=invalid-link';
}

/** OAuth가 취소·거절됐을 때 — 로그인으로 돌려보내되, 가려던 곳은 `redirect`로 이어 준다 */
function oauthFailureDestination(next: string): string {
  const params = new URLSearchParams({ error: 'oauth' });
  if (next !== DEFAULT_NEXT) params.set('redirect', next);
  return `/login?${params.toString()}`;
}

/**
 * 이메일 인증 링크 착지(서버).
 *
 * Supabase 이메일 템플릿이 `/auth/confirm?token_hash={{ .TokenHash }}&type=…` 로 오면 여기서
 * verifyOtp 로 세션을 세운다. token_hash 는 가입을 시작한 브라우저의 비밀값(PKCE code_verifier)이
 * 필요 없으므로, 데스크톱에서 가입하고 휴대폰에서 메일을 열어도 인증된다.
 *
 * `?code=` 는 PKCE 교환 — OAuth(Google) 로그인이 여기로 돌아오고, 옛 이메일 링크도 같은 모양이다.
 * OAuth가 실패하면(사용자가 Google에서 취소, 제공자 거절) `code` 없이 `error=…` 만 붙어 오므로
 * 그건 로그인 화면으로 돌려보낸다 — 해시 토큰용 클라이언트 착지로 흘리면 "인증 완료"로 오인한다.
 * 토큰도 오류도 없으면 토큰이 URL 해시에 실린 implicit 링크이므로 클라이언트 착지(/auth/callback)로
 * 넘긴다(해시는 리다이렉트에도 보존된다).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const code = searchParams.get('code');
  const next = sanitizeRedirectPath(searchParams.get('next'));
  const consented = searchParams.get(OAUTH_CONSENT_PARAM) === '1';

  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!tokenHash && !code) {
    if (OAUTH_ERROR_PARAMS.some((key) => searchParams.has(key))) {
      return redirect(oauthFailureDestination(next));
    }
    return redirect('/auth/callback');
  }

  const supabase = await createSupabaseServerClient();
  let isRecovery = false;
  let userId: string | null = null;

  if (tokenHash) {
    if (!isEmailOtpType(type)) {
      return redirect(failureDestination(false));
    }
    isRecovery = type === 'recovery';
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      return redirect(failureDestination(isRecovery));
    }
    userId = data.user?.id ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirect(failureDestination(false));
    }
    userId = data.user?.id ?? null;
  }

  if (!userId) {
    return redirect(failureDestination(isRecovery));
  }

  if (isRecovery) {
    return redirect('/update-password');
  }

  // 인증만 끝난 계정은 프로필이 없다 — 온보딩으로. 있으면 원래 가려던 곳(없으면 홈)으로
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profile) {
    return redirect(next);
  }

  // OAuth로 처음 온 사람이 초대 링크 등에서 출발했다면 목적지가 `next`에만 있고, 가입 화면에서
  // 동의를 마쳤다는 사실은 `consent`에만 있다 — 이메일 가입이 user_metadata에 실어 두는 것과 같은
  // 자리에 넣어, 온보딩이 동의를 다시 묻지 않고 끝에서 /api/onboarding 이 복귀 경로를 꺼내 쓴다.
  // 실어 두기에 실패해도 온보딩 자체는 막지 않는다(동의를 한 번 더 묻고, 복귀만 홈으로 바뀐다)
  const pendingRedirect = next !== DEFAULT_NEXT ? toPendingRedirect(next) : null;
  const stash: Record<string, string> = {};
  if (pendingRedirect) stash[PENDING_REDIRECT_KEY] = pendingRedirect;
  if (consented) stash[CONSENTED_AT_KEY] = consentStamp();
  if (Object.keys(stash).length > 0) {
    const { error: stashError } = await supabase.auth.updateUser({ data: stash });
    if (stashError) {
      console.error('[AUTH CONFIRM METADATA STASH ERROR]', stashError);
    }
  }
  return redirect('/onboarding');
}
