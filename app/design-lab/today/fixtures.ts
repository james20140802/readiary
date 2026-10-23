import type { RecentEntry } from '@/lib/dashboard/fetchRecentEntries';
import type { RecallEntry } from '@/lib/recall/fetchRecallEntry';
import type { MyBook } from '@/types/book';

// 문구는 시안 home2.html에서 가져왔다. 표지는 저작물이라 기본 표지로 둔다.
export const TODAY = '2026-10-06';

const book = (
  id: string,
  title: string,
  author: string,
  total: number | null,
  page: number | null
): MyBook => ({
  id: `ub-${id}`,
  book_id: `b-${id}`,
  progress: null,
  created_at: '2026-09-01T00:00:00+09:00',
  is_finished: false,
  last_read_page: page,
  books: { id: `b-${id}`, title, author, total_pages: total, cover_url: null },
});

export const BOOKS: MyBook[] = [
  book('1', '소유냐 존재냐', '에리히 프롬', 352, 184),
  book('2', '철학이 깊을수록 삶은 단순하다', '임성훈', null, 42),
  book('3', '리만 가설', '존 더비셔', 512, null),
  book('4', '에로스의 종말', '한병철', 120, 120),
];

const e = (
  id: string,
  date: string,
  hour: string,
  ub: MyBook,
  quote: string | null,
  note: string | null = null
): RecentEntry => ({
  id,
  quote,
  note,
  date,
  createdAt: `${date}T${hour}:00+09:00`,
  userBookId: ub.id,
  bookTitle: ub.books.title,
  bookAuthor: ub.books.author,
});

export const RECENT: RecentEntry[] = [
  e(
    'e1',
    '2026-10-06',
    '08:10',
    BOOKS[0],
    '가진 것을 잃을까 두려운 마음이 나를 가장 많이 붙잡고 있었다.'
  ),
  e('e2', '2026-10-06', '07:40', BOOKS[0], '존재 양식에서 기쁨은 활동 그 자체에서 온다.'),
  e(
    'e3',
    '2026-10-04',
    '22:15',
    BOOKS[1],
    '질문을 바꾸면 같은 하루도 다른 얼굴을 한다.',
    '요즘 내 질문은 무엇일까.'
  ),
  e(
    'e4',
    '2026-10-02',
    '21:00',
    BOOKS[0],
    '존재의 방식은 무엇을 하느냐보다 어떻게 머무르느냐에 가깝다.'
  ),
  e('e5', '2026-09-30', '23:30', BOOKS[2], '소수는 질서와 무질서 사이 어딘가에 있다.'),
];

export const QUIET: RecentEntry[] = [
  e(
    'q1',
    '2026-09-21',
    '21:00',
    BOOKS[3],
    '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.'
  ),
];

export const RECALL: RecallEntry = {
  id: 'r1',
  date: '2026-09-16',
  quote: '경계와 문턱이 사라짐과 동시에 타자에 대한 환상도 사라진다.',
  bookTitle: '에로스의 종말',
  bookAuthor: '한병철',
  yearsAgo: null,
};

export const LATEST: Record<string, string> = {
  'ub-1': '가진 것을 잃을까 두려운 마음이 나를 가장 많이 붙잡고 있었다.',
  'ub-2': '질문을 바꾸면 같은 하루도 다른 얼굴을 한다.',
};
