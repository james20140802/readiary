/**
 * 발췌집 카드(4:5)에 문장을 앉히는 규칙. 문장은 자르지 않는다.
 * 넘치면 글자를 줄이고, 가장 작은 글자로도 넘치면 같은 크기의 다음 카드로 이어 간다.
 */

// 내보내기 이미지는 화면 토큰과 무관한 고정 레이아웃이라 크기·굵기를 px로 고정한다
export const QUOTE_TIERS = [
  'text-[20px] font-normal leading-[1.9]',
  'text-[18px] font-semibold leading-[1.85]',
  'text-[15px] font-normal leading-[1.8]',
] as const;

export type QuotePage = { text: string; tier: number; part: number; parts: number };

/** 줄바꿈이 그대로 살아나므로 글자 수와 줄 수를 함께 본다. 실제로 들어가는지는 재서 정한다 */
export function startingTier(quote: string): number {
  const length = quote.length;
  const lines = quote.split('\n').length;
  if (length <= 80 && lines <= 4) return 0;
  if (length <= 200 && lines <= 9) return 1;
  return QUOTE_TIERS.length - 1;
}

const isSpace = (character: string) => /^\s+$/.test(character);
const CLOSERS = /^[”’"'」』)）\]]$/;
const SENTENCE_END = /^[.?!。…]$/;

function endsSentence(characters: string[], at: number): boolean {
  let index = at - 1;
  while (index > 0 && CLOSERS.test(characters[index])) index--;
  return SENTENCE_END.test(characters[index]);
}

/** 칸이 찬 자리에서 되짚어 줄바꿈, 문장 끝, 띄어쓰기 순으로 자연스러운 자리를 찾는다 */
function breakPoint(characters: string[], start: number, end: number): number {
  const earliest = start + Math.ceil((end - start) * 0.6);
  const rules = [
    (at: number) => /\n/.test(characters[at]),
    (at: number) => isSpace(characters[at]) && endsSentence(characters, at),
    (at: number) => isSpace(characters[at]),
  ];
  for (const rule of rules) {
    for (let at = end; at >= earliest; at--) {
      if (at < characters.length && rule(at)) return at;
    }
  }
  return end;
}

export function layoutQuote(
  quote: string,
  fits: (text: string, tier: number) => boolean
): QuotePage[] {
  const last = QUOTE_TIERS.length - 1;
  for (let tier = startingTier(quote); tier <= last; tier++) {
    if (fits(quote, tier)) return [{ text: quote, tier, part: 1, parts: 1 }];
  }

  // 이모지와 결합 문자가 카드 사이에서 쪼개지지 않게 글자 단위로 자른다
  const characters = [...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(quote)].map(
    (part) => part.segment
  );
  const texts: string[] = [];
  let offset = 0;
  while (offset < characters.length) {
    const rest = characters.slice(offset).join('');
    if (fits(rest, last)) {
      texts.push(rest);
      break;
    }
    let low = 0;
    let high = characters.length - offset - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (fits(characters.slice(offset, offset + middle).join(''), last)) low = middle;
      else high = middle - 1;
    }
    if (low === 0) throw new Error('quote-too-tall');
    const cut = breakPoint(characters, offset, offset + low);
    texts.push(characters.slice(offset, cut).join('').trimEnd());
    offset = cut;
    // 카드가 바뀌는 자리의 공백만 버린다
    while (offset < characters.length && isSpace(characters[offset])) offset++;
  }
  return texts.map((text, index) => ({
    text,
    tier: last,
    part: index + 1,
    parts: texts.length,
  }));
}
