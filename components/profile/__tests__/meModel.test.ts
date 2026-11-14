import { describe, expect, it } from 'vitest';
import { formatPublishedDate } from '../meModel';
describe('formatPublishedDate', () => {
  it('한국 시간 날짜로', () => {
    expect(formatPublishedDate('2026-03-07T16:30:00Z')).toBe('2026년 3월 8일');
  });
  it('없거나 잘못되면 null', () => {
    expect(formatPublishedDate(null)).toBeNull();
    expect(formatPublishedDate('nope')).toBeNull();
  });
});
