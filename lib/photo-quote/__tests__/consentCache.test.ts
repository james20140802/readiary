import { beforeEach, describe, expect, it } from 'vitest';
import {
  forgetPhotoTextConsent,
  photoConsentKnown,
  rememberPhotoConsent,
  setPhotoConsentOwner,
} from '../consentCache';

beforeEach(() => {
  setPhotoConsentOwner(null);
  forgetPhotoTextConsent();
});

describe('사진 글자 읽기 동의 기억', () => {
  it('확인한 동의는 같은 계정에서 기억한다 — 토큰만 갱신돼도 그대로다', () => {
    setPhotoConsentOwner('a');
    rememberPhotoConsent(true);
    setPhotoConsentOwner('a');
    expect(photoConsentKnown()).toBe(true);
  });

  it('같은 탭에서 다른 계정으로 바뀌면 잊는다 — 앞 사람의 동의로 동의 화면을 건너뛰지 않는다', () => {
    setPhotoConsentOwner('a');
    rememberPhotoConsent(true);
    setPhotoConsentOwner('b');
    expect(photoConsentKnown()).toBe(false);
  });

  it('로그아웃하면 잊고, 같은 계정으로 다시 들어와도 다시 확인한다', () => {
    setPhotoConsentOwner('a');
    rememberPhotoConsent(true);
    setPhotoConsentOwner(null);
    setPhotoConsentOwner('a');
    expect(photoConsentKnown()).toBe(false);
  });

  it('철회하면 잊는다', () => {
    setPhotoConsentOwner('a');
    rememberPhotoConsent(true);
    forgetPhotoTextConsent();
    expect(photoConsentKnown()).toBe(false);
  });
});
