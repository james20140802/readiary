import Seal from '@/components/ui/Seal';
import BackButton from '@/components/ui/BackButton';
import { formatReadingPeriod } from '@/lib/dates';

interface ExcerptReaderProps {
  bookTitle: string;
  author: string | null;
  quotes: { id: string; date: string; quote: string }[];
  /** 읽기 기간 계산용 — 인용 없는 기록의 날짜도 포함한 전체 */
  entryDates: string[];
}

/**
 * 발췌집 — 완독의 보상으로 받는 작은 시집.
 * 문장만 중앙 정렬로 흐르고, 날짜·따옴표 없이 짧은 hairline이 문장 사이를 쉼표처럼 끊는다.
 */
export default function ExcerptReader({
  bookTitle,
  author,
  quotes,
  entryDates,
}: ExcerptReaderProps) {
  const readingPeriod = formatReadingPeriod(entryDates);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <header className="flex items-center mb-6">
        <BackButton />
      </header>

      {/* 표지 — 책 상세 속표지와 같은 문법, 다만 중앙 정렬 */}
      <section className="flex flex-col items-center text-center pb-12 border-b border-hairline">
        <Seal>발췌집</Seal>
        <h1 className="font-serif text-2xl font-bold text-ink mt-4">{bookTitle}</h1>
        {author && <p className="font-serif text-[14px] text-ink-sub mt-2">{author}</p>}
        <p className="mt-6 text-[12.5px] tabular-nums text-ink-faint">
          문장 {quotes.length}개{readingPeriod ? ` · ${readingPeriod}` : ''}
        </p>
      </section>

      {quotes.length > 0 ? (
        <div className="py-12">
          {quotes.map((q, i) => (
            <div key={q.id}>
              {i > 0 && <div aria-hidden className="mx-auto my-12 w-10 border-t border-hairline" />}
              <blockquote className="text-center font-serif text-quote text-ink whitespace-pre-wrap">
                {q.quote}
              </blockquote>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center font-serif text-[13.5px] text-ink-faint">
          옮겨 적은 문장이 없어요. 기록의 생각들은 책 상세에서 다시 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
