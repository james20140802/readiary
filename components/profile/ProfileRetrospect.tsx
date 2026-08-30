import Link from 'next/link';
import type { RetrospectData } from '@/lib/profile/fetchRetrospectData';

interface ProfileRetrospectProps {
  data: RetrospectData;
}

export default function ProfileRetrospect({ data }: ProfileRetrospectProps) {
  const { finishedBooks, monthly } = data;
  const hasMonthlyActivity = monthly.some((m) => m.count > 0);

  return (
    <section>
      <h2 className="text-section-title font-bold text-ink mb-4">회고</h2>

      {finishedBooks.length === 0 ? (
        <p className="text-body-sm text-ink-sub">완독을 선언하면 그 책의 발췌집이 여기에 쌓여요.</p>
      ) : (
        <div>
          {finishedBooks.map((book) => (
            <Link
              key={book.bookId}
              href={`/protected/books/${book.bookId}/excerpts`}
              className="flex items-center justify-between py-3 border-b border-hairline last:border-b-0 hover:text-accent transition-colors"
            >
              <span className="font-serif text-ink">{book.title}</span>
              <span className="text-caption text-ink-sub shrink-0">문장 {book.quoteCount}개</span>
            </Link>
          ))}
        </div>
      )}

      {hasMonthlyActivity && (
        <div className="mt-8">
          {monthly.map((m) => (
            <div
              key={m.label}
              className="flex items-center justify-between py-3 border-b border-hairline last:border-b-0"
            >
              <span className={m.count > 0 ? 'text-ink' : 'text-ink-faint'}>{m.label}</span>
              <span className={m.count > 0 ? 'text-ink-sub' : 'text-ink-faint'}>
                기록 {m.count}개
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
