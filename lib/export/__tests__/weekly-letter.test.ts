import { describe, expect, it } from 'vitest';
import { paginateLetter, type LetterBlock } from '../weekly-letter';
const block = (text: string, id = 'one'): LetterBlock => ({
  entryId: id,
  title: '책',
  date: '2026-09-24',
  kind: 'quote',
  text,
  continued: false,
});
const measure = (item: LetterBlock) => 20 + [...item.text].length;

describe('reading letter pagination', () => {
  it('packs short paragraphs and moves a whole paragraph to a fresh sheet when possible', () => {
    const pages = paginateLetter(
      [block('a'.repeat(40)), block('b'.repeat(30), 'two')],
      measure,
      100
    );
    expect(pages.map((page) => page.length)).toEqual([1, 1]);
    expect(pages[1][0].continued).toBe(false);
  });
  it('preserves every character and line break across continuation sheets', () => {
    const text = '  문장입니다.\n\n두 번째 줄.  \n'.repeat(80);
    const pages = paginateLetter([block(text)], measure, 100, 100);
    expect(
      pages
        .flat()
        .map((part) => part.text)
        .join('')
    ).toBe(text);
    expect(pages[0][0].continued).toBe(false);
    expect(pages.slice(1).every((page) => page[0].continued)).toBe(true);
    expect(pages.every((page) => page.reduce((sum, part) => sum + measure(part), 0) <= 100)).toBe(
      true
    );
  });
  it('keeps emoji graphemes intact at page boundaries', () => {
    const emoji = '👩🏽‍💻';
    const pages = paginateLetter([block(emoji.repeat(20))], measure, 40);
    expect(pages.flat().every((part) => part.text.split(emoji).join('') === '')).toBe(true);
    expect(
      pages
        .flat()
        .map((part) => part.text)
        .join('')
    ).toBe(emoji.repeat(20));
  });
  it('allows exactly the limit and rejects additional pages instead of truncating', () => {
    expect(paginateLetter([block('a'.repeat(160))], measure, 100, 2)).toHaveLength(2);
    expect(() => paginateLetter([block('a'.repeat(161))], measure, 100, 2)).toThrow(
      'too-many-pages'
    );
  });
  it('reports an unrenderable title instead of looping or clipping', () => {
    expect(() => paginateLetter([block('한 글자')], () => 101, 100)).toThrow('content-too-tall');
  });
  it('keeps quote, thought and source metadata associated across pages', () => {
    const quote = block('q'.repeat(120));
    const note = { ...block('n'.repeat(100)), kind: 'note' as const };
    const parts = paginateLetter([quote, note], measure, 100).flat();
    expect(
      parts
        .filter((part) => part.kind === 'quote')
        .map((part) => part.text)
        .join('')
    ).toBe(quote.text);
    expect(
      parts
        .filter((part) => part.kind === 'note')
        .map((part) => part.text)
        .join('')
    ).toBe(note.text);
    expect(parts.every((part) => part.entryId === 'one' && part.title === '책')).toBe(true);
  });
});
