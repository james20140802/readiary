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
