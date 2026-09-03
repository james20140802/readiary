import { describe, expect, it } from 'vitest';
import { MAX_NICKNAME_LENGTH, NICKNAME_PATTERN, validateNickname } from '../nickname';

describe('validateNickname', () => {
  it('영어·숫자·언더스코어 조합은 통과한다', () => {
    expect(validateNickname('book_worm_42')).toBeNull();
  });

  it('하이픈이 섞이면 거부한다 (친구 프로필 슬러그 파싱이 깨지므로)', () => {
    expect(validateNickname('anne-marie')).not.toBeNull();
  });

  it('빈 문자열은 거부한다', () => {
    expect(validateNickname('')).not.toBeNull();
  });

  it(`${MAX_NICKNAME_LENGTH}자를 넘으면 거부한다`, () => {
    const tooLong = 'a'.repeat(MAX_NICKNAME_LENGTH + 1);
    expect(validateNickname(tooLong)).not.toBeNull();
    expect(validateNickname('a'.repeat(MAX_NICKNAME_LENGTH))).toBeNull();
  });

  it('한글 등 유니코드 문자는 거부한다', () => {
    expect(validateNickname('책벌레')).not.toBeNull();
  });

  it('NICKNAME_PATTERN과 동일한 규칙으로 판정한다', () => {
    expect(NICKNAME_PATTERN.test('valid_123')).toBe(true);
    expect(NICKNAME_PATTERN.test('invalid-name')).toBe(false);
  });
});
