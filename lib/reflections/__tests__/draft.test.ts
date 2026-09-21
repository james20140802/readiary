import { describe, it, expect } from 'vitest';
import { reflectionDraftKey, readReflectionDraft, clearOtherReflectionDrafts } from '../draft';
import { parseReflectionCursor, validReflectionBody } from '../types';
function storage() {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    key: (n: number) => [...values.keys()][n] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, v: string) => {
      values.set(key, v);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  } satisfies Storage;
}
describe('reflection drafts and cursor validation', () => {
  it('isolates account, original and edit drafts and preserves edit version across reopening', () => {
    const s = storage();
    const key = reflectionDraftKey('a', 'entry', 'thought');
    const draft = { body: '쓰던 생각', is_private: true, updated_at: '2026-01-01T00:00:00Z' };
    s.setItem(key, JSON.stringify(draft));
    s.setItem(reflectionDraftKey('b', 'entry'), JSON.stringify(draft));
    s.setItem('unrelated', 'keep');
    expect(key).not.toBe(reflectionDraftKey('a', 'entry'));
    expect(key).not.toBe(reflectionDraftKey('a', 'other', 'thought'));
    clearOtherReflectionDrafts(s, 'a');
    expect(readReflectionDraft(s, key)).toEqual(draft);
    expect(s.getItem(reflectionDraftKey('b', 'entry'))).toBeNull();
    expect(s.getItem('unrelated')).toBe('keep');
    clearOtherReflectionDrafts(s, null);
    expect(readReflectionDraft(s, key)).toBeNull();
  });
  it('ignores malformed drafts and rejects query syntax in a pagination cursor', () => {
    const s = storage();
    s.setItem('bad', '{');
    expect(readReflectionDraft(s, 'bad')).toBeNull();
    expect(parseReflectionCursor('["2026-01-01T00:00:00Z","id),or(body.neq.null)"]')).toBeNull();
    expect(parseReflectionCursor('{"date":"2026-01-01"}')).toBeNull();
    expect(
      parseReflectionCursor(
        '["2026-01-01T00:00:00.123456+00:00","11111111-1111-4111-8111-111111111111"]'
      )
    ).toMatchObject({ date: '2026-01-01T00:00:00.123456+00:00' });
  });
  it('matches PostgreSQL Unicode character bounds and refuses blank-only input', () => {
    expect(validReflectionBody(' '.repeat(50))).toBe(false);
    expect(validReflectionBody('😀'.repeat(10000))).toBe(true);
    expect(validReflectionBody('😀'.repeat(10001))).toBe(false);
  });
});
