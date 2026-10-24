import { describe, expect, it } from 'vitest';
import { maskEmail } from '../maskEmail';

describe('maskEmail', () => {
  it('앞 네 글자만 보인다', () => {
    expect(maskEmail('reader@example.com')).toBe('read•••@example.com');
  });
  it('짧은 주소는 한 글자 이상 가린다', () => {
    expect(maskEmail('ab@x.io')).toBe('a•••@x.io');
    expect(maskEmail('abc@x.io')).toBe('a•••@x.io');
    expect(maskEmail('abcde@x.io')).toBe('abc•••@x.io');
  });
  it('없거나 모양이 아니면 null', () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail('nope')).toBeNull();
  });
});
