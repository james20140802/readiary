import { describe, expect, it } from 'vitest';
import {
  dayLabel,
  friendsReadingFrom,
  groupByDay,
  pageLabel,
  subjectParticle,
} from '@/components/social/feedFormat';
import type { DetailSocialFeedEntry } from '@/types/entry';

// 2026-10-23 10:00 KST
const NOW = new Date('2026-10-23T01:00:00.000Z');

describe('dayLabel — 한국 시간 날짜 기준', () => {
  it('같은 날은 오늘, 하루 전은 어제', () => {
    expect(dayLabel('2026-10-22T15:30:00.000Z', NOW)).toBe('오늘'); // 10-23 00:30 KST
    expect(dayLabel('2026-10-22T14:59:00.000Z', NOW)).toBe('어제'); // 10-22 23:59 KST
  });
  it('2~6일 전은 N일 전, 그보다 오래되면 날짜', () => {
    expect(dayLabel('2026-10-21T03:00:00.000Z', NOW)).toBe('2일 전');
    expect(dayLabel('2026-10-17T03:00:00.000Z', NOW)).toBe('6일 전');
    expect(dayLabel('2026-10-16T03:00:00.000Z', NOW)).toBe('10월 16일');
  });
  it('해가 다르면 연도를 붙인다', () => {
    expect(dayLabel('2025-12-30T03:00:00.000Z', NOW)).toBe('2025년 12월 30일');
  });
});

describe('pageLabel', () => {
  it('쪽이 없으면 null', () => {
    expect(pageLabel(null, null)).toBeNull();
  });
  it('한쪽만 있거나 같으면 한 번만', () => {
    expect(pageLabel(42, null)).toBe('p.42');
    expect(pageLabel(null, 42)).toBe('p.42');
    expect(pageLabel(42, 42)).toBe('p.42');
  });
  it('범위는 이어 적는다', () => {
    expect(pageLabel(42, 45)).toBe('p.42–45');
  });
});

function item(
  profileId: string,
  name: string,
  bookTitle: string,
  opts: { page?: number | null; created_at?: string } = {}
): DetailSocialFeedEntry {
  return {
    profile: {
      id: profileId,
      name,
      nickname: name,
      tag: '0001',
      bio: null,
      created_at: null,
      profile_image: null,
    },
    entry: {
      id: `${profileId}-${bookTitle}`,
      date: '2026-10-23',
      note: null,
      quote: '문장',
      from_page: opts.page ?? null,
      to_page: opts.page ?? null,
      is_private: false,
      book: { id: `b-${bookTitle}`, title: bookTitle, author: null, total_pages: null },
      created_at: opts.created_at ?? '2026-10-23T00:00:00.000Z',
    },
    initialLikeCount: 0,
    initialLiked: false,
    initialCommentCount: 0,
  };
}

describe('friendsReadingFrom — 피드에 이미 실린 기록으로 친구들이 읽는 책을 고른다', () => {
  it('친구마다 가장 최근 기록 한 권만, 피드 순서대로', () => {
    const list = friendsReadingFrom(
      [
        item('a', '윤서', '철학', { page: 42 }),
        item('b', '도현', '리만 가설', { page: 118 }),
        item('a', '윤서', '예전 책', { page: 10 }),
      ],
      NOW
    );
    expect(list.map((r) => [r.profile.name, r.book.title, r.label])).toEqual([
      ['윤서', '철학', '42쪽'],
      ['도현', '리만 가설', '118쪽'],
    ]);
  });
  it('쪽이 없으면 남긴 날로 적는다', () => {
    const [row] = friendsReadingFrom(
      [item('c', '지우', '정의란 무엇인가', { created_at: '2026-10-21T03:00:00.000Z' })],
      NOW
    );
    expect(row.label).toBe('2일 전');
  });
  it('상한을 넘기지 않는다', () => {
    const many = Array.from({ length: 20 }, (_, i) => item(`p${i}`, `친구${i}`, `책${i}`));
    expect(friendsReadingFrom(many, NOW, 8)).toHaveLength(8);
  });
});

describe('groupByDay — 알림을 오늘·이번 주·이전으로 묶는다', () => {
  it('순서를 지키며 비어 있는 묶음은 만들지 않는다', () => {
    const rows = [
      { id: '1', createdAt: '2026-10-23T00:30:00.000Z' },
      { id: '2', createdAt: '2026-10-22T15:10:00.000Z' }, // 10-23 00:10 KST — 오늘
      { id: '3', createdAt: '2026-10-20T00:00:00.000Z' },
      { id: '4', createdAt: '2026-09-01T00:00:00.000Z' },
    ];
    const groups = groupByDay(rows, NOW);
    expect(groups.map((g) => [g.label, g.rows.map((r) => r.id)])).toEqual([
      ['오늘', ['1', '2']],
      ['이번 주', ['3']],
      ['이전', ['4']],
    ]);
    expect(groupByDay([rows[3]], NOW).map((g) => g.label)).toEqual(['이전']);
  });
});

describe('subjectParticle', () => {
  it('받침에 따라 이/가', () => {
    expect(subjectParticle('윤서')).toBe('가');
    expect(subjectParticle('하린')).toBe('이');
    expect(subjectParticle('윤서 외 2명')).toBe('이');
    expect(subjectParticle('Kim')).toBe('가');
  });
});
