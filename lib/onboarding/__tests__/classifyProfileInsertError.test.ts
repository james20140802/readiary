import { describe, expect, it } from 'vitest';
import { classifyProfileInsertError } from '../classifyProfileInsertError';

describe('classifyProfileInsertError', () => {
  it('pkey 유니크 위반은 profile_exists', () => {
    expect(
      classifyProfileInsertError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_pkey"',
      })
    ).toBe('profile_exists');
  });

  it('nickname_tag 유니크 위반은 tag_conflict', () => {
    expect(
      classifyProfileInsertError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "profiles_nickname_tag_key"',
      })
    ).toBe('tag_conflict');
  });

  it('알 수 없는 제약의 23505는 unknown', () => {
    expect(
      classifyProfileInsertError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "other_key"',
      })
    ).toBe('unknown');
  });

  it('23505가 아닌 에러는 메시지에 duplicate key가 있어도 unknown', () => {
    expect(classifyProfileInsertError({ code: '42501', message: 'duplicate key mention' })).toBe(
      'unknown'
    );
  });

  it('null/undefined/빈 객체는 unknown', () => {
    expect(classifyProfileInsertError(null)).toBe('unknown');
    expect(classifyProfileInsertError(undefined)).toBe('unknown');
    expect(classifyProfileInsertError({})).toBe('unknown');
  });
});
