import Link from 'next/link';
import type { RetrospectData } from '@/lib/profile/fetchRetrospectData';
import { SpineTitle } from '@/components/books/BookSpineShelf';

interface ProfileRetrospectProps {
  data: RetrospectData;
}

/**
 * 회고 — 완독한 책의 발췌집은 책갈피처럼 세로로 꽂아 두고(1:3, 세로쓰기 제목),
 * 최근 여섯 달의 기록 수는 세리프 숫자 여섯 칸으로.
 */
export default function ProfileRetrospect({ data }: ProfileRetrospectProps) {
  const { finishedBooks, monthly } = data;
  const hasMonthlyActivity = monthly.some((m) => m.count > 0);
  // 오래된 달이 왼쪽에 오도록
  const months = [...monthly].reverse();

  return (
    <section className="mt-12">
      <h2 className="mb-5 font-serif text-[17px] font-bold text-ink">
        발췌집
        {finishedBooks.length > 0 && (
          <span className="ml-2 font-sans text-[12.5px] font-normal tabular-nums text-ink-faint">
            {finishedBooks.length}권
          </span>
        )}
      </h2>

      {finishedBooks.length === 0 ? (
        <p className="font-serif text-[14px] text-ink-sub">
          완독을 선언하면 그 책의 발췌집이 여기에 책갈피처럼 꽂혀요.
        </p>
      ) : (
        <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-1">
          {finishedBooks.map((book) => (
            <li key={book.bookId} className="shrink-0">
              <Link
                href={`/protected/books/${book.bookId}/excerpts`}
                className="group flex h-[212px] w-[68px] flex-col items-center border border-hairline-strong border-t-2 border-t-accent bg-card pb-3 pt-4 transition-transform duration-200 hover:-translate-y-1"
              >
                <span
                  className="min-h-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-serif text-[13.5px] tracking-[0.08em] text-ink group-hover:text-accent"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  <SpineTitle title={book.title} />
                </span>
                <span className="mt-2 shrink-0 font-sans text-[11px] tabular-nums text-ink-faint">
                  {book.quoteCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasMonthlyActivity && (
        <div className="mt-10">
          <h3 className="mb-4 font-serif text-[15px] font-bold text-ink">여섯 달의 기록</h3>
          <ol className="grid grid-cols-6 border-t border-hairline pt-4">
            {months.map((m) => (
              <li key={m.label} className="text-center">
                <p
                  className={`font-serif text-[20px] leading-none tabular-nums ${
                    m.count > 0 ? 'text-ink' : 'text-ink-faint'
                  }`}
                >
                  {m.count}
                </p>
                <p className="mt-2 text-[11px] text-ink-faint">{m.label.replace(/^\d+년 /, '')}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
