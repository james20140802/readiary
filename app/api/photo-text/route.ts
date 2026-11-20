import { PHOTO_TEXT_COPY_VERSION, PHOTO_TEXT_MAX_BYTES } from '@/lib/photo-quote/config';
import { photoError, photoReply, photoSession, visionKey } from '@/lib/photo-quote/server';
import { readPhotoText } from '@/lib/photo-quote/vision';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * 책 페이지 사진(JPEG 바이트)을 받아 Google Vision으로 글자를 읽고 낱말 좌표만 돌려준다.
 * 사진과 읽은 글은 저장하지도 로그에 남기지도 않는다 — 남기는 것은 사용자 id와 결과 종류뿐이다.
 * 순서: 로그인 → 기능 켜짐 → 형식·크기 → 동의 확인과 하루 횟수(한 번의 RPC) → Vision.
 * 동의하지 않은 사람의 사진은 Google로 가지 않는다.
 */
export async function POST(request: Request) {
  const session = await photoSession();
  if (session.response) return session.response;
  const { client, user } = session;

  const key = visionKey();
  if (!key) return photoError('disabled');

  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('image/jpeg'))
    return photoReply({ error: 'JPEG 사진만 받을 수 있어요.' }, 400);

  // 길이 헤더는 믿지 않는다 — 실제로 받은 바이트로 잰다. 한도를 넘는 사진은 횟수를 쓰지 않는다.
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch {
    return photoReply({ error: '사진을 받지 못했어요.' }, 400);
  }
  if (bytes.byteLength === 0) return photoReply({ error: '사진을 받지 못했어요.' }, 400);
  if (bytes.byteLength > PHOTO_TEXT_MAX_BYTES) return photoError('too_large');

  const gate = await client.rpc('begin_photo_text_read', { p_version: PHOTO_TEXT_COPY_VERSION });
  if (
    gate.error ||
    (gate.data !== 'ok' && gate.data !== 'consent_required' && gate.data !== 'daily_limit')
  ) {
    console.error('photo-text gate failed', { user: user.id });
    return photoReply({ error: '잠시 뒤 다시 시도해 주세요.' }, 503);
  }
  if (gate.data !== 'ok') return photoError(gate.data);

  try {
    // 읽기에 실패해도 횟수는 되돌리지 않는다 — 실패를 반복시켜 호출을 쌓지 못하게 한다.
    return photoReply(await readPhotoText(bytes, key, request.signal));
  } catch (error) {
    console.error('photo-text read failed', {
      user: user.id,
      reason: error instanceof Error ? error.message : 'unknown',
    });
    return photoError('read_failed');
  }
}
