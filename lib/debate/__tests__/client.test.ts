import { describe, expect, it } from 'vitest';
import { mapAnswer, mapDebate, mapListItem } from '../client';

const person = {
  id: 'u',
  nickname: 'u2',
  profile_image: null,
  is_friend: false,
  is_me: true,
  active: true,
};
const answer = {
  id: 'a1',
  author: person,
  stance: 'differ',
  body: '답',
  evidence: {
    quote: '문장',
    book_title: '책',
    book_author: null,
    page_from: 96,
    page_to: null,
    entry_id: null,
  },
  moved_count: 3,
  moved_by_me: false,
  reply_count: 1,
  replies: [
    {
      ...{
        id: 'r1',
        author: person,
        stance: null,
        body: '답글',
        evidence: null,
        moved_count: 0,
        moved_by_me: false,
        reply_count: 0,
        replies: null,
        hidden: false,
        deleted: false,
        edited: false,
        reported_by_me: false,
        created_at: 't',
      },
    },
  ],
  hidden: false,
  deleted: false,
  edited: true,
  reported_by_me: false,
  created_at: '2026-11-17T00:00:00Z',
};

describe('client 변환', () => {
  it('답을 화면 모양으로', () => {
    const a = mapAnswer(answer);
    expect(a.author).toEqual({
      id: 'u',
      nickname: 'u2',
      tag: null,
      profileImage: null,
      isFriend: false,
      isMe: true,
      active: true,
    });
    expect(a.evidence).toEqual({
      quote: '문장',
      bookTitle: '책',
      bookAuthor: null,
      pageFrom: 96,
      pageTo: null,
      entryId: null,
    });
    expect([a.movedCount, a.replyCount, a.edited, a.replies?.[0].body]).toEqual([
      3,
      1,
      true,
      '답글',
    ]);
  });

  it('정리에 고정한 답의 단락 번호 — 예전 응답처럼 없으면 모른다(undefined)', () => {
    const base = { id: 'd', owner: {}, totals: {}, sections: [] };
    const d = mapDebate({
      ...base,
      summary: {
        body: '정리',
        pins: [
          { answer_id: 'a', nickname: 'u', first_line: 'x', deleted: false, position: 2 },
          { answer_id: 'b', nickname: 'u', first_line: 'y', deleted: false, position: null },
          { answer_id: 'c', nickname: 'u', first_line: 'z', deleted: false },
        ],
      },
    });
    expect(d.summary?.pins.map((p) => p.position)).toEqual([2, null, undefined]);
  });

  it('토론 한 편: 단락의 밑줄 범위와 문장 전체', () => {
    const d = mapDebate({
      id: 'd',
      owner: { id: 'o', nickname: 'u1', profile_image: null, is_friend: true, is_me: false },
      quote: 'q',
      book_title: '책',
      book_author: '저자',
      page_from: 42,
      page_to: null,
      source_entry_id: null,
      question: '질문',
      created_at: 't',
      closed_at: null,
      can_answer: true,
      summary: null,
      totals: { agree: 1, differ: 2, question: 0, moved_people: 4 },
      sections: [
        {
          position: 1,
          start: 0,
          end: 5,
          prompt: '왜 경계일까요?',
          count: 1,
          extra: 2,
          agree: 0,
          differ: 1,
          question: 0,
          picks: [answer],
          pick_kinds: ['most_moved'],
        },
        {
          position: null,
          start: null,
          end: null,
          count: 0,
          agree: 0,
          differ: 0,
          question: 0,
          picks: [],
          pick_kinds: [],
        },
      ],
    });
    expect(d.totals.movedPeople).toBe(4);
    expect(d.sections[0].range).toEqual({ start: 0, end: 5 });
    expect(d.sections[1].range).toBeNull();
    expect(d.sections[0].prompt).toBe('왜 경계일까요?');
    expect(d.sections[1].prompt).toBeNull();
    expect(d.sections[0].pickKinds).toEqual(['most_moved']);
    // 숨긴 답처럼 세지 않지만 내게 보이는 답 수 — 예전 응답엔 없으니 0
    expect(d.sections[0].extra).toBe(2);
    expect(d.sections[1].extra).toBe(0);
    expect(d.canAnswer).toBe(true);
  });

  it('목록 항목', () => {
    const item = mapListItem({
      id: 'd',
      owner: { id: 'o', nickname: 'u1', profile_image: null, is_friend: true, is_me: false },
      quote: 'q',
      underlines: [{ start: 0, end: 5 }],
      question: '질문',
      totals: { agree: 1, differ: 0, question: 0, moved_people: 0 },
      answer_count: 1,
      top_line: { nickname: 'u2', body: '첫 줄', kind: 'newest' },
      summary_first_line: null,
      closed_at: null,
      last_activity_at: 't',
    });
    expect(item.topLine).toEqual({ nickname: 'u2', body: '첫 줄', kind: 'newest' });
    expect(item.answerCount).toBe(1);
  });
});
