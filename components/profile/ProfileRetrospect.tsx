import Link from 'next/link';
import type { RetrospectData } from '@/lib/profile/fetchRetrospectData';
import { SpineTitle } from '@/components/books/BookSpineShelf';

interface ProfileRetrospectProps {
  data: RetrospectData;
}

/** 롱 인덱스 필름의 반투명 색 — 종이 위에 겹쳐 보이도록 알파를 낮게 */
const INDEX_TINTS = [
  'rgb(228 118 128 / 0.45)',
  'rgb(238 158 96 / 0.45)',
  'rgb(226 196 72 / 0.5)',
  'rgb(116 188 138 / 0.45)',
  'rgb(112 168 222 / 0.45)',
  'rgb(160 140 212 / 0.45)',
];

const INDEX_MIN = 26; // 기록이 있는 달의 최소 길이(px)
const INDEX_RANGE = 96; // 최대 기록에 더해지는 길이(px)
const INDEX_BASE = 22; // 책 윗면 아래, 달 이름이 서는 높이(px)

/**
 * 책갈피의 끈 — 위쪽 구멍을 지나 오른쪽으로 늘어지고 끝에 술이 달린다. 잉크색 선묘 하나.
 */
function BookmarkCord() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 92"
      className="pointer-events-none absolute left-[30px] top-[10px] h-[92px] w-[48px] overflow-visible text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4c11 0 25 6 32 22l3 40" />
      <path d="M4 4c8-4 22 0 33 18" opacity="0.6" />
      <circle cx="39" cy="66" r="1.8" fill="currentColor" stroke="none" />
      <path d="M39 68l-4 18M39 68l-1 20M39 68l3 19M39 68l6 16" opacity="0.85" />
    </svg>
  );
}

/**
 * 회고 — 완독한 책의 발췌집은 책갈피처럼 세로로 꽂아 두고(1:3, 세로쓰기 제목, 구멍과 끈),
 * 최근 여섯 달의 기록 수는 책 윗면에 꽂은 롱 인덱스 여섯 장의 길이로.
 */
export default function ProfileRetrospect({ data }: ProfileRetrospectProps) {
  const { finishedBooks, monthly } = data;
  const hasMonthlyActivity = monthly.some((m) => m.count > 0);
  // 오래된 달이 왼쪽에 오도록
  const months = [...monthly].reverse();
  const maxCount = Math.max(...months.map((m) => m.count), 1);

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
            <li key={book.bookId} className="relative shrink-0 pr-2">
              <Link
                href={`/protected/books/${book.bookId}/excerpts`}
                className="group relative flex h-[212px] w-[68px] flex-col items-center border border-hairline-strong bg-card pb-3 pt-7 transition-transform duration-200 hover:-translate-y-1"
              >
                {/* 구멍 — 종이가 뚫려 아래 종이색이 보인다 */}
                <span
                  aria-hidden
                  className="absolute left-1/2 top-2.5 h-2 w-2 -translate-x-1/2 rounded-full border border-hairline-strong bg-paper"
                />
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
              <BookmarkCord />
            </li>
          ))}
        </ul>
      )}

      {hasMonthlyActivity && (
        <div className="mt-10">
          <h3 className="mb-4 font-serif text-[15px] font-bold text-ink">여섯 달의 기록</h3>
          {/* 책 윗면(강한 괘선)에서 롱 인덱스가 솟는다 — 길이는 그 달의 기록 수 */}
          <ol
            className="relative flex items-end justify-between px-3 sm:px-10"
            style={{ height: INDEX_BASE + INDEX_MIN + INDEX_RANGE + 26 }}
          >
            <span
              aria-hidden
              className="absolute inset-x-0 border-t-2 border-hairline-strong"
              style={{ bottom: INDEX_BASE }}
            />
            {months.map((m, i) => {
              const length =
                m.count > 0 ? INDEX_MIN + Math.round((m.count / maxCount) * INDEX_RANGE) : 3;
              return (
                <li key={m.label} className="relative flex flex-col items-center">
                  <span
                    className={`mb-1.5 font-sans text-[11px] leading-none tabular-nums ${
                      m.count > 0 ? 'text-ink-sub' : 'text-ink-faint'
                    }`}
                  >
                    {m.count}
                  </span>
                  <span
                    aria-hidden
                    className="block w-[14px] rounded-t-[2px]"
                    style={{
                      height: length,
                      backgroundColor:
                        m.count > 0
                          ? INDEX_TINTS[i % INDEX_TINTS.length]
                          : 'rgb(var(--hairline-strong))',
                    }}
                  />
                  <span
                    className="flex items-center text-[11px] text-ink-faint"
                    style={{ height: INDEX_BASE }}
                  >
                    {m.label.replace(/^\d+년 /, '')}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
