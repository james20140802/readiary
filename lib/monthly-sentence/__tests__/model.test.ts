import { describe, expect, it } from 'vitest';
import {
  availableRules,
  fallbackNotice,
  friendMeta,
  isInSentenceWindow,
  monthNumber,
  ownMeta,
  pickNotice,
  placeholder,
  ruleLabel,
  ruleSentence,
  shownRule,
  yearLabels,
} from '../model';
import type { OwnSentenceRow } from '../types';

function row(over: Partial<OwnSentenceRow> = {}): OwnSentenceRow {
  return {
    month: '2026-11',
    entryId: 'e1',
    quote: '문장',
    bookTitle: '책',
    fromPage: null,
    toPage: null,
    source: 'auto',
    entryCount: 1,
    isPrivate: false,
    friendFallback: null,
    excerpt: 'none',
    ...over,
  };
}

describe('달마다 한 문장 표시 모델', () => {
  it('monthNumber: 앞의 0을 뗀다', () => {
    expect(monthNumber('2026-09')).toBe('9');
    expect(monthNumber('2026-11')).toBe('11');
  });

  it('yearLabels: 첫 줄과 해가 바뀌는 줄에만 연도', () => {
    expect(yearLabels(['2026-02', '2026-01', '2025-12', '2025-11'])).toEqual([
      '2026',
      null,
      '2025',
      null,
    ]);
    expect(yearLabels([])).toEqual([]);
  });

  it('ownMeta: 쪽수가 없으면 자리를 비우지 않는다', () => {
    expect(
      ownMeta(row({ bookTitle: '애도 일기', fromPage: null, source: 'auto', entryCount: 8 }))
    ).toEqual(['애도 일기', '기록 8']);
    expect(
      ownMeta(row({ bookTitle: '다시, 책으로', fromPage: 184, source: 'picked', entryCount: 12 }))
    ).toEqual(['다시, 책으로', 'p.184', '내가 고른 문장', '기록 12']);
    expect(ownMeta(row({ source: 'excerpt' }))).toContain('발췌집 표지');
  });

  it('ownMeta: 문장이 없는 달은 기록 수만, 기록도 없으면 비운다', () => {
    expect(
      ownMeta(row({ entryId: null, quote: null, bookTitle: null, source: null, entryCount: 3 }))
    ).toEqual(['기록 3']);
    expect(
      ownMeta(row({ entryId: null, quote: null, bookTitle: null, source: null, entryCount: 0 }))
    ).toEqual([]);
  });

  it('friendMeta: 책 제목과 쪽수만', () => {
    expect(
      friendMeta({
        month: '2026-11',
        entryId: 'e1',
        quote: 'q',
        bookTitle: '책',
        fromPage: 3,
        toPage: 5,
        hasExcerpt: false,
      })
    ).toEqual(['책', 'p.3–5']);
    expect(
      friendMeta({
        month: '2026-11',
        entryId: 'e1',
        quote: 'q',
        bookTitle: null,
        fromPage: null,
        toPage: null,
        hasExcerpt: true,
      })
    ).toEqual([]);
  });

  it('placeholder', () => {
    expect(placeholder(row({ entryId: null, entryCount: 0 }))).toBe('쉬어 간 달');
    expect(placeholder(row({ entryId: null, entryCount: 3 }))).toBe('생각만 남긴 달');
    expect(placeholder(row({ entryId: 'e1' }))).toBeNull();
  });

  it('기준: 생각 기능이 꺼지면 선택지에서 빠지고 최근으로 보인다', () => {
    expect(availableRules(true)).toEqual(['likes', 'reflections', 'recent']);
    expect(availableRules(false)).toEqual(['likes', 'recent']);
    expect(shownRule('reflections', false)).toBe('recent');
    expect(shownRule('reflections', true)).toBe('reflections');
    expect(shownRule('likes', false)).toBe('likes');
    expect(ruleLabel('reflections')).toBe('생각 많은 문장');
    expect(ruleLabel('recent')).toBe('최근 문장');
    expect(ruleSentence('likes')).toBe('고르지 않은 달은 좋아요 많은 문장으로');
  });

  it('안내 문구', () => {
    expect(fallbackNotice('other')).toBe('나만 보여요 · 친구에게는 다른 문장이 보여요');
    expect(fallbackNotice('none')).toBe('나만 보여요 · 친구에게는 이 달이 보이지 않아요');
    expect(fallbackNotice(null)).toBeNull();
    expect(pickNotice({ isPrivate: true }, 0)).toBe(fallbackNotice('none'));
    expect(pickNotice({ isPrivate: true }, 2)).toBe(fallbackNotice('other'));
    expect(pickNotice({ isPrivate: false }, 0)).toBeNull();
  });

  it('isInSentenceWindow: 이번 달 포함 최근 24개월만', () => {
    expect(isInSentenceWindow('2026-11', '2026-11-13')).toBe(true);
    expect(isInSentenceWindow('2024-12', '2026-11-13')).toBe(true);
    expect(isInSentenceWindow('2024-11', '2026-11-13')).toBe(false);
    expect(isInSentenceWindow('2026-12', '2026-11-13')).toBe(false);
  });
});
