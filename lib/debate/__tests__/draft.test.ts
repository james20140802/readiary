// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { clearDraft, clearOtherDebateDrafts, draftKey, loadDraft, saveDraft } from '../draft';

beforeEach(() => localStorage.clear());

describe('답 초안', () => {
  it('계정마다, 밑줄·문장 전체·답글마다 따로 남는다', () => {
    expect(draftKey('u', 'd', { kind: 'answer', position: 2 })).toBe('debate-draft:v2:u:d:2');
    expect(draftKey('u', 'd', { kind: 'answer', position: null })).toBe(
      'debate-draft:v2:u:d:whole'
    );
    expect(draftKey('u', 'd', { kind: 'reply', answerId: 'a' })).toBe(
      'debate-draft:v2:u:d:reply:a'
    );
  });

  it('저장하고 읽고 지운다', () => {
    const t = { kind: 'answer', position: 1 } as const;
    expect(loadDraft('u', 'd', t)).toBeNull();
    saveDraft('u', 'd', t, { stance: 'differ', body: '쓰던 답', evidence: null });
    expect(loadDraft('u', 'd', t)).toEqual({ stance: 'differ', body: '쓰던 답', evidence: null });
    clearDraft('u', 'd', t);
    expect(loadDraft('u', 'd', t)).toBeNull();
  });

  it('다른 계정이 쓰던 초안은 읽지 않는다', () => {
    const t = { kind: 'answer', position: 1 } as const;
    saveDraft('a', 'd', t, { stance: 'differ', body: 'A의 답', evidence: null });
    expect(loadDraft('b', 'd', t)).toBeNull();
  });

  it('비어 있으면 저장하지 않고 지운다', () => {
    const t = { kind: 'reply', answerId: 'a' } as const;
    saveDraft('u', 'd', t, { stance: null, body: 'x', evidence: null });
    saveDraft('u', 'd', t, { stance: null, body: '  ', evidence: null });
    expect(loadDraft('u', 'd', t)).toBeNull();
  });

  it('깨진 값은 없는 것으로', () => {
    localStorage.setItem('debate-draft:v2:u:d:1', '{');
    expect(loadDraft('u', 'd', { kind: 'answer', position: 1 })).toBeNull();
  });
});

describe('계정이 바뀔 때 초안 정리', () => {
  it('지금 계정의 초안만 남기고, 계정을 모르는 옛 초안도 지운다', () => {
    const t = { kind: 'answer', position: 1 } as const;
    saveDraft('a', 'd', t, { stance: null, body: 'A', evidence: null });
    saveDraft('b', 'd', t, { stance: null, body: 'B', evidence: null });
    localStorage.setItem('debate-draft:d:1', '{"body":"옛 초안"}');
    localStorage.setItem('other-key', '1');
    clearOtherDebateDrafts(localStorage, 'b');
    expect(loadDraft('a', 'd', t)).toBeNull();
    expect(loadDraft('b', 'd', t)?.body).toBe('B');
    expect(localStorage.getItem('debate-draft:d:1')).toBeNull();
    expect(localStorage.getItem('other-key')).toBe('1');
  });

  it('로그아웃하면(계정 없음) 모든 초안을 지운다', () => {
    saveDraft(
      'a',
      'd',
      { kind: 'reply', answerId: 'x' },
      { stance: null, body: 'A', evidence: null }
    );
    clearOtherDebateDrafts(localStorage, null);
    expect(Object.keys(localStorage).filter((k) => k.startsWith('debate-draft:'))).toEqual([]);
  });
});
