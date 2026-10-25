import { buildRhythm } from '@/lib/profile/readingRhythm';
import type { ShelfBook } from '@/components/books/BookSpineShelf';
import type { MeViewProps } from '@/components/profile/MeView';
import { diaryShelf, monthRows } from '@/components/profile/meModel';

// 문구는 시안 me.html·me-layer.html에서 가져왔다. 표지 이미지는 저작물이라 없이(표지색 면) 그린다.
const TITLES = [
  '소유냐 존재냐',
  '철학이 깊을수록 삶은 단순하다',
  '리만 가설',
  '정의란 무엇인가',
  '왜 나는 너를 사랑하는가',
  '작별하지 않는다',
  '소년이 온다',
  '에로스의 종말',
  '피로사회',
  '여행의 이유',
  '데미안',
  '월든',
];

const shelf: ShelfBook[] = TITLES.map((title, i) => ({
  id: `ub${i}`,
  title,
  author: null,
  coverUrl: null,
  totalPages: 200 + ((i * 37) % 260),
  lastReadPage: null,
  isFinished: i % 3 === 0,
  href: '#',
  readingPeriod: null,
  entryCount: (i * 7) % 13,
}));

export const ME_FULL: MeViewProps = {
  name: '테스트용계정',
  handle: 'readiary#0417',
  inviteSlug: 'readiary-0417',
  bio: '출퇴근길에 조금씩 읽어요. 철학책을 좋아해요.',
  coverQuote: {
    entryId: 'e1',
    quote: '생각이 깊어진다는 것은 무엇을 내려놓을지 알게 되는 일이다',
    bookTitle: '철학이 깊을수록 삶은 단순하다',
    author: null,
  },
  year: 2026,
  publishedDate: '2026년 3월 8일',
  stats: { totalEntries: 46, finishedBooks: 2, totalBooks: 46, totalPages: 3120 },
  finishedBooks: [
    { bookId: 'b1', title: '소유냐 존재냐', coverUrl: null, quoteCount: 14 },
    { bookId: 'b2', title: '철학이 깊을수록 삶은 단순하다', coverUrl: null, quoteCount: 9 },
    { bookId: 'b3', title: '왜 나는 너를 사랑하는가', coverUrl: null, quoteCount: 6 },
  ],
  shelfBooks: shelf,
  shelfTotal: 46,
  diary: diaryShelf('2024-03-08T01:00:00Z', '2026-10-23'),
  months: monthRows([
    {
      label: '2026년 10월',
      count: 9,
      books: [],
      quotes: [],
      quotePreviews: [
        { entryId: 'e10', quote: '가진 것을 잃을까 두려운 마음이 나를 가장 많이 붙잡고 있었다.' },
      ],
    },
    {
      label: '2026년 9월',
      count: 17,
      books: [],
      quotes: [],
      quotePreviews: [
        { entryId: 'e9', quote: '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.' },
      ],
    },
    { label: '2026년 8월', count: 0, books: [], quotes: [] },
    {
      label: '2026년 7월',
      count: 11,
      books: [],
      quotes: [],
      quotePreviews: [{ entryId: 'e7', quote: '질문을 바꾸면 같은 하루도 다른 얼굴을 한다.' }],
    },
    { label: '2026년 6월', count: 2, books: [], quotes: [] },
    {
      label: '2026년 5월',
      count: 14,
      books: [],
      quotes: [],
      quotePreviews: [{ entryId: 'e5', quote: '사랑은 가지는 것이 아니라 하는 것이다.' }],
    },
  ]),
  monthsError: false,
  bookmark: {
    userBookId: 'ub1',
    bookId: 'b2',
    title: '철학이 깊을수록 삶은 단순하다',
    quoteCount: 9,
    quotes: [
      '생각이 깊어진다는 것은 무엇을 내려놓을지 알게 되는 일이다.',
      '사랑은 가지는 것이 아니라 하는 것이다.',
      '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.',
    ],
  },
  canBookmark: true,
  settingsHref: '/design-lab/me/settings',
  // 언제 읽었나 — 일요일 밤이 석 달 내내, 토요일 낮이 두 달
  rhythm: buildRhythm(
    [
      { month: '2026-08', day: 6, slot: 3, count: 1 },
      { month: '2026-09', day: 6, slot: 3, count: 2 },
      { month: '2026-10', day: 6, slot: 3, count: 1 },
      { month: '2026-08', day: 5, slot: 1, count: 1 },
      { month: '2026-10', day: 5, slot: 1, count: 2 },
      { month: '2026-08', day: 3, slot: 0, count: 1 },
      { month: '2026-09', day: 1, slot: 2, count: 1 },
      { month: '2026-10', day: 3, slot: 3, count: 1 },
    ],
    '2026-10-25'
  ),
};

/** 막 가입한 사람 — 표지 문장·다 읽은 책·책·기록이 없다 */
export const ME_EMPTY: MeViewProps = {
  ...ME_FULL,
  bio: null,
  coverQuote: null,
  stats: { totalEntries: 0, finishedBooks: 0, totalBooks: 0, totalPages: 0 },
  finishedBooks: [],
  shelfBooks: [],
  shelfTotal: 0,
  diary: diaryShelf('2026-10-20T01:00:00Z', '2026-10-23'),
  months: [],
  bookmark: null,
  canBookmark: false,
};

/** 숫자·달 요약을 불러오지 못했다 */
export const ME_ERROR: MeViewProps = {
  ...ME_FULL,
  stats: null,
  months: [],
  monthsError: true,
  finishedBooks: [],
};
