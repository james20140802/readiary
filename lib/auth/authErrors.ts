/**
 * Supabase Auth 오류 문구를 화면에 보여줄 한국어로 옮긴다.
 * 표에 없는 문구는 레이트리밋만 따로 가려내고, 나머지는 흐름별 기본 문구로 뭉뚱그린다 —
 * 서버 문구를 그대로 노출하면 내부 사정(제공자·설정)이 새어 나간다.
 */

const RATE_LIMIT = /rate limit|too many requests|over_email_send_rate_limit/i;
const RATE_LIMIT_MESSAGE = '시도가 너무 잦습니다. 잠시 후 다시 시도해주세요.';

export type AuthFlow = 'login' | 'signup' | 'reset' | 'updatePassword';

const TABLE: Record<AuthFlow, Record<string, string>> = {
  login: {
    'Invalid login credentials': '이메일 또는 비밀번호가 일치하지 않습니다.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 받은 메일함을 확인해주세요.',
    'Email logins are disabled': '이메일 로그인이 비활성화되어 있습니다.',
  },
  signup: {
    'User already registered': '이미 가입된 이메일입니다.',
    'Invalid email format': '이메일 형식을 확인해주세요.',
    'Unable to validate email address: invalid format': '이메일 형식을 확인해주세요.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'Signups not allowed for this instance': '지금은 가입을 받지 않습니다.',
  },
  reset: {
    'Unable to validate email address: invalid format': '이메일 형식을 확인해주세요.',
  },
  updatePassword: {
    'New password should be different from the old password.':
      '새 비밀번호는 기존 비밀번호와 달라야 합니다.',
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'Auth session missing!': '세션이 만료되었습니다. 다시 시도해주세요.',
  },
};

const FALLBACK: Record<AuthFlow, string> = {
  login: '로그인 중 오류가 발생했습니다.',
  signup: '회원가입 중 오류가 발생했습니다.',
  reset: '재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해주세요.',
  updatePassword: '비밀번호 변경 중 오류가 발생했습니다.',
};

export function describeAuthError(flow: AuthFlow, message: string | undefined | null): string {
  if (message) {
    const known = TABLE[flow][message];
    if (known) return known;
    if (RATE_LIMIT.test(message)) return RATE_LIMIT_MESSAGE;
  }
  return FALLBACK[flow];
}

/** 로그인 실패가 "이메일 미인증"인지 — 이때만 인증 메일 재발송 버튼을 보여준다 */
export function isEmailNotConfirmed(message: string | undefined | null): boolean {
  return message === 'Email not confirmed';
}

/** 서버에 보내기 전 걸러낼 수 있는 것 — 형식만 본다(존재 여부는 서버가 안다) */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  if (!value.trim()) return '이메일을 입력해주세요.';
  if (!EMAIL_PATTERN.test(value.trim())) return '이메일 형식을 확인해주세요.';
  return null;
}

export const MIN_PASSWORD_LENGTH = 6;

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 최소 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  if (password !== confirm) return '비밀번호가 일치하지 않습니다.';
  return null;
}
