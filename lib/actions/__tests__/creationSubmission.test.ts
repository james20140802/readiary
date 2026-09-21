import { describe, expect, it } from 'vitest';
import { clearCreationSubmissions, readSubmission, submissionKey } from '../creationSubmission';
function storage() {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
    clear: () => values.clear(),
  } satisfies Storage;
}
const request = {
  id: '21345678-1234-4123-8123-123456789012',
  userId: 'alice',
  payload: { note: '한 문장', is_private: true },
};
describe('pending creation storage', () => {
  it('restores exact id and payload after remount', () => {
    const s = storage();
    const key = submissionKey('alice', 'entry:1');
    s.setItem(key, JSON.stringify(request));
    expect(readSubmission(s, key, 'alice')).toEqual(request);
  });
  it('rejects malformed or another account rather than issuing a fresh duplicate', () => {
    const s = storage();
    const key = submissionKey('alice', 'entry:1');
    s.setItem(key, JSON.stringify(request));
    expect(() => readSubmission(s, key, 'bob')).toThrow();
    s.setItem(key, '{');
    expect(() => readSubmission(s, key, 'alice')).toThrow();
  });
  it('account switch clears only creation snapshots from other accounts', () => {
    const s = storage();
    s.setItem(submissionKey('alice', 'book:manual'), 'a');
    s.setItem(submissionKey('bob', 'comment:1'), 'b');
    s.setItem('other-draft', 'keep');
    clearCreationSubmissions(s, 'bob');
    expect(s.getItem(submissionKey('alice', 'book:manual'))).toBeNull();
    expect(s.getItem(submissionKey('bob', 'comment:1'))).toBe('b');
    expect(s.getItem('other-draft')).toBe('keep');
    clearCreationSubmissions(s);
    expect(s.length).toBe(1);
  });
});
