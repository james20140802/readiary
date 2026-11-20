import { describe, expect, it } from 'vitest';
import { isHeic, isImageFile } from '../image';

describe('isHeic', () => {
  it('형식 이름이나 확장자로 HEIC·HEIF를 알아본다', () => {
    expect(isHeic({ type: 'image/heic', name: 'a' })).toBe(true);
    expect(isHeic({ type: 'image/heif', name: 'x' })).toBe(true);
    expect(isHeic({ type: 'image/heic-sequence', name: 'x' })).toBe(true);
    // Chrome은 HEIC의 형식 이름을 비워 두기도 한다
    expect(isHeic({ type: '', name: 'IMG_1.HEIC' })).toBe(true);
    expect(isHeic({ type: '', name: 'photo.heif' })).toBe(true);
  });

  it('다른 사진은 HEIC이 아니다', () => {
    expect(isHeic({ type: 'image/jpeg', name: 'heic.jpg' })).toBe(false);
    expect(isHeic({ type: '', name: 'heic' })).toBe(false);
  });
});

describe('isImageFile', () => {
  it('끌어다 놓은 파일이 사진인지 가린다', () => {
    expect(isImageFile({ type: 'image/png', name: 'a.png' })).toBe(true);
    expect(isImageFile({ type: '', name: 'IMG_1.HEIC' })).toBe(true);
    expect(isImageFile({ type: 'application/pdf', name: 'a.pdf' })).toBe(false);
    expect(isImageFile({ type: '', name: 'notes.txt' })).toBe(false);
  });
});
