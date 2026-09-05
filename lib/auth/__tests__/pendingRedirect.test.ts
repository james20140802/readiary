import { describe, expect, it } from 'vitest';
import {
  PENDING_REDIRECT_KEY,
  readPendingRedirect,
  toPendingRedirect,
} from '@/lib/auth/pendingRedirect';

describe('toPendingRedirect — 가입 때 메타데이터에 실을 값', () => {
  it('같은 오리진 절대 경로는 그대로 싣는다', () => {
    expect(toPendingRedirect('/invite/gildong-1234')).toBe('/invite/gildong-1234');
  });

  it('없으면 싣지 않는다', () => {
    expect(toPendingRedirect(null)).toBeNull();
    expect(toPendingRedirect('')).toBeNull();
  });

  it('외부 주소·프로토콜 상대 경로·백슬래시는 싣지 않는다', () => {
    expect(toPendingRedirect('https://evil.test/x')).toBeNull();
    expect(toPendingRedirect('//evil.test')).toBeNull();
    expect(toPendingRedirect('/inv\\ite')).toBeNull();
  });
});

describe('readPendingRedirect — user_metadata에서 복귀 경로 읽기', () => {
  it('검증을 통과한 문자열만 돌려준다', () => {
    expect(readPendingRedirect({ [PENDING_REDIRECT_KEY]: '/invite/gildong-1234' })).toBe(
      '/invite/gildong-1234'
    );
  });

  it('메타데이터가 없거나 키가 없으면 null', () => {
    expect(readPendingRedirect(undefined)).toBeNull();
    expect(readPendingRedirect(null)).toBeNull();
    expect(readPendingRedirect({})).toBeNull();
    expect(readPendingRedirect({ [PENDING_REDIRECT_KEY]: null })).toBeNull();
  });

  it('문자열이 아니거나 검증에 실패하면 null — 메타데이터는 사용자가 고칠 수 있는 값이다', () => {
    expect(readPendingRedirect({ [PENDING_REDIRECT_KEY]: 42 })).toBeNull();
    expect(readPendingRedirect({ [PENDING_REDIRECT_KEY]: ['/invite/x'] })).toBeNull();
    expect(readPendingRedirect({ [PENDING_REDIRECT_KEY]: 'https://evil.test' })).toBeNull();
    expect(readPendingRedirect({ [PENDING_REDIRECT_KEY]: '//evil.test' })).toBeNull();
  });
});

describe('제어문자 변종은 싣지도 읽지도 않는다 — URL 파서가 탭·개행을 지워 외부 오리진으로 풀린다', () => {
  const TAB = String.fromCharCode(9);
  it('toPendingRedirect', () => {
    expect(toPendingRedirect(`/${TAB}/evil.test/x`)).toBeNull();
  });
  it('readPendingRedirect', () => {
    expect(readPendingRedirect({ [PENDING_REDIRECT_KEY]: `/${TAB}/evil.test/x` })).toBeNull();
  });
});
