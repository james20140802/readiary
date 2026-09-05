import { afterEach, describe, expect, it } from 'vitest';
import { emailConfirmRedirectTo } from '../emailRedirect';

const ORIGIN = 'https://readiary.test';

describe('emailConfirmRedirectTo', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_EMAIL_REDIRECT_TO;
  });

  it('복귀 경로가 없으면 착지 주소 그대로', () => {
    expect(emailConfirmRedirectTo(ORIGIN)).toBe('https://readiary.test/auth/confirm');
    expect(emailConfirmRedirectTo(ORIGIN, null)).toBe('https://readiary.test/auth/confirm');
  });

  it('검증을 통과한 복귀 경로는 next 로 싣는다', () => {
    expect(emailConfirmRedirectTo(ORIGIN, '/invite/gildong-1234')).toBe(
      'https://readiary.test/auth/confirm?next=%2Finvite%2Fgildong-1234'
    );
  });

  it('거절되는 값(외부 오리진)·기본 목적지는 싣지 않는다', () => {
    expect(emailConfirmRedirectTo(ORIGIN, 'https://evil.test')).toBe(
      'https://readiary.test/auth/confirm'
    );
    expect(emailConfirmRedirectTo(ORIGIN, '/protected/dashboard')).toBe(
      'https://readiary.test/auth/confirm'
    );
  });

  it('환경 변수로 착지를 바꿔도 next 는 그 위에 붙는다', () => {
    process.env.NEXT_PUBLIC_EMAIL_REDIRECT_TO = 'https://www.readiary.net/auth/confirm';
    expect(emailConfirmRedirectTo(ORIGIN, '/invite/x')).toBe(
      'https://www.readiary.net/auth/confirm?next=%2Finvite%2Fx'
    );
  });
});
