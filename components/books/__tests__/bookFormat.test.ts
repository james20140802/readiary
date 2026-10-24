import { describe, expect, it } from 'vitest';
import { splitTitle, titleTier } from '../bookFormat';

describe('splitTitle', () => {
  it('쌍점 뒤의 부제를 뗀다', () => {
    expect(splitTitle('예루살렘의 아이히만: 악의 평범성에 대한 보고서')).toEqual({
      main: '예루살렘의 아이히만',
      sub: '악의 평범성에 대한 보고서',
    });
  });
  it('띄어 쓴 줄표 뒤의 부제를 뗀다', () => {
    expect(splitTitle('코스모스 — 특별판')).toEqual({ main: '코스모스', sub: '특별판' });
  });
  it('부제가 없거나 앞부분이 너무 짧으면 그대로', () => {
    expect(splitTitle('도덕의 계보')).toEqual({ main: '도덕의 계보', sub: null });
    expect(splitTitle('나: 회고')).toEqual({ main: '나: 회고', sub: null });
    expect(splitTitle('A-Z 영어')).toEqual({ main: 'A-Z 영어', sub: null });
  });
});

describe('titleTier', () => {
  it('길수록 작은 단계', () => {
    expect(titleTier('도덕의 계보')).toBe('lg');
    expect(titleTier('예루살렘의 아이히만 악의 평범성')).toBe('md');
    expect(titleTier('예루살렘의 아이히만 악의 평범성에 대한 보고서')).toBe('sm');
  });
});
