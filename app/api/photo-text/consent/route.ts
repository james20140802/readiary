import { PHOTO_TEXT_COPY_VERSION, photoQuoteVisible } from '@/lib/photo-quote/config';
import { photoError, photoReply, photoSameOrigin, photoSession } from '@/lib/photo-quote/server';

const FAILED = { error: '잠시 뒤 다시 시도해 주세요.' };
const FORBIDDEN = { error: '허용되지 않은 요청입니다.' };

/** 지금 판의 문구에 동의했는지. 버튼을 누를 때와 설정에서 열 때만 부른다 */
export async function GET() {
  const session = await photoSession();
  if (session.response) return session.response;
  const { data, error } = await session.client.rpc('photo_text_consented', {
    p_version: PHOTO_TEXT_COPY_VERSION,
  });
  if (error) return photoReply(FAILED, 503);
  return photoReply({ consented: data === true });
}

/** 동의를 남긴다 */
export async function POST(request: Request) {
  if (!photoSameOrigin(request)) return photoReply(FORBIDDEN, 403);
  const session = await photoSession();
  if (session.response) return session.response;
  if (!photoQuoteVisible()) return photoError('disabled');
  const { error } = await session.client.rpc('set_photo_text_consent', {
    p_version: PHOTO_TEXT_COPY_VERSION,
  });
  if (error) return photoReply(FAILED, 503);
  return photoReply({ consented: true });
}

/** 동의를 철회한다 — 기능이 꺼져 있어도 언제나 할 수 있다 */
export async function DELETE(request: Request) {
  if (!photoSameOrigin(request)) return photoReply(FORBIDDEN, 403);
  const session = await photoSession();
  if (session.response) return session.response;
  const { error } = await session.client.rpc('withdraw_photo_text_consent');
  if (error) return photoReply(FAILED, 503);
  return photoReply({ consented: false });
}
