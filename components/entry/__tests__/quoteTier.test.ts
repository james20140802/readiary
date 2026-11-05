import { describe, expect, it } from 'vitest';
import { quoteTier } from '../quoteTier';

const chars = (n: number) => '가'.repeat(n);

describe('quoteTier', () => {
  it('글이 길수록 한 단계씩 작아진다', () => {
    expect(quoteTier(chars(70))).toBe('lg');
    expect(quoteTier(chars(71))).toBe('md');
    expect(quoteTier(chars(126))).toBe('md');
    expect(quoteTier(chars(127))).toBe('sm');
    expect(quoteTier(chars(182))).toBe('sm');
    expect(quoteTier(chars(183))).toBe('xs');
  });

  it('줄을 많이 바꾼 짧은 시는 글자 수가 적어도 줄 수만큼 작아진다', () => {
    expect(quoteTier(Array(6).fill('가나다').join('\n'))).toBe('md');
    expect(quoteTier(Array(14).fill('가나다').join('\n'))).toBe('xs');
  });

  it('빈 줄도 한 줄을 차지하고 앞뒤 공백은 세지 않는다', () => {
    expect(quoteTier('가\n\n\n\n\n나')).toBe('md');
    expect(quoteTier(`\n\n\n\n\n\n${chars(10)}\n\n\n\n\n\n`)).toBe('lg');
  });
});
