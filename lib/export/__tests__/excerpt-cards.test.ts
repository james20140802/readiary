import { describe, expect, it } from 'vitest';
import { layoutQuote, QUOTE_TIERS, startingTier } from '../excerpt-cards';

const LAST = QUOTE_TIERS.length - 1;
/** 글자 수로 꾸민 칸 — 큰 단계일수록 덜 들어간다 */
const fitsWithin = (limits: number[]) => (text: string, tier: number) =>
  [...text].length <= limits[tier];
const noSpace = (text: string) => text.replace(/\s/g, '');

describe('startingTier', () => {
  it('짧을수록 큰 글자에서 시작한다', () => {
    expect(startingTier('짧은 문장')).toBe(0);
    expect(startingTier('가'.repeat(150))).toBe(1);
    expect(startingTier('가'.repeat(900))).toBe(LAST);
  });

  it('글자 수가 적어도 줄이 많으면 작은 글자에서 시작한다', () => {
    expect(startingTier(Array(6).fill('줄').join('\n'))).toBe(1);
    expect(startingTier(Array(12).fill('줄').join('\n'))).toBe(LAST);
  });
});

describe('layoutQuote', () => {
  it('시작 단계에 들어가면 한 장이다', () => {
    expect(layoutQuote('짧은 문장', () => true)).toEqual([
      { text: '짧은 문장', tier: 0, part: 1, parts: 1 },
    ]);
  });

  it('넘치면 나누기 전에 글자를 먼저 줄인다', () => {
    const pages = layoutQuote('가'.repeat(60), fitsWithin([10, 40, 100]));
    expect(pages).toEqual([{ text: '가'.repeat(60), tier: LAST, part: 1, parts: 1 }]);
  });

  it('가장 작은 글자로도 넘치면 나누고, 글자를 하나도 잃지 않는다', () => {
    const quote = Array.from({ length: 40 }, (_, i) => `${i + 1}번째 문장입니다.`).join(' ');
    const pages = layoutQuote(quote, fitsWithin([10, 20, 100]));
    expect(pages.length).toBeGreaterThan(1);
    expect(noSpace(pages.map((page) => page.text).join(''))).toBe(noSpace(quote));
    pages.forEach((page, index) => {
      expect(page.tier).toBe(LAST);
      expect(page.part).toBe(index + 1);
      expect(page.parts).toBe(pages.length);
      expect([...page.text].length).toBeLessThanOrEqual(100);
    });
  });

  it('문장이 끝나는 곳에서 먼저 나눈다', () => {
    const first = '가'.repeat(70) + '.';
    const pages = layoutQuote(
      `${first} ${'나'.repeat(25)} ${'다'.repeat(90)}`,
      fitsWithin([1, 1, 100])
    );
    expect(pages[0].text).toBe(first);
  });

  it('줄바꿈은 문장 끝보다 먼저 나누는 자리가 된다', () => {
    const pages = layoutQuote(
      `${'가'.repeat(70)}\n${'나'.repeat(10)}. ${'다'.repeat(90)}`,
      fitsWithin([1, 1, 100])
    );
    expect(pages[0].text).toBe('가'.repeat(70));
  });

  it('나눌 자리가 없으면 칸이 찰 때까지 담고 이모지를 쪼개지 않는다', () => {
    const quote = '👩‍👩‍👧'.repeat(30);
    const pages = layoutQuote(quote, (text, tier) =>
      tier === LAST ? [...new Intl.Segmenter('ko').segment(text)].length <= 12 : false
    );
    expect(pages.map((page) => page.text).join('')).toBe(quote);
    for (const page of pages) expect(page.text.length % '👩‍👩‍👧'.length).toBe(0);
  });

  it('한 글자도 들어가지 않으면 멈춘다', () => {
    expect(() => layoutQuote('가나다', () => false)).toThrow('quote-too-tall');
  });
});
