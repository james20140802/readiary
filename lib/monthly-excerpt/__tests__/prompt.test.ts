// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promptSummary } from '../korean-count';
import { isPromptWindow } from '../month';
import { dismissPrompt, isPromptDismissed, promptStorageKey } from '../promptDismiss';

describe('isPromptWindow — 안내는 그달 1~7일(KST)에만', () => {
  it('1일부터 7일까지 보인다', () => {
    expect(isPromptWindow('2026-04-01')).toBe(true);
    expect(isPromptWindow('2026-04-07')).toBe(true);
  });
  it('8일부터는 보이지 않는다 — 놓쳐도 프로필에서 시작한다', () => {
    expect(isPromptWindow('2026-04-08')).toBe(false);
    expect(isPromptWindow('2026-04-30')).toBe(false);
  });
});

describe('promptDismiss — 닫은 기억은 이 기기에 달마다', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('저장 키는 달마다 다르다', () => {
    expect(promptStorageKey('2026-03')).toBe('readiary:month-prompt:2026-03');
  });

  it('닫기 전에는 닫히지 않았다고, 닫은 뒤에는 그 달만 닫혔다고 답한다', () => {
    expect(isPromptDismissed('2026-03')).toBe(false);
    dismissPrompt('2026-03');
    expect(isPromptDismissed('2026-03')).toBe(true);
    expect(isPromptDismissed('2026-04')).toBe(false);
  });

  it('저장소를 읽지 못하면 닫히지 않은 것으로 본다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(isPromptDismissed('2026-03')).toBe(false);
  });

  it('저장하지 못해도 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => dismissPrompt('2026-03')).not.toThrow();
  });
});

describe('promptSummary — 안내의 보조 문장', () => {
  it('우리말 셈으로 책 수와 문장 수를 말한다', () => {
    expect(promptSummary(4, 38)).toBe('네 권의 책에서 문장 서른여덟 개를 남겼어요.');
    expect(promptSummary(1, 20)).toBe('한 권의 책에서 문장 스무 개를 남겼어요.');
  });
  it('100개부터는 숫자에 단위를 붙여 쓴다', () => {
    expect(promptSummary(12, 120)).toBe('열두 권의 책에서 문장 120개를 남겼어요.');
  });
});
