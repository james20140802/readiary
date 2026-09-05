import type { ShelfBook } from '@/components/books/BookSpineShelf';

/**
 * 랜딩에서 실제 UI를 채우는 견본 데이터 — 저작권이 만료된 고전의 문장만 쓴다.
 * 사람(친구·독자)은 모두 가공 인물이다.
 */

/** ② 문장 남기기 — 컴포저에 자동으로 옮겨 적히는 문장 */
export const COMPOSER_DEMO = {
  quote: '새는 알에서 나오려고 투쟁한다. 알은 세계이다.',
  bookTitle: '데미안',
  otherBookTitle: '안나 카레니나',
};

/** ③ 회상 카드 — 1년 전 오늘 적어 둔 문장 */
export const RECALL_DEMO = {
  quote: '죽는 날까지 하늘을 우러러\n한 점 부끄럼이 없기를',
  bookTitle: '하늘과 바람과 별과 시',
  bookAuthor: '윤동주',
};

/** ③ 주간 리듬 — 이번 주에 문장을 남긴 요일 무늬(오늘 기준으로 잘라 쓴다) */
export const WEEK_PATTERN = [true, true, false, true, true, true, false];

/** ④ 책등 서가 */
export const SHELF_DEMO: ShelfBook[] = [
  {
    id: 'demo-demian',
    title: '데미안',
    author: '헤르만 헤세',
    coverUrl: null,
    totalPages: 240,
    lastReadPage: 240,
    isFinished: true,
    href: '/signup',
    readingPeriod: null,
    entryCount: 9,
  },
  {
    id: 'demo-petit-prince',
    title: '어린 왕자',
    author: '앙투안 드 생텍쥐페리',
    coverUrl: null,
    totalPages: 128,
    lastReadPage: 128,
    isFinished: true,
    href: '/signup',
    readingPeriod: null,
    entryCount: 6,
  },
  {
    id: 'demo-anna',
    title: '안나 카레니나',
    author: '레프 톨스토이',
    coverUrl: null,
    totalPages: 1120,
    lastReadPage: 412,
    isFinished: false,
    href: '/signup',
    readingPeriod: null,
    entryCount: 14,
  },
  {
    id: 'demo-yun',
    title: '하늘과 바람과 별과 시',
    author: '윤동주',
    coverUrl: null,
    totalPages: 176,
    lastReadPage: 176,
    isFinished: true,
    href: '/signup',
    readingPeriod: null,
    entryCount: 11,
  },
  {
    id: 'demo-essais',
    title: '수상록',
    author: '미셸 드 몽테뉴',
    coverUrl: null,
    totalPages: 720,
    lastReadPage: 96,
    isFinished: false,
    href: '/signup',
    readingPeriod: null,
    entryCount: 3,
  },
  {
    id: 'demo-wings',
    title: '날개',
    author: '이상',
    coverUrl: null,
    totalPages: 200,
    lastReadPage: 58,
    isFinished: false,
    href: '/signup',
    readingPeriod: null,
    entryCount: 2,
  },
  {
    id: 'demo-proust',
    title: '잃어버린 시간을 찾아서 1',
    author: '마르셀 프루스트',
    coverUrl: null,
    totalPages: 560,
    lastReadPage: 130,
    isFinished: false,
    href: '/signup',
    readingPeriod: null,
    entryCount: 5,
  },
  {
    id: 'demo-metamorphosis',
    title: '변신',
    author: '프란츠 카프카',
    coverUrl: null,
    totalPages: 144,
    lastReadPage: 144,
    isFinished: true,
    href: '/signup',
    readingPeriod: null,
    entryCount: 4,
  },
];

/** ⑤ 발췌집 — 완독한 책 한 권이 시집이 된다 */
export const BOOKLET_DEMO = {
  bookTitle: '하늘과 바람과 별과 시',
  author: '윤동주',
  quotes: [
    { id: 'q1', date: '2026-06-03', quote: '죽는 날까지 하늘을 우러러\n한 점 부끄럼이 없기를' },
    {
      id: 'q2',
      date: '2026-06-11',
      quote: '별 하나에 추억과\n별 하나에 사랑과\n별 하나에 쓸쓸함과',
    },
    {
      id: 'q3',
      date: '2026-06-19',
      quote: '산모퉁이를 돌아 논가 외딴 우물을 홀로 찾아가선 가만히 들여다봅니다.',
    },
  ],
  entryDates: ['2026-06-03', '2026-06-11', '2026-06-19', '2026-06-24'],
};

/** ⑥ 친구가 부쳐 온 엽서 */
export const POSTCARD_DEMO = {
  friendName: '하연',
  friendInitial: 'H',
  quote: '가장 중요한 것은 눈에 보이지 않아.',
  note: '밤에 읽다가 여기서 멈췄다. 어릴 때 읽은 문장이 이제야 다르게 읽힌다. 내일 다시 처음부터.',
  bookTitle: '어린 왕자',
  bookAuthor: '앙투안 드 생텍쥐페리',
  dateLabel: '2026년 9월 4일 · 72-84p',
  timeLabel: '3시간 전',
  likeCount: 12,
  commentCount: 3,
};

/** ⑦ 프로필 책 — 이 사람을 책 한 권으로 */
export const PROFILE_DEMO = {
  name: '서윤',
  initial: 'S',
  handle: 'seoyun#0412',
  bio: '느리게 읽고, 오래 남깁니다.',
  finishedBooks: 6,
  featuredQuote: {
    quote: '진정한 발견의 여행은 새로운 풍경을 찾는 것이 아니라 새로운 눈을 갖는 것이다.',
    bookTitle: '잃어버린 시간을 찾아서',
    author: '마르셀 프루스트',
  },
};
