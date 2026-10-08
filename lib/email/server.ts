import { createClient } from '@supabase/supabase-js';
import type { EmailPreferences, ConsentChange } from './consent';
import { EMAIL_COPY_VERSION } from './consent';

/** Server modules only: never import this file from a client component. */
export function emailAdmin() {
  if (typeof window !== 'undefined') throw new Error('Server only');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Email storage unavailable');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function emailConsentAvailable() {
  const effective = Date.parse(process.env.EMAIL_CONSENT_EFFECTIVE_AT ?? '');
  return (
    process.env.EMAIL_CONSENT_ENABLED === 'true' &&
    Number.isFinite(effective) &&
    Date.now() >= effective
  );
}
export function emailReply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0', 'Referrer-Policy': 'no-referrer' },
  });
}
export function emailSameOrigin(req: Request) {
  return req.headers.get('origin') === new URL(req.url).origin;
}
export function consentError(error: { message: string; code?: string }) {
  if (/version_conflict|request_conflict|email_conflict/.test(error.message))
    return emailReply(
      {
        code: 'consent_conflict',
        error: '다른 화면에서 설정이 바뀌었습니다. 최신 설정을 확인해 주세요.',
      },
      409
    );
  if (/email_unconfirmed/.test(error.message))
    return emailReply({ error: '이메일 인증을 마친 뒤 선택해 주세요.' }, 400);
  return emailReply({ error: '이메일 설정을 저장하지 못했습니다. 다시 시도해 주세요.' }, 503);
}
export function saveConsent(
  userId: string,
  change: ConsentChange,
  profile?: Record<string, string | null>
) {
  return emailAdmin().rpc('save_email_consent', {
    p_user: userId,
    p_enabled: change.enabled,
    p_request: change.requestId,
    p_expected: change.expectedVersion,
    p_email: change.expectedEmail,
    p_source: profile ? 'onboarding' : 'settings',
    p_copy: EMAIL_COPY_VERSION,
    p_profile: profile ?? null,
  });
}
export function publicPreferences(row: EmailPreferences | null): EmailPreferences {
  return {
    enabled: row?.enabled ?? false,
    email: row?.email ?? null,
    version: row?.version ?? 0,
    consented_at: row?.consented_at ?? null,
    withdrawn_at: row?.withdrawn_at ?? null,
  };
}
