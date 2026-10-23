/**
 * 소셜 견본용 예시 데이터 — 실제 계정·기록과 무관하다. 시안 social.html·friends.html·friend.html의 문장을 쓴다.
 * 이 폴더는 `redesign` → `main` 머지 전에 지운다.
 */
import type { DetailSocialFeedEntry } from '@/types/entry';
import type { Friend } from '@/types/friends';
import type { Profile } from '@/types/profile';
import type { NotificationItem } from '@/lib/notifications/types';
import type { Delivery } from '@/lib/push/types';
import type { ShelfBook } from '@/components/books/BookSpineShelf';

// 2026-10-23 10:00 KST
export const REFERENCE_TIME = '2026-10-23T01:00:00.000Z';
const hoursAgo = (h: number) => new Date(Date.parse(REFERENCE_TIME) - h * 3_600_000).toISOString();

function person(id: string, name: string, nickname: string, tag: string, bio?: string): Profile {
  return {
    id,
    name,
    nickname,
    tag,
    bio: bio ?? null,
    created_at: '2026-01-04T00:00:00.000Z',
    profile_image: null,
  };
}

export const YUNSEO = person(
  'u-yunseo',
  '윤서',
  'yunseo',
  '2041',
  '밤에 조금씩, 소리 내어 읽어요.'
);
export const DOHYUN = person('u-dohyun', '도현', 'dohyun', '1187');
export const HARIN = person('u-harin', '하린', 'harin', '5521');
export const JIWOO = person('u-jiwoo', '지우', 'jiwoo', '2041');
export const MINJAE = person('u-minjae', '민재', 'minjae', '3318');
export const SEOJIN = person('u-seojin', '서진', 'seojin', '7720');

function post(
  id: string,
  profile: Profile,
  book: { id: string; title: string; author?: string; total?: number },
  e: { quote?: string; note?: string; page?: number; hours: number },
  counts: { likes: number; comments: number; liked?: boolean }
): DetailSocialFeedEntry {
  return {
    profile,
    entry: {
      id,
      date: hoursAgo(e.hours).slice(0, 10),
      quote: e.quote ?? null,
      note: e.note ?? null,
      from_page: e.page ?? null,
      to_page: e.page ?? null,
      is_private: false,
      book: {
        id: book.id,
        title: book.title,
        author: book.author ?? null,
        total_pages: book.total ?? null,
        cover_url: null,
      },
      created_at: hoursAgo(e.hours),
      reflectionSummary: null,
    },
    initialLikeCount: counts.likes,
    initialLiked: counts.liked ?? false,
    initialCommentCount: counts.comments,
  };
}

export const FEED: DetailSocialFeedEntry[] = [
  post(
    'e1',
    YUNSEO,
    { id: 'b1', title: '철학이 깊을수록 삶은 단순하다', total: 280 },
    {
      quote: '질문을 바꾸면 같은 하루도 다른 얼굴을 한다.',
      note: '출근길이 매일 같다고 느낄 때 다시 읽고 싶은 문장.',
      page: 42,
      hours: 2,
    },
    { likes: 4, comments: 2, liked: true }
  ),
  post(
    'e2',
    DOHYUN,
    { id: 'b2', title: '리만 가설' },
    {
      quote: '소수는 질서와 무질서 사이 어딘가에 있다.',
      note: '수학책인데 밑줄이 제일 많다.',
      page: 118,
      hours: 20,
    },
    { likes: 1, comments: 0 }
  ),
  post(
    'e3',
    JIWOO,
    { id: 'b3', title: '정의란 무엇인가' },
    {
      note: '공정하다는 말이 이렇게 여러 뜻일 줄 몰랐다. 다음 회의 때 누가 이 말을 쓰면 어떤 뜻인지 물어봐야지.',
      hours: 50,
    },
    { likes: 3, comments: 1 }
  ),
  post(
    'e4',
    MINJAE,
    { id: 'b4', title: '소유냐 존재냐' },
    { quote: '사랑은 가지는 것이 아니라 하는 것이다.', page: 96, hours: 74 },
    { likes: 7, comments: 3 }
  ),
  post(
    'e5',
    HARIN,
    { id: 'b5', title: '왜 나는 너를 사랑하는가' },
    {
      quote:
        '사랑에 빠지는 일은 상대를 다 알기 전에 시작된다. 그래서 우리는 사랑하는 사람을 끝없이 다시 알아 가야 한다. 처음의 오해를 하나씩 풀면서, 또 새로운 오해를 만들면서. 오해도 이해의 한 방식이라면, 우리는 평생 서로를 이해하는 중인 셈이다. 사랑이 끝나는 때는 더 알고 싶은 마음이 사라질 때다.',
      page: 211,
      hours: 30,
    },
    { likes: 6, comments: 0 }
  ),
];

const friend = (profile: Profile): Friend => ({ profile, accepted: true, isRecipient: false });
export const FRIENDS: Friend[] = [YUNSEO, DOHYUN, HARIN, MINJAE].map(friend);
export const PENDING: Friend[] = [{ profile: JIWOO, accepted: false, isRecipient: true }];
export const SENT: Friend[] = [{ profile: SEOJIN, accepted: false, isRecipient: false }];
export const ME = { nickname: 'readiary', tag: '0417' };

const SHELF_TITLES: [string, number | null][] = [
  ['철학이 깊을수록 삶은 단순하다', 280],
  ['에로스의 종말', 132],
  ['왜 나는 너를 사랑하는가', 304],
  ['정의란 무엇인가', 443],
  ['작별하지 않는다', 332],
  ['소년이 온다', 216],
  ['데미안', 248],
  ['어린 왕자', 120],
  ['코스모스', 719],
];
export const SHELF: ShelfBook[] = SHELF_TITLES.map(([title, total], i) => ({
  id: `ub${i}`,
  title,
  author: null,
  coverUrl: null,
  totalPages: total,
  lastReadPage: null,
  isFinished: i > 1,
  href: `/design-lab/social/friend#book-${i}`,
  readingPeriod: null,
  entryCount: null,
}));

export const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    type: 'friend_request',
    createdAt: hoursAgo(0.2),
    readAt: null,
    entryId: null,
    actorNickname: '지우',
    actorProfileImage: null,
  },
  {
    id: 'n2',
    type: 'comment',
    createdAt: hoursAgo(1),
    readAt: null,
    entryId: 'e9',
    actorNickname: '윤서',
    actorProfileImage: null,
  },
  {
    id: 'n3',
    type: 'like',
    createdAt: hoursAgo(3),
    readAt: '2026-10-23T00:00:00.000Z',
    entryId: 'e9',
    actorNickname: '도현',
    actorProfileImage: null,
  },
  {
    id: 'n4',
    type: 'friend_accept',
    createdAt: hoursAgo(60),
    readAt: '2026-10-21T00:00:00.000Z',
    entryId: null,
    actorNickname: '민재',
    actorProfileImage: null,
  },
  {
    id: 'n5',
    type: 'like',
    createdAt: hoursAgo(24 * 20),
    readAt: '2026-10-03T00:00:00.000Z',
    entryId: null,
    actorNickname: '하린',
    actorProfileImage: null,
  },
];

export const DELIVERIES: Delivery[] = [
  {
    id: 'd1',
    user_id: 'me',
    status: 'sent',
    created_at: hoursAgo(26),
    opened_at: null,
    items: [
      {
        kind: 'recall',
        href: '/design-lab/social/notifications#recall',
        label: '1년 전 오늘 남긴 문장이 있어요',
      },
    ],
  },
];
