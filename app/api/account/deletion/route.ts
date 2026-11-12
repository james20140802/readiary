import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { accountAdmin } from '@/lib/account/admin';
import {
  hasPasswordIdentity,
  hasRecentSignIn,
  isAccountDeletionOpen,
} from '@/lib/account/deletion';
import { unauthorized } from '@/lib/api/auth';
import { forgetProfileState } from '@/lib/auth/profilePresence';
import { createSupabaseServerClient } from '@/lib/supabase/server';

function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

/** 계정을 지우고 되살리는 요청은 이 앱 화면에서 온 것만 받는다(Origin이 없으면 거절) */
function sameOrigin(req: Request) {
  return req.headers.get('origin') === new URL(req.url).origin;
}

/** 쿠키 세션을 건드리지 않고 비밀번호만 확인한다 — 새 클라이언트는 세션을 저장하지 않는다 */
async function passwordMatches(userId: string, email: string, password: string) {
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await verifier.auth.signInWithPassword({ email, password });
  return !error && data.user?.id === userId;
}

/** 탈퇴 신청: 본인 확인 뒤 유예를 시작하고, 모든 기기에서 로그아웃한다 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return reply({ code: 'forbidden_origin' }, 403);
  try {
    const client = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return unauthorized();
    if (!isAccountDeletionOpen()) return reply({ code: 'not_open' }, 404);

    const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
    if (hasPasswordIdentity(user)) {
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!password) return reply({ code: 'password_required' }, 400);
      if (!(await passwordMatches(user.id, user.email!, password))) {
        return reply({ code: 'wrong_password' }, 403);
      }
    } else {
      // 소셜 로그인 계정은 방금(10분 안에) 다시 로그인했는지로 본인을 확인한다
      const { data: claimsData } = await client.auth.getClaims();
      if (!hasRecentSignIn(claimsData?.claims, Math.floor(Date.now() / 1000))) {
        return reply({ code: 'reauth_required' }, 403);
      }
    }

    const { data: purgeAfter, error: requestError } = await accountAdmin().rpc(
      'request_account_deletion',
      { p_user: user.id }
    );
    if (requestError || typeof purgeAfter !== 'string') {
      return reply({ code: 'request_failed' }, 503);
    }
    forgetProfileState(user.id);
    // 신청은 이미 기록됐다 — 로그아웃이 실패해도 proxy가 유예 상태를 보고 복구 화면으로 보낸다
    const { error: signOutError } = await client.auth.signOut({ scope: 'global' });
    if (signOutError) console.error('[account-deletion] global sign-out failed');
    return reply({ purgeAfter });
  } catch {
    return reply({ code: 'request_failed' }, 503);
  }
}

/**
 * 탈퇴 취소(복구): 기한 전이면 되살린다. 응답의 restored는 "지금 활성 계정인가"다 —
 * 다른 탭이나 응답을 잃은 재시도로 이미 되살아났다면 true, 기한이 지나 남아 있는 신청이면 false.
 */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return reply({ code: 'forbidden_origin' }, 403);
  try {
    const client = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return unauthorized();
    // 생성된 DB 타입에 아직 없는 함수·테이블이라 타입 없는 클라이언트로 부른다
    const db = client as unknown as SupabaseClient;
    const { data, error: cancelError } = await db.rpc('cancel_account_deletion');
    if (cancelError) return reply({ code: 'restore_failed' }, 503);
    forgetProfileState(user.id);
    if (data === true) return reply({ restored: true });
    // 지운 행이 없다 — 이미 복구됐는지(행 없음), 기한이 지났는지(행 남음) 본인 행으로 가린다
    const { data: pending, error: readError } = await db
      .from('account_deletions')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (readError) return reply({ code: 'restore_failed' }, 503);
    return reply({ restored: pending === null });
  } catch {
    return reply({ code: 'restore_failed' }, 503);
  }
}
