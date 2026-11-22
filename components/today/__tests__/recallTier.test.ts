import { describe, expect, it } from 'vitest';
import { recallTier } from '../recallTier';

const chars = (n: number) => '가'.repeat(n);

describe('recallTier — 회상 간지 문장은 길수록 작게 써서 간지 높이를 고르게 한다', () => {
  it('세 줄 안에 드는 짧은 문장은 큰 글자로 쓴다', () => {
    expect(recallTier(chars(10))).toBe('lg');
    expect(recallTier(chars(39))).toBe('lg');
  });

  it('조금 넘치면 한 단계 작게, 더 길면 더 작게 쓴다', () => {
    expect(recallTier(chars(50))).toBe('md');
    expect(recallTier(chars(64))).toBe('sm');
    expect(recallTier(chars(200))).toBe('xs');
  });

  it('간지는 줄바꿈을 이어 쓰므로 줄바꿈은 한 칸 띄움으로 센다', () => {
    expect(recallTier(Array(8).fill('가나다').join('\n'))).toBe('lg');
    expect(recallTier(`${chars(30)}\n${chars(20)}`)).toBe('md');
  });

  it('앞뒤 공백은 세지 않는다', () => {
    expect(recallTier(`\n\n${chars(10)}\n\n`)).toBe('lg');
  });
});
