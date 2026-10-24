import { describe, expect, it } from 'vitest';
import { originalCoverUrl } from '../coverUrl';

const THUMB =
  'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F525352%3Ftimestamp%3D20260829111003';

describe('originalCoverUrl', () => {
  it('카카오 썸네일을 그 안의 다음 원본 표지(https)로 바꾼다', () => {
    expect(originalCoverUrl(THUMB)).toBe(
      'https://t1.daumcdn.net/lbook/image/525352?timestamp=20260829111003'
    );
  });

  it('timestamp가 없는 원본도 바꾼다', () => {
    const thumb =
      'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=http%3A%2F%2Ft1.daumcdn.net%2Flbook%2Fimage%2F42';
    expect(originalCoverUrl(thumb)).toBe('https://t1.daumcdn.net/lbook/image/42');
  });

  it('이미 원본이거나 다른 곳의 주소는 그대로 둔다', () => {
    const original = 'https://t1.daumcdn.net/lbook/image/525352?timestamp=20260829111003';
    expect(originalCoverUrl(original)).toBe(original);
    expect(originalCoverUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg');
  });

  it('fname이 다음 책 이미지가 아니면 바꾸지 않는다', () => {
    const elsewhere =
      'https://search1.kakaocdn.net/thumb/R120x174.q85/?fname=https%3A%2F%2Fevil.example%2Fx.jpg';
    expect(originalCoverUrl(elsewhere)).toBe(elsewhere);
    const noFname = 'https://search1.kakaocdn.net/thumb/R120x174.q85/?x=1';
    expect(originalCoverUrl(noFname)).toBe(noFname);
  });

  it('빈 값은 그대로 둔다(없음은 null)', () => {
    expect(originalCoverUrl(null)).toBeNull();
    expect(originalCoverUrl(undefined)).toBeNull();
    expect(originalCoverUrl('')).toBe('');
  });
});
