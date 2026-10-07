import { createSupabaseServerClient } from '@/lib/supabase/server';
import { unauthorized } from '@/lib/api/auth';
import { validConsentChange } from '@/lib/email/consent';
import {
  emailAdmin,
  emailConsentAvailable,
  emailReply,
  emailSameOrigin,
  consentError,
  publicPreferences,
  saveConsent,
} from '@/lib/email/server';
export async function GET() {
  try {
    const client = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return unauthorized();
    if (!emailConsentAvailable() && !process.env.SUPABASE_SERVICE_ROLE_KEY)
      return emailReply({ available: false });
    const result = await emailAdmin()
      .from('email_preferences')
      .select('enabled,email,version,consented_at,withdrawn_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (['42P01', 'PGRST205'].includes(result.error?.code ?? '') && !emailConsentAvailable())
      return emailReply({ available: false });
    if (result.error) return emailReply({ error: '이메일 설정을 불러오지 못했습니다.' }, 503);
    return emailReply({
      accountId: user.id,
      available: emailConsentAvailable(),
      preferences: publicPreferences(result.data),
      email: user.email ?? null,
      confirmed: !!user.email_confirmed_at,
    });
  } catch {
    return emailReply({ error: '이메일 설정을 불러오지 못했습니다.' }, 503);
  }
}
export async function PUT(req: Request) {
  if (!emailSameOrigin(req)) return emailReply({ error: '허용되지 않은 요청입니다.' }, 403);
  try {
    const client = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error || !user) return unauthorized();
    const body = await req.json().catch(() => null);
    if (!validConsentChange(body))
      return emailReply({ error: '선택 내용을 다시 확인해 주세요.' }, 400);
    if (body.accountId !== user.id)
      return emailReply(
        { code: 'consent_conflict', error: '계정이 바뀌었습니다. 최신 설정을 확인해 주세요.' },
        409
      );
    // Withdrawal remains available during a collection pause.
    if (body.enabled && !emailConsentAvailable())
      return emailReply({ error: '이메일 소식 신청을 준비 중입니다.' }, 503);
    const saved = await saveConsent(user.id, body);
    if (saved.error) return consentError(saved.error);
    return emailReply({ preferences: publicPreferences(saved.data) });
  } catch {
    return emailReply({ error: '이메일 설정을 저장하지 못했습니다.' }, 503);
  }
}
