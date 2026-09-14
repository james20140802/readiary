import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseSearchRequest } from '../request';
import {
  readSearchDraft,
  readSearchPage,
  saveSearchDraft,
  saveSearchPage,
  setSearchOwner,
} from '../memory';
import Highlight from '@/components/search/Highlight';

afterEach(() => {
  vi.unstubAllGlobals();
  setSearchOwner(null);
});
describe('search input', () => {
  it('preserves literal Korean, spacing and wildcard characters', () => {
    expect(parseSearchRequest({ query: '  기다림  100%_*  ', kind: 'entries' }).query).toBe(
      '기다림  100%_*'
    );
  });
  it('allows empty candidate lookup but not empty record scans', () => {
    expect(parseSearchRequest({ query: '', kind: 'candidates' }).query).toBe('');
    expect(() => parseSearchRequest({ query: '  ', kind: 'entries' })).toThrow();
  });
  it('rejects overlong input, invalid dates, reversed ranges and malformed cursors', () => {
    for (const extra of [
      { query: 'a'.repeat(201) },
      { from: '2026-02-30' },
      { from: '2026-09-02', to: '2026-09-01' },
      { cursor: { id: 'x', created: 'today' } },
    ]) {
      expect(() => parseSearchRequest({ query: '가', kind: 'entries', ...extra })).toThrow();
    }
  });
});
describe('private in-memory search state', () => {
  it('restores one account and clears on switching or signing out', () => {
    vi.stubGlobal('window', {});
    const draft = readSearchDraft('a');
    saveSearchDraft('a', { ...draft, query: '비밀', scroll: 420 });
    saveSearchPage('a', 'query', { items: ['private'] });
    expect(readSearchDraft('a').scroll).toBe(420);
    setSearchOwner('b');
    expect(readSearchDraft('b').query).toBe('');
    expect(readSearchPage('b', 'query')).toBeUndefined();
    saveSearchPage('a', 'late response', 'private');
    expect(readSearchPage('b', 'late response')).toBeUndefined();
    setSearchOwner(null);
    expect(readSearchDraft('a').query).toBe('');
  });
});
it('highlights literal expressions without rendering stored markup', () => {
  const html = renderToStaticMarkup(
    createElement(Highlight, { text: '<script>x</script> 100%_* 100%_*', query: '100%_*' })
  );
  expect(html.match(/<mark/g)).toHaveLength(2);
  expect(html).not.toContain('<script>');
  expect(html).toContain('&lt;script&gt;');
});
