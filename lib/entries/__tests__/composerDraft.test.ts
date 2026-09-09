import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMPOSER_DRAFT_KEY,
  readComposerDraft,
  writeComposerDraft,
  clearSubmittedComposerDraft,
  type ComposerDraft,
} from '../composerDraft';
const draft: ComposerDraft = {
  userId: 'alice',
  selectedId: 'book-1',
  mode: 'note',
  quote: '문장',
  note: '생각',
  isPrivate: true,
};
let storage: Storage;
beforeEach(() => {
  const data = new Map<string, string>();
  storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
  vi.stubGlobal('sessionStorage', storage);
});
describe('composer draft lifecycle', () => {
  it('restores both fields, selected book, mode and privacy after navigation', () => {
    writeComposerDraft(storage, draft);
    expect(readComposerDraft(storage, 'alice')).toEqual(draft);
  });
  it('removes another account draft without returning its content', () => {
    writeComposerDraft(storage, draft);
    expect(readComposerDraft(storage, 'bob')).toBeNull();
    expect(storage.length).toBe(0);
  });
  it('rejects malformed and outdated payloads', () => {
    for (const raw of ['{', 'null', JSON.stringify({ ...draft, note: undefined })]) {
      storage.setItem(COMPOSER_DRAFT_KEY, raw);
      expect(readComposerDraft(storage, 'alice')).toBeNull();
      expect(storage.length).toBe(0);
    }
  });
  it('clears a submitted draft even after its form unmounts', () => {
    writeComposerDraft(storage, draft);
    clearSubmittedComposerDraft(draft);
    expect(storage.length).toBe(0);
  });
  it('late save completion preserves newer input and another account draft', () => {
    for (const newer of [
      { ...draft, note: '새 생각' },
      { ...draft, userId: 'bob' },
    ]) {
      writeComposerDraft(storage, newer);
      clearSubmittedComposerDraft(draft);
      expect(readComposerDraft(storage, newer.userId)).toEqual(newer);
    }
  });
  it('explicitly emptying both fields removes persisted draft', () => {
    writeComposerDraft(storage, draft);
    writeComposerDraft(storage, { ...draft, quote: '', note: '' });
    expect(storage.length).toBe(0);
  });
  it('restores the exact submission identity, original date and title after refresh', () => {
    const pending = {
      ...draft,
      submission: {
        id: '013b161a-70dc-4a6d-9c40-0ddf087fa2fa',
        date: '2026-09-01',
        bookTitle: '책',
      },
    };
    writeComposerDraft(storage, pending);
    expect(readComposerDraft(storage, 'alice')).toEqual(pending);
    clearSubmittedComposerDraft(draft);
    expect(readComposerDraft(storage, 'alice')).toEqual(pending);
    clearSubmittedComposerDraft(pending);
    expect(storage.length).toBe(0);
  });
  it('rejects corrupt pending requests rather than sending a fresh request for them', () => {
    for (const submission of [null, {}, { id: 'bad', date: '2026-09-01', bookTitle: '책' }]) {
      storage.setItem(COMPOSER_DRAFT_KEY, JSON.stringify({ ...draft, submission }));
      expect(readComposerDraft(storage, 'alice')).toBeNull();
    }
  });
  it('reports blocked storage to callers rather than claiming persistence', () => {
    const blocked = {
      ...storage,
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => readComposerDraft(blocked, 'alice')).toThrow('blocked');
    expect(() => writeComposerDraft(blocked, draft)).toThrow('quota');
  });
});
