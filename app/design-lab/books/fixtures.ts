/**
 * 책 화면 견본 데이터 — 시안 books.html·book-layer.html의 책과 문장. 데이터를 가져오지 않는다.
 * 표지 사진은 저작물이라 쓰지 않는다. 몇 권은 앱의 기본 표지로 "표지가 있는 책"을 흉내 낸다.
 */
import type { MyBook } from '@/types/book';
import type { EntryDetailData } from '@/types/entry';
import type { BookReadingStat } from '@/lib/queries/fetchBookReadingStats';

export const LAB_TODAY = '2026-10-06';
const COVER = '/images/default-book-cover.png';

const TITLES = [
  '소유냐 존재냐',
  '철학이 깊을수록 삶은 단순하다',
  '리만 가설',
  '정의란 무엇인가',
  '왜 나는 너를 사랑하는가',
  '작별하지 않는다',
  '소년이 온다',
  '채식주의자',
  '아몬드',
  '데미안',
  '어린 왕자',
  '1984',
  '사피엔스',
  '코스모스',
  '총 균 쇠',
  '이기적 유전자',
  '미움받을 용기',
  '불편한 편의점',
  '파친코',
  '노인과 바다',
  '변신',
  '이방인',
  '인간 실격',
  '노르웨이의 숲',
  '위대한 개츠비',
  '호밀밭의 파수꾼',
  '연금술사',
  '나미야 잡화점의 기적',
  '지구 끝의 온실',
  '시선으로부터',
  '죽음의 수용소에서',
  '생각에 관한 생각',
  '팩트풀니스',
  '침묵의 봄',
  '월든',
  '자기만의 방',
  '백년의 고독',
  '안나 카레니나',
  '죄와 벌',
  '오만과 편견',
  '에로스의 종말',
  '피로사회',
  '여행의 이유',
  '보통의 존재',
  '나의 문화유산답사기',
  '난장이가 쏘아올린 작은 공',
];

const AUTHORS: Record<string, string> = {
  '소유냐 존재냐': '에리히 프롬',
  '철학이 깊을수록 삶은 단순하다': '쑤쑤',
  '리만 가설': '존 더비셔',
  '정의란 무엇인가': '마이클 샌델',
  '왜 나는 너를 사랑하는가': '알랭 드 보통',
  '작별하지 않는다': '한강',
  월든: '헨리 데이비드 소로',
  데미안: '헤르만 헤세',
  채식주의자: '한강',
};

const PAGES: Record<string, number> = {
  '소유냐 존재냐': 352,
  '리만 가설': 584,
  '정의란 무엇인가': 443,
  '작별하지 않는다': 332,
  월든: 512,
};

export function labBooks(): { books: MyBook[]; stats: Record<string, BookReadingStat> } {
  const books: MyBook[] = TITLES.map((title, i) => ({
    id: `ub-${i}`,
    book_id: `b-${i}`,
    progress: null,
    created_at: new Date(Date.UTC(2026, 8, 30 - (i % 28), 9)).toISOString(),
    // 앞의 셋은 읽는 중, 나머지는 대부분 다 읽음
    is_finished: i >= 3 && i % 5 !== 0,
    last_read_page: i === 0 ? 184 : i === 1 ? 42 : null,
    books: {
      id: `b-${i}`,
      title,
      author: AUTHORS[title] ?? null,
      total_pages: PAGES[title] ?? null,
      cover_url: i === 0 || i === 3 || i === 7 ? COVER : null,
    },
  }));
  const stats: Record<string, BookReadingStat> = {};
  books.forEach((b, i) => {
    if (i === 2) return; // 기록이 아직 없는 책
    const last = new Date(Date.UTC(2026, 9, 6 - i * 3));
    const first = new Date(last.getTime() - 20 * 86_400_000);
    stats[b.id] = {
      firstDate: first.toISOString().slice(0, 10),
      lastDate: last.toISOString().slice(0, 10),
      entryCount: [11, 3, 0, 9, 14, 22, 5, 7, 16][i] ?? 1 + (i % 9),
    };
  });
  return { books, stats };
}

/* ── 책 한 권 ── */

const ENTRIES: [number | null, string | null, string | null, string, number, number, boolean][] = [
  // [쪽, 문장, 생각, 날짜, 좋아요, 댓글, 나만 보기]
  [23, null, '첫 장부터 내 얘기 같아서 조금 불편했다.', '2026-09-29', 0, 0, false],
  [62, '소유하려는 마음은 잃을 것을 먼저 센다.', null, '2026-09-29', 1, 0, false],
  [96, '사랑은 가지는 것이 아니라 하는 것이다.', null, '2026-09-29', 3, 1, false],
  [101, '가진 것과 나를 같은 것으로 여길 때 불안이 시작된다.', null, '2026-09-30', 0, 0, true],
  [108, '존재 양식은 나누는 데서 커진다.', null, '2026-09-30', 0, 0, false],
  [
    131,
    '존재의 방식은 무엇을 하느냐보다 어떻게 머무르느냐에 가깝다.',
    '요즘 바쁘다는 말을 너무 자주 했다.',
    '2026-10-02',
    0,
    0,
    true,
  ],
  [null, null, '이 책은 천천히 읽어야겠다. 하루에 열 쪽씩.', '2026-10-03', 0, 0, false],
  [176, '우리는 지식을 가지는 대신 앎을 산다.', null, '2026-10-05', 0, 0, false],
  [181, '두려움은 내가 쥔 것의 크기만큼 자란다.', null, '2026-10-06', 0, 0, false],
  [
    184,
    '가진 것을 잃을까 두려운 마음이 나를 가장 많이 붙잡고 있었다.',
    null,
    '2026-10-06',
    2,
    1,
    false,
  ],
];

const THOUGHTS: Record<number, { body: string; at: string; total: number }> = {
  2: { body: "'하는 것'이라는 말이 계속 남는다.", at: '2026-10-06T03:00:00Z', total: 1 },
  5: { body: '책장 정리를 하다 이 문장이 다시 생각났다.', at: '2026-10-06T01:00:00Z', total: 2 },
};

export function labBook(opts: { finished?: boolean; noTotal?: boolean; empty?: boolean } = {}) {
  const book = {
    id: 'b-0',
    title: '소유냐 존재냐',
    author: '에리히 프롬',
    total_pages: opts.noTotal ? null : 352,
    cover_url: null,
    isbn: null,
  };
  const userBook: MyBook = {
    id: 'ub-0',
    book_id: 'b-0',
    progress: null,
    created_at: '2026-09-28T09:00:00Z',
    is_finished: !!opts.finished,
    last_read_page: opts.empty ? null : 184,
    books: book,
  };
  const entries: EntryDetailData[] = opts.empty
    ? []
    : ENTRIES.map(([page, quote, note, date, likes, comments, isPrivate], i) => ({
        entry: {
          id: `e-${i}`,
          date,
          quote,
          note,
          from_page: page,
          to_page: null,
          is_private: isPrivate,
          book,
          created_at: `${date}T12:00:00Z`,
          reflectionSummary: THOUGHTS[i]
            ? {
                total: THOUGHTS[i].total,
                latest: {
                  id: `r-${i}`,
                  body: THOUGHTS[i].body,
                  created_at: THOUGHTS[i].at,
                  is_private: false,
                },
              }
            : null,
        },
        userId: 'lab-user',
        initialLiked: false,
        initialLikeCount: likes,
        initialCommentCount: comments,
      }));
  return { userBook, entries };
}
