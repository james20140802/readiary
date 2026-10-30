import { formatInTimeZone } from 'date-fns-tz';

/**
 * 내 기록을 마크다운으로 — AI에 붙여 넣어 함께 이야기하거나 다른 곳에 옮길 텍스트.
 * 기록만 담는다(안내문·장식 없음). 규칙은 docs/superpowers/specs/2026-10-30-record-export-design.md.
 * 책 한 권과 한 달이 같은 기록 서식을 쓴다. 나중에 월별 일기장도 이 함수를 그대로 쓴다.
 */

export interface ExportReflection {
  body: string;
  /** ISO timestamptz — 덧붙인 날짜는 KST로 읽는다 */
  createdAt: string;
}

export interface ExportEntry {
  id: string;
  /** 'YYYY-MM-DD' 기록 날짜 */
  date: string;
  createdAt: string;
  quote: string | null;
  note: string | null;
  fromPage: number | null;
  toPage: number | null;
  reflections: ExportReflection[];
}

export interface ExportBook {
  userBookId: string;
  title: string;
  author: string | null;
  isFinished: boolean;
  entries: ExportEntry[];
}

const KST = 'Asia/Seoul';

const hasText = (value: string | null): value is string => !!value && value.trim() !== '';

function parts(date: string) {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

const fullDate = (date: string) => {
  const { y, m, d } = parts(date);
  return `${y}년 ${m}월 ${d}일`;
};
const monthDayLabel = (date: string) => {
  const { m, d } = parts(date);
  return `${m}월 ${d}일`;
};

function pageLabel(from: number | null, to: number | null): string | null {
  if (from != null && to != null && to > from) return `${from}~${to}쪽`;
  if (from != null) return `${from}쪽`;
  if (to != null) return `${to}쪽`;
  return null;
}

/** 날짜 → 작성 시각 → id 오름차순, 내용 없는 기록은 뺀다 */
function readable(entries: ExportEntry[]): ExportEntry[] {
  return entries
    .filter((e) => hasText(e.quote) || hasText(e.note))
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id)
    );
}

/** 제목 줄 뒤에 붙는 기록 본문(문장 → 생각 → 덧붙임)을 블록 목록으로 */
function entryBlocks(entry: ExportEntry): string[] {
  const blocks: string[] = [];
  if (hasText(entry.quote)) {
    blocks.push(
      entry.quote
        .split('\n')
        .map((line) => (line === '' ? '>' : `> ${line}`))
        .join('\n')
    );
  }
  if (hasText(entry.note)) blocks.push(entry.note);
  const reflections = entry.reflections
    .filter((r) => hasText(r.body))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (reflections.length > 0) {
    blocks.push(
      reflections
        .map((r) => {
          const date = fullDate(formatInTimeZone(r.createdAt, KST, 'yyyy-MM-dd'));
          return `- ${date} 덧붙임: ${r.body.split('\n').join('\n  ')}`;
        })
        .join('\n')
    );
  }
  return blocks;
}

function heading(level: string, dateLabel: string, entry: ExportEntry): string {
  const page = pageLabel(entry.fromPage, entry.toPage);
  return `${level} ${dateLabel}${page ? ` · ${page}` : ''}`;
}

function period(entries: ExportEntry[]): string | null {
  if (entries.length === 0) return null;
  const first = entries[0].date;
  const last = entries[entries.length - 1].date;
  if (first.slice(0, 10) === last.slice(0, 10)) return fullDate(first);
  const to = parts(first).y === parts(last).y ? monthDayLabel(last) : fullDate(last);
  return `${fullDate(first)} ~ ${to}`;
}

const join = (blocks: string[]) => `${blocks.join('\n\n')}\n`;

export function bookMarkdown(book: ExportBook): string {
  const entries = readable(book.entries);
  const meta = [book.author?.trim() || null, period(entries), book.isFinished ? '완독' : null]
    .filter(Boolean)
    .join(' · ');
  const blocks = [`# ${book.title}`];
  if (meta && entries.length > 0) blocks.push(meta);
  for (const entry of entries) {
    blocks.push(heading('##', fullDate(entry.date), entry), ...entryBlocks(entry));
  }
  return join(blocks);
}

export function monthMarkdown(month: string, books: ExportBook[]): string {
  const [y, m] = month.split('-').map(Number);
  const groups = books
    .map((book) => ({ book, entries: readable(book.entries) }))
    .filter((g) => g.entries.length > 0)
    .sort((a, b) => {
      const x = a.entries[0];
      const y2 = b.entries[0];
      return x.date.localeCompare(y2.date) || x.createdAt.localeCompare(y2.createdAt);
    });
  const blocks = [`# ${y}년 ${m}월의 기록`];
  for (const { book, entries } of groups) {
    const author = book.author?.trim();
    blocks.push(`## ${book.title}${author ? ` — ${author}` : ''}`);
    for (const entry of entries) {
      blocks.push(heading('###', monthDayLabel(entry.date), entry), ...entryBlocks(entry));
    }
  }
  return join(blocks);
}

/** 'readiary-<이름>.md' — 파일 이름에 쓸 수 없는 문자는 '-'로, 앞뒤 공백·점·'-'는 지운다 */
export function exportFileName(base: string): string {
  const safe = base

    .replace(/[/\\:*?"<>|\u0000-\u001f\u007f]+/g, '-')
    .replace(/^[\s.-]+|[\s.-]+$/g, '')
    .slice(0, 80);
  return `readiary-${safe || '기록'}.md`;
}
