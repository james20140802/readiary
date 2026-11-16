import type { DebateAnswer, DebateDetail, DebatePerson } from '@/lib/debate/types';

export const person = (over: Partial<DebatePerson> = {}): DebatePerson => ({
  id: 'p',
  nickname: '도현',
  tag: '0001',
  profileImage: null,
  isFriend: true,
  isMe: false,
  active: true,
  ...over,
});

export const answer = (over: Partial<DebateAnswer> = {}): DebateAnswer => ({
  id: 'a',
  author: person(),
  stance: 'differ',
  body: '사라지는 건 상상 속의 상대뿐이에요.',
  evidence: null,
  movedCount: 0,
  movedByMe: false,
  replyCount: 0,
  replies: [],
  hidden: false,
  deleted: false,
  edited: false,
  reportedByMe: false,
  createdAt: '2026-11-17T00:00:00Z',
  ...over,
});

export const debate = (over: Partial<DebateDetail> = {}): DebateDetail => ({
  id: 'd1',
  owner: {
    id: 'o',
    nickname: '윤서',
    tag: '0001',
    profileImage: null,
    isFriend: true,
    isMe: false,
  },
  quote: '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.',
  bookTitle: '에로스의 종말',
  bookAuthor: '한병철',
  pageFrom: 42,
  pageTo: null,
  sourceEntryId: null,
  question: '가까워질수록 상대를 덜 궁금해하게 되는 걸까요?',
  createdAt: '2026-11-15T00:00:00Z',
  closedAt: null,
  canAnswer: true,
  summary: null,
  totals: { agree: 3, differ: 5, question: 1, movedPeople: 2 },
  sections: [],
  ...over,
});
