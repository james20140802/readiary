import { describe, expect, it } from 'vitest';
import { isUuid } from '../validation';

describe('isUuid', () => {
  it('정상 UUID v4를 통과시킨다', () => {
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
  });
  it('대문자 UUID도 통과시킨다', () => {
    expect(isUuid('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
  });
  it('형식이 아니면 거부한다', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid('123e4567e89b42d3a456426614174000')).toBe(false);
    expect(isUuid("123e4567-e89b-42d3-a456-426614174000'; drop table entries;--")).toBe(false);
  });
});
