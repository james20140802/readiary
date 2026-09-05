const DEFAULT_REDIRECT = '/protected/dashboard';

/** ASCII 제어문자(탭·개행·NUL 등). WHATWG URL 파서는 탭·LF·CR 을 입력에서 지워 버려서
 *  "/\t/evil.test" 가 "//evil.test" 로 풀린다 — 위치와 무관하게 하나라도 있으면 통째로 거절 */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

/** 파싱 결과의 오리진을 비교할 때만 쓰는 가짜 기준 — 값 자체에는 들어가지 않는다 */
const PROBE_ORIGIN = 'https://redirect.invalid';

/** 로그인 후 복귀 경로 검증: 같은 오리진의 절대 경로만 허용. 그 외엔 기본 경로. */
export function sanitizeRedirectPath(param: string | null): string {
  if (!param) return DEFAULT_REDIRECT;
  if (!param.startsWith('/')) return DEFAULT_REDIRECT;
  if (param.startsWith('//')) return DEFAULT_REDIRECT;
  if (param.includes('\\')) return DEFAULT_REDIRECT;
  if (CONTROL_CHARS.test(param)) return DEFAULT_REDIRECT;

  // 위 문자열 규칙을 다 지나도 브라우저 파서가 다른 오리진으로 풀면 거절 — 규칙이 놓친 변종의 마지막 그물
  try {
    if (new URL(param, PROBE_ORIGIN).origin !== PROBE_ORIGIN) return DEFAULT_REDIRECT;
  } catch {
    return DEFAULT_REDIRECT;
  }
  return param;
}

/** 로그인·가입 화면 사이를 오갈 때(페이지 안 링크, 비로그인 GNB) 복귀 경로를 잃지 않도록 실어 보낸다.
 *  검증을 통과한 경로만 싣고, 기본 경로로 풀리는 값(없음·거절)은 파라미터 없이 base 그대로 */
export function authHrefWithRedirect(base: '/login' | '/signup', param: string | null): string {
  const path = sanitizeRedirectPath(param);
  if (path === DEFAULT_REDIRECT) return base;
  return `${base}?redirect=${encodeURIComponent(path)}`;
}
