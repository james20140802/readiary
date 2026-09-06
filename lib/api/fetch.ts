import { authHrefWithRedirect } from '@/lib/auth/safeRedirect';
import { createSupabaseClient } from '@/lib/supabase/client';

/** 로그인 화면이 "세션이 만료되었습니다" 안내를 띄우는 표식 — `/login?error=session-expired` */
export const SESSION_EXPIRED_ERROR_PARAM = 'session-expired';

/** 세션이 끊겨 로그인 화면으로 보내는 중임을 호출자에게 알린다.
 *  받은 쪽은 이미 페이지가 이동하고 있으니 뒷일을 더 하지 않으면 된다 */
export class SessionExpiredError extends Error {
  constructor() {
    super('세션이 만료되어 로그인 화면으로 이동합니다.');
    this.name = 'SessionExpiredError';
  }
}

/** 여러 요청이 동시에 401 을 받아도 로그인 화면으로는 한 번만 보낸다 */
let redirecting = false;

/** 브라우저에서 `/api/*` 를 부를 때 쓰는 공용 fetch.
 *
 *  401 이면 세션 갱신을 한 번 시도하고 같은 요청을 다시 보낸다 — 백그라운드 탭에서 access token 만
 *  만료된 경우는 여기서 살아난다. 그래도 401 이면 세션이 진짜로 끊긴 것이므로 현재 경로를
 *  `redirect` 에 실어 `/login` 으로 보내고 `SessionExpiredError` 를 던진다.
 *  그 외 응답은 `fetch` 와 똑같이 그대로 돌려준다 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status !== 401) return res;

  if (canRetry(init) && (await refreshSession())) {
    const retried = await fetch(input, init);
    if (retried.status !== 401) return retried;
  }

  redirectToLogin();
  throw new SessionExpiredError();
}

/** 스트림 본문은 한 번 읽히면 다시 보낼 수 없다 — 이 앱은 JSON 문자열만 보내지만 안전장치로 */
function canRetry(init?: RequestInit): boolean {
  return !(typeof ReadableStream !== 'undefined' && init?.body instanceof ReadableStream);
}

async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await createSupabaseClient().auth.refreshSession();
    return !error && data.session !== null;
  } catch {
    return false;
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined' || redirecting) return;
  redirecting = true;

  const here = window.location.pathname + window.location.search;
  const href = authHrefWithRedirect('/login', here);
  const separator = href.includes('?') ? '&' : '?';
  window.location.assign(`${href}${separator}error=${SESSION_EXPIRED_ERROR_PARAM}`);
}
