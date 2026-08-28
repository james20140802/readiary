const DEFAULT_REDIRECT = '/protected/dashboard';

/** 로그인 후 복귀 경로 검증: 같은 오리진의 절대 경로만 허용. 그 외엔 기본 경로. */
export function sanitizeRedirectPath(param: string | null): string {
  if (!param) return DEFAULT_REDIRECT;
  if (!param.startsWith('/')) return DEFAULT_REDIRECT;
  if (param.startsWith('//')) return DEFAULT_REDIRECT;
  if (param.includes('\\')) return DEFAULT_REDIRECT;
  return param;
}
