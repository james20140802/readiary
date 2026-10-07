import { createHash, createHmac } from 'node:crypto';
import { emailAdmin } from './server';
import { UUID } from './consent';
export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
export function validToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** No route or scheduler calls this adapter until a separate campaign is approved. */
export async function sendMarketingEmail(input: {
  userId: string;
  deliveryId: string;
  subject: string;
  text: string;
}) {
  if (process.env.EMAIL_MARKETING_SEND_ENABLED !== 'true') return { status: 'disabled' as const };
  const key = process.env.RESEND_API_KEY;
  const secret = process.env.EMAIL_UNSUBSCRIBE_SECRET;
  const from = process.env.EMAIL_MARKETING_FROM;
  const senderInfo = process.env.EMAIL_MARKETING_SENDER_INFO;
  const origin = process.env.EMAIL_PUBLIC_ORIGIN;
  if (
    !key ||
    !secret ||
    secret.length < 32 ||
    !from ||
    !senderInfo ||
    !origin ||
    new URL(origin).protocol !== 'https:'
  )
    throw new Error('Marketing email configuration incomplete');
  if (!UUID.test(input.deliveryId) || !UUID.test(input.userId) || /[\r\n]/.test(input.subject))
    throw new Error('Invalid delivery');
  const token = createHmac('sha256', secret)
    .update(`email-unsubscribe:${input.deliveryId}`)
    .digest('base64url');
  // Fragment keeps the bearer token out of page request/access logs. Only POST carries it.
  const link = `${new URL(origin).origin}/email/unsubscribe#${token}`;
  const oneClick = `${new URL(origin).origin}/api/email-unsubscribe?token=${token}`;
  const subject = input.subject.startsWith('(광고)') ? input.subject : `(광고) ${input.subject}`;
  const text = `${input.text}\n\n${senderInfo}\nReadiary 이메일 소식 수신을 선택하셔서 보내드립니다.\n수신거부: ${link}`;
  const contentHash = tokenHash(JSON.stringify({ from, subject, text, oneClick }));
  const db = emailAdmin();
  const { data: claim, error } = await db.rpc('claim_marketing_email', {
    p_user: input.userId,
    p_id: input.deliveryId,
    p_content_hash: contentHash,
    p_token_hash: tokenHash(token),
  });
  if (error) throw new Error('Delivery cannot be claimed');
  if (!claim) return { status: 'excluded' as const };
  if (claim.sent) return { status: 'sent' as const, id: claim.provider_id as string };
  // Claim locks the account row; check again immediately before handing off to the provider.
  const { data: preference, error: readError } = await db
    .from('email_preferences')
    .select('enabled,email,version')
    .eq('user_id', input.userId)
    .maybeSingle();
  if (
    readError ||
    !preference?.enabled ||
    preference.email !== claim.email ||
    preference.version !== claim.version
  )
    return { status: 'excluded' as const };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `marketing/${input.deliveryId}`,
      },
      body: JSON.stringify({
        from,
        to: [claim.email],
        subject,
        text,
        headers: {
          'List-Unsubscribe': `<${oneClick}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || typeof result?.id !== 'string') throw new Error('Provider outcome unknown');
    const saved = await db
      .from('email_deliveries')
      .update({ status: 'sent', provider_id: result.id })
      .eq('id', input.deliveryId);
    if (saved.error) throw new Error('Delivery result was not persisted');
    return { status: 'sent' as const, id: result.id as string };
  } catch {
    await db.from('email_deliveries').update({ status: 'unknown' }).eq('id', input.deliveryId);
    // Never log provider response, recipient, body, or bearer URL.
    throw new Error(
      'Email result unknown; retry the same delivery ID within 23 hours or review manually'
    );
  }
}
