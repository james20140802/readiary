import { describe, expect, it } from 'vitest';
import { noteSizeFor, pickQuoteSize, QUOTE_SIZES } from '../card-fit';

describe('pickQuoteSize', () => {
  it('들어가는 가장 큰 글자를 고른다', () => {
    expect(pickQuoteSize((size) => size <= 21)).toBe(21);
    expect(pickQuoteSize(() => true)).toBe(QUOTE_SIZES[0]);
  });

  it('가장 작은 글자로도 넘치면 더 줄이지 않는다 — 카드가 길어진다', () => {
    expect(pickQuoteSize(() => false)).toBe(QUOTE_SIZES[QUOTE_SIZES.length - 1]);
  });
});

describe('noteSizeFor', () => {
  it('생각은 문장보다 작고 읽을 수 있는 크기 아래로 내려가지 않는다', () => {
    for (const size of QUOTE_SIZES) {
      expect(noteSizeFor(size)).toBeLessThan(size);
      expect(noteSizeFor(size)).toBeGreaterThanOrEqual(13);
    }
  });
});
