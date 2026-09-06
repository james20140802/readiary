import { describe, expect, it } from 'vitest';
import { quoteSearchFilter } from '../quoteCandidates';

describe('quoteSearchFilter', () => {
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
