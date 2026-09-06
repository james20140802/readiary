import { describe, expect, it } from 'vitest';
import { quoteSearchFilter } from '../quoteCandidates';

describe('quoteSearchFilter', () => {
  it.each(['*', '2 * 3', 'a.*(b)[c]+?^$|\\%_'])(
    'keeps %s literal through the regex operator',
    (term) => {
      const filter = quoteSearchFilter(term, [])!;
      expect(filter.startsWith('quote.imatch.')).toBe(true);
      const pattern = JSON.parse(filter.slice('quote.imatch.'.length));
      const matcher = new RegExp(pattern, 'i');
      expect(matcher.test('before ' + term + ' after')).toBe(true);
      expect(matcher.test(term.replaceAll('*', 'anything'))).toBe(false);
      expect(matcher.test(term.replaceAll('*', '%'))).toBe(false);
    }
  );
  it('leaves an empty search unfiltered', () => {
    expect(quoteSearchFilter('  ', [])).toBeNull();
  });
  it('matches book titles case insensitively alongside quote contents', () => {
    expect(
      quoteSearchFilter(' DEMIAN ', [
        ['book-1', 'Demian'],
        ['book-2', 'Other'],
      ])
    ).toBe('quote.ilike."%DEMIAN%",user_book_id.in.("book-1")');
  });
  it('quotes filter delimiters and escapes LIKE wildcard characters', () => {
    const term = 'a,b).or("%_\\';
    const filter = quoteSearchFilter(term, [])!;
    expect(JSON.parse(filter.slice('quote.ilike.'.length))).toBe('%a,b).or("\\%\\_\\\\%');
  });
});
