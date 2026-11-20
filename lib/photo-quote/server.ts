import type { User } from '@supabase/supabase-js';
import { unauthorized } from '@/lib/api/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { photoQuoteVisible, type PhotoTextErrorCode } from './config';

const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0' };

export function photoReply(data: unknown, status = 200) {
  return Response.json(data, { status, headers: NO_STORE });
}

const MESSAGES: Record<PhotoTextErrorCode, [status: number, error: string]> = {
  consent_required: [403, '사진 글자 읽기에 먼저 동의해 주세요.'],
  daily_limit: [429, '오늘은 사진을 더 읽을 수 없어요. 내일 다시 쓸 수 있어요.'],
  too_large: [413, '사진이 너무 커요.'],
  read_failed: [502, '글자를 읽지 못했어요.'],
  disabled: [404, '지금은 쓸 수 없는 기능이에요.'],
};

export function photoError(code: PhotoTextErrorCode) {
  const [status, error] = MESSAGES[code];
  return photoReply({ code, error }, status);
}

/** 서버에서만 읽는 Vision 키. 기능이 꺼져 있거나 키가 없으면 null */
export function visionKey(): string | null {
  const key = process.env.GOOGLE_VISION_API_KEY;
  return photoQuoteVisible() && key ? key : null;
}

/** 다른 사이트가 사용자의 쿠키로 동의를 남기거나 철회하지 못하게 한다(lib/push/server.ts와 같은 규칙) */
export function photoSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** 로그인한 사용자와 그 세션의 클라이언트. 로그인이 없으면 401 응답을 돌려준다 */
export async function photoSession(): Promise<
  { client: Client; user: User; response?: undefined } | { response: Response }
> {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return { response: unauthorized() };
  return { client, user };
}
