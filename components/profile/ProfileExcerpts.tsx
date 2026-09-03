import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { FinishedBookExcerpt } from '@/lib/profile/fetchRetrospectData';
import {
  EXCERPT_STACK_MAX,
  NOTEBOOK_H,
  NOTEBOOK_SHIFT,
  NOTEBOOK_TONES,
  NOTEBOOK_W,
  NOTEBOOK_W_STEP,
  stackExcerpts,
} from '@/lib/profile/bookGeometry';

interface Props {
  /** 책갈피로 꽂은 것을 뺀 나머지 발췌집 — 최근 완독부터 */
  books: FinishedBookExcerpt[];
  /** 발췌집 링크 — 본인은 발췌집 페이지, 친구는 그 책 페이지 */
  hrefFor: (bookId: string) => string;
}

/** 윗면·옆면이 물러나는 깊이(px) — 납작하게 쌓인 공책의 입체 */
const DEPTH = 8;
/** 더미 가장 넓은 권 + 밀림이 들어갈 폭 */
const STACK_W = NOTEBOOK_W + Math.max(...NOTEBOOK_W_STEP) + Math.max(...NOTEBOOK_SHIFT) + DEPTH;

/**
 * 발췌집 — 책장 아래에 쌓인 공책 더미. 완독한 책마다 한 권씩 책등을 앞으로 눕혀 쌓고,
 * 한 더미에 EXCERPT_STACK_MAX권까지, 넘치면 옆에 새 더미. 좁은 화면에서는 오른쪽 더미가 가려지고
 * 맨 위·첫 더미가 가장 최근 것이다. 책갈피로 꽂아 둔 한 권은 프로필 책 안에 있으니 여기서는 뺀다.
 */
export default function ProfileExcerpts({ books, hrefFor }: Props) {
  if (books.length === 0) return null;
  const stacks = stackExcerpts(books, EXCERPT_STACK_MAX);

  return (
    <section className="mt-12">
      <h2 className="mb-6 font-serif text-[17px] font-bold text-ink">
        발췌집
        <span className="ml-2 font-sans text-[12.5px] font-normal tabular-nums text-ink-faint">
          {books.length}권
        </span>
      </h2>
      <div
        className={`flex items-end gap-12 overflow-hidden pt-3 ${
          stacks.length > 1
            ? '[mask-image:linear-gradient(to_right,black_calc(100%-48px),transparent)]'
            : ''
        }`}
      >
        {stacks.map((stack, s) => (
          <ol
            key={s}
            aria-label={`발췌집 더미 ${s + 1}`}
            className="flex shrink-0 flex-col"
            style={{ width: STACK_W }}
          >
            {stack.map((book, i) => {
              const tone = NOTEBOOK_TONES[(s * EXCERPT_STACK_MAX + i) % NOTEBOOK_TONES.length];
              const width = NOTEBOOK_W + NOTEBOOK_W_STEP[i % NOTEBOOK_W_STEP.length];
              const shift = NOTEBOOK_SHIFT[i % NOTEBOOK_SHIFT.length];
              const face: CSSProperties = { backgroundColor: tone.bg, borderColor: tone.border };
              return (
                <li
                  key={book.bookId}
                  className="relative"
                  style={{ marginLeft: shift, width, height: NOTEBOOK_H, zIndex: stack.length - i }}
                >
                  <Link
                    href={hrefFor(book.bookId)}
                    title={`${book.title} · 문장 ${book.quoteCount}`}
                    className="group absolute inset-0 block transition-transform duration-200 hover:translate-x-2 focus-visible:translate-x-2"
                  >
                    {/* 윗면 — 표지가 뒤로 물러난다 */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 border border-b-0"
                      style={{
                        ...face,
                        top: -DEPTH,
                        height: DEPTH,
                        transformOrigin: 'bottom left',
                        transform: 'skewX(-50deg)',
                        filter: 'brightness(1.12)',
                      }}
                    />
                    {/* 옆면 — 낱장 단면 */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 border border-l-0 border-hairline-strong"
                      style={{
                        right: -DEPTH,
                        width: DEPTH,
                        transformOrigin: 'top left',
                        transform: 'skewY(-40deg)',
                        backgroundImage:
                          'repeating-linear-gradient(to bottom, rgb(var(--card)) 0 1px, rgb(var(--hairline)) 1px 2px)',
                      }}
                    />
                    {/* 책등 — 제목 */}
                    <span
                      className="absolute inset-0 flex items-center justify-between gap-3 rounded-l-[6px] border px-5"
                      style={{ ...face, color: tone.fg }}
                    >
                      <span className="min-w-0 truncate font-serif text-[14.5px] tracking-[0.02em] group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                        {book.title}
                      </span>
                      <span className="shrink-0 font-sans text-[11px] tabular-nums opacity-70">
                        {book.quoteCount}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        ))}
      </div>
    </section>
  );
}
