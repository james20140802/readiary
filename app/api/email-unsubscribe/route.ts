import { emailAdmin, emailReply, emailSameOrigin } from '@/lib/email/server';
import { tokenHash, validToken } from '@/lib/email/delivery';
export async function POST(req: Request) {
  const url = new URL(req.url);
  let token: unknown;
  if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
    const body = new URLSearchParams(await req.text());
    if (body.get('List-Unsubscribe') !== 'One-Click')
      return emailReply({ error: '잘못된 요청입니다.' }, 400);
    token = url.searchParams.get('token');
  } else {
    if (!emailSameOrigin(req)) return emailReply({ error: '허용되지 않은 요청입니다.' }, 403);
    token = (await req.json().catch(() => null))?.token;
  }
  if (!validToken(token)) return emailReply({ error: '수신거부 링크를 확인해 주세요.' }, 400);
  try {
    const { data, error } = await emailAdmin().rpc('withdraw_email_by_token', {
      p_hash: tokenHash(token),
    });
    if (error) return emailReply({ error: '처리하지 못했습니다. 다시 시도해 주세요.' }, 503);
    if (!data)
      return emailReply(
        { error: '사용할 수 없는 링크입니다. 알림 설정에서 변경하거나 문의해 주세요.' },
        400
      );
    return emailReply({
      ok: true,
      message: 'Readiary 소식·이벤트 이메일 수신거부가 처리되었습니다.',
    });
  } catch {
    return emailReply({ error: '처리하지 못했습니다. 다시 시도해 주세요.' }, 503);
  }
}
// Link scanners and browser GETs never withdraw consent; carry the token into a fragment.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  const target = new URL('/email/unsubscribe', req.url);
  if (validToken(token)) target.hash = token;
  return new Response(null, {
    status: 303,
    headers: {
      Location: target.toString(),
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
