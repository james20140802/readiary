import { describe, expect, it } from 'vitest';
import {
  bookMarkdown,
  exportFileName,
  monthMarkdown,
  type ExportBook,
  type ExportEntry,
} from '../recordMarkdown';

let seq = 0;
function entry(partial: Partial<ExportEntry>): ExportEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    date: '2026-09-03',
    createdAt: '2026-09-03T03:00:00Z',
    quote: null,
    note: null,
    fromPage: null,
    toPage: null,
    reflections: [],
    ...partial,
  };
}

function book(partial: Partial<ExportBook>): ExportBook {
  return {
    userBookId: 'ub1',
    title: '아무튼, 메모',
    author: '정혜윤',
    isFinished: false,
    entries: [],
    ...partial,
  };
}

describe('bookMarkdown', () => {
  it('matches the spec example', () => {
    const md = bookMarkdown(
      book({
        isFinished: true,
        entries: [
          entry({ date: '2026-10-21', createdAt: '2026-10-21T01:00:00Z', note: '다 읽었다.' }),
          entry({
            date: '2026-09-10',
            createdAt: '2026-09-10T01:00:00Z',
            note: '나는 왜 밑줄을 긋고도 금방 잊어버릴까.',
          }),
          entry({
            date: '2026-09-03',
            fromPage: 24,
            quote: '메모는 나를 위해 남겨 두는 작은 신호다.',
            note: '이 문장을 읽고 내 노트 앱을 다시 열어 봤다. 쌓아 두기만 했던 것 같다.',
            reflections: [
              { body: '요즘은 일주일에 한 번 다시 읽는다.', createdAt: '2026-10-02T03:00:00Z' },
            ],
          }),
        ],
      })
    );
    expect(md).toBe(
      [
        '# 아무튼, 메모',
        '',
        '정혜윤 · 2026년 9월 3일 ~ 10월 21일 · 완독',
        '',
        '## 2026년 9월 3일 · 24쪽',
        '',
        '> 메모는 나를 위해 남겨 두는 작은 신호다.',
        '',
        '이 문장을 읽고 내 노트 앱을 다시 열어 봤다. 쌓아 두기만 했던 것 같다.',
        '',
        '- 2026년 10월 2일 덧붙임: 요즘은 일주일에 한 번 다시 읽는다.',
        '',
        '## 2026년 9월 10일',
        '',
        '나는 왜 밑줄을 긋고도 금방 잊어버릴까.',
        '',
        '## 2026년 10월 21일',
        '',
        '다 읽었다.',
        '',
      ].join('\n')
    );
  });

  it('gives same-day entries their own heading, ordered by created_at', () => {
    const md = bookMarkdown(
      book({
        entries: [
          entry({ createdAt: '2026-09-03T09:00:00Z', fromPage: 31, note: '둘째' }),
          entry({ createdAt: '2026-09-03T02:00:00Z', fromPage: 24, note: '첫째' }),
        ],
      })
    );
    expect(md.indexOf('## 2026년 9월 3일 · 24쪽')).toBeLessThan(
      md.indexOf('## 2026년 9월 3일 · 31쪽')
    );
    expect(md.indexOf('첫째')).toBeLessThan(md.indexOf('둘째'));
  });

  it('prefixes every line of a multi-line quote with >', () => {
    const md = bookMarkdown(book({ entries: [entry({ quote: '첫 줄\n\n셋째 줄' })] }));
    expect(md).toContain('> 첫 줄\n>\n> 셋째 줄');
  });

  it('indents reflection continuation and blank lines by 2 spaces', () => {
    const md = bookMarkdown(
      book({
        entries: [
          entry({
            note: '생각',
            reflections: [{ body: '하나\n둘\n\n셋', createdAt: '2026-09-04T03:00:00Z' }],
          }),
        ],
      })
    );
    expect(md).toContain('- 2026년 9월 4일 덧붙임: 하나\n  둘\n  \n  셋');
  });

  it('orders reflections by created_at and dates them in KST', () => {
    const md = bookMarkdown(
      book({
        entries: [
          entry({
            note: '생각',
            reflections: [
              { body: '나중', createdAt: '2026-10-05T03:00:00Z' },
              // KST 10월 2일 01시
              { body: '먼저', createdAt: '2026-10-01T16:00:00Z' },
            ],
          }),
        ],
      })
    );
    expect(md).toContain('- 2026년 10월 2일 덧붙임: 먼저\n- 2026년 10월 5일 덧붙임: 나중');
  });

  it('omits author, finished and page when absent', () => {
    const md = bookMarkdown(book({ author: null, entries: [entry({ note: '생각' })] }));
    expect(md.split('\n').slice(0, 5)).toEqual([
      '# 아무튼, 메모',
      '',
      '2026년 9월 3일',
      '',
      '## 2026년 9월 3일',
    ]);
  });

  it('skips entries without content', () => {
    const md = bookMarkdown(
      book({
        entries: [entry({ quote: '  ', note: '' }), entry({ date: '2026-09-05', note: '남음' })],
      })
    );
    expect(md).not.toContain('9월 3일');
    expect(md).toContain('## 2026년 9월 5일');
  });

  it('writes only the title when there is nothing to export', () => {
    expect(bookMarkdown(book({ author: null, entries: [] }))).toBe('# 아무튼, 메모\n');
  });

  it('page labels', () => {
    const heading = (fromPage: number | null, toPage: number | null) =>
      bookMarkdown(book({ entries: [entry({ note: 'x', fromPage, toPage })] })).split('\n')[4];
    expect(heading(24, null)).toBe('## 2026년 9월 3일 · 24쪽');
    expect(heading(24, 31)).toBe('## 2026년 9월 3일 · 24~31쪽');
    expect(heading(24, 24)).toBe('## 2026년 9월 3일 · 24쪽');
    expect(heading(null, 31)).toBe('## 2026년 9월 3일 · 31쪽');
    expect(heading(31, 24)).toBe('## 2026년 9월 3일 · 31쪽');
  });

  it('period across years keeps the later year', () => {
    const md = bookMarkdown(
      book({
        entries: [
          entry({ date: '2025-12-30', note: 'a' }),
          entry({ date: '2026-01-02', note: 'b' }),
        ],
      })
    );
    expect(md).toContain('정혜윤 · 2025년 12월 30일 ~ 2026년 1월 2일');
  });

  it('single-day period shows one date', () => {
    const md = bookMarkdown(book({ entries: [entry({ note: 'a' }), entry({ note: 'b' })] }));
    expect(md).toContain('정혜윤 · 2026년 9월 3일\n');
  });
});

describe('monthMarkdown', () => {
  it('groups by book in order of first entry in the month', () => {
    const md = monthMarkdown('2026-10', [
      book({
        userBookId: 'ub2',
        title: '작별하지 않는다',
        author: '한강',
        entries: [entry({ date: '2026-10-15', note: '눈' })],
      }),
      book({
        entries: [
          entry({ date: '2026-10-20', note: '나중' }),
          entry({ date: '2026-10-02', fromPage: 112, quote: '문장' }),
        ],
      }),
      book({ userBookId: 'ub3', title: '빈 책', author: null, entries: [entry({ note: ' ' })] }),
    ]);
    expect(md).toBe(
      [
        '# 2026년 10월의 기록',
        '',
        '## 아무튼, 메모 — 정혜윤',
        '',
        '### 10월 2일 · 112쪽',
        '',
        '> 문장',
        '',
        '### 10월 20일',
        '',
        '나중',
        '',
        '## 작별하지 않는다 — 한강',
        '',
        '### 10월 15일',
        '',
        '눈',
        '',
      ].join('\n')
    );
  });

  it('uses the bare title when the author is missing', () => {
    const md = monthMarkdown('2026-10', [
      book({ author: null, entries: [entry({ date: '2026-10-02', note: 'a' })] }),
    ]);
    expect(md).toContain('## 아무튼, 메모\n');
  });
});

describe('exportFileName', () => {
  it('keeps readable titles', () => {
    expect(exportFileName('아무튼, 메모')).toBe('readiary-아무튼, 메모.md');
    expect(exportFileName('2026-10')).toBe('readiary-2026-10.md');
  });

  it('replaces characters files cannot hold', () => {
    expect(exportFileName('a/b:c?')).toBe('readiary-a-b-c.md');
    expect(exportFileName('  .숨은 "제목" | 끝.  ')).toBe('readiary-숨은 -제목- - 끝.md');
    expect(exportFileName('줄\n바꿈')).toBe('readiary-줄-바꿈.md');
  });

  it('falls back when nothing is left', () => {
    expect(exportFileName('')).toBe('readiary-기록.md');
    expect(exportFileName('???')).toBe('readiary-기록.md');
  });
});
