export type LetterBlock = {
  entryId: string;
  title: string;
  date: string;
  kind: 'quote' | 'note' | 'reading';
  text: string;
  continued: boolean;
  hideSource?: boolean;
};

export const LETTER_BODY_HEIGHT = 456;
export const LETTER_MAX_PAGES = 30;
export const LETTER_BLOCK_CLASS = 'pb-6';
export const LETTER_TEXT_CLASS = 'whitespace-pre-wrap break-words font-serif text-quote text-ink';

/** Measure the actual font/layout; never trim, clamp or drop the source text. */
export function paginateLetter(
  blocks: LetterBlock[],
  measure: (block: LetterBlock) => number,
  height = LETTER_BODY_HEIGHT,
  maxPages = LETTER_MAX_PAGES
): LetterBlock[][] {
  const pages: LetterBlock[][] = [];
  let page: LetterBlock[] = [];
  let used = 0;
  const finish = () => {
    if (page.length) pages.push(page);
    if (pages.length >= maxPages) throw new Error('too-many-pages');
    page = [];
    used = 0;
  };
  for (const source of blocks) {
    // Graphemes keep emoji and combining characters together across sheets.
    const characters = [
      ...new Intl.Segmenter('ko', { granularity: 'grapheme' }).segment(source.text),
    ].map((part) => part.segment);
    let offset = 0;
    while (offset < characters.length) {
      const remaining = {
        ...source,
        text: characters.slice(offset).join(''),
        continued: offset > 0,
        hideSource: page.some((part) => part.date === source.date && part.title === source.title),
      };
      const available = height - used;
      const measured = measure(remaining);
      if (measured <= available) {
        page.push(remaining);
        used += measured;
        offset = characters.length;
        continue;
      }
      // Start a record/paragraph on a fresh sheet when it fits there intact.
      if (page.length && (measured <= height || available < height / 3)) {
        finish();
        continue;
      }
      let low = 0;
      let high = characters.length - offset;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        const candidate = {
          ...remaining,
          text: characters.slice(offset, offset + middle).join(''),
        };
        if (measure(candidate) <= available) low = middle;
        else high = middle - 1;
      }
      if (low === 0) {
        if (page.length) {
          finish();
          continue;
        }
        throw new Error('content-too-tall');
      }
      page.push({ ...remaining, text: characters.slice(offset, offset + low).join('') });
      offset += low;
      finish();
    }
  }
  if (page.length) pages.push(page);
  return pages;
}
