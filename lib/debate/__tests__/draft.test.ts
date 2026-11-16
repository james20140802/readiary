// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDraft, draftKey, loadDraft, saveDraft } from '../draft';

beforeEach(() => localStorage.clear());

describe('답 초안', () => {
  it('밑줄·문장 전체·답글마다 따로 남는다', () => {
    expect(draftKey('d', { kind: 'answer', position: 2 })).toBe('debate-draft:d:2');
    expect(draftKey('d', { kind: 'answer', position: null })).toBe('debate-draft:d:whole');
    expect(draftKey('d', { kind: 'reply', answerId: 'a' })).toBe('debate-draft:d:reply:a');
  });

  it('저장하고 읽고 지운다', () => {
    const t = { kind: 'answer', position: 1 } as const;
    expect(loadDraft('d', t)).toBeNull();
    saveDraft('d', t, { stance: 'differ', body: '쓰던 답', evidence: null });
    expect(loadDraft('d', t)).toEqual({ stance: 'differ', body: '쓰던 답', evidence: null });
    clearDraft('d', t);
    expect(loadDraft('d', t)).toBeNull();
  });

  it('비어 있으면 저장하지 않고 지운다', () => {
    const t = { kind: 'reply', answerId: 'a' } as const;
    saveDraft('d', t, { stance: null, body: 'x', evidence: null });
    saveDraft('d', t, { stance: null, body: '  ', evidence: null });
    expect(loadDraft('d', t)).toBeNull();
  });

  it('깨진 값은 없는 것으로', () => {
    localStorage.setItem('debate-draft:d:1', '{');
    expect(loadDraft('d', { kind: 'answer', position: 1 })).toBeNull();
  });
});
