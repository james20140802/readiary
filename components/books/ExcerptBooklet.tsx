import Seal from '@/components/ui/Seal';
import { formatReadingPeriod } from '@/lib/dates';
import { koreanCount } from '@/lib/monthly-excerpt/korean-count';

export interface ExcerptBookletProps {
  bookTitle: string;
  author: string | null;
  quotes: { id: string; date: string; quote: string }[];
  /** 읽기 기간 계산용 — 인용 없는 기록의 날짜도 포함한 전체 */
  entryDates: string[];
}

// 우리말 셈은 lib로 옮겼다. 기존 import 경로를 위해 다시 내보낸다.
export { koreanCount };

/**
 * 발췌집 소책자 — 완독의 보상으로 받는 작은 시집.
 * 이중 hairline 액자 표지, 잉크 번호가 달린 문장들, 끝에는 판권장.
 * 화면과 이미지 내보내기가 같은 조판을 공유한다.
 */
export default function ExcerptBooklet({
  bookTitle,
  author,
  quotes,
  entryDates,
}: ExcerptBookletProps) {
  const readingPeriod = formatReadingPeriod(entryDates);

  return (
    <div>
      {/* 표지 — 이중 hairline 액자 */}
      <section className="border border-hairline p-1.5">
        <div className="flex flex-col items-center border border-hairline px-6 py-14 text-center sm:py-16">
          <Seal>발췌집</Seal>
          <h1 className="mt-5 font-serif text-page-title font-bold leading-snug text-ink">
            {bookTitle}
          </h1>
          {author && <p className="mt-3 font-serif text-body text-ink-sub">{author}</p>}
          {readingPeriod && (
            <p className="mt-8 text-caption tabular-nums text-ink-faint">{readingPeriod}</p>
          )}
        </div>
      </section>

      {quotes.length > 0 ? (
        <>
          {/* 본문 — 번호가 달린 문장들 */}
          <div className="space-y-14 py-14">
            {quotes.map((q, i) => (
              <figure key={q.id} className="text-center">
                <div aria-hidden className="font-serif text-caption tabular-nums text-accent">
                  {i + 1}
                </div>
                <blockquote className="mt-3 whitespace-pre-wrap font-serif text-quote text-ink">
                  {q.quote}
                </blockquote>
              </figure>
            ))}
          </div>

          {/* 판권장 */}
          <footer className="border-t border-hairline pb-4 pt-10 text-center">
            <p className="font-serif text-body text-ink">
              『{bookTitle}』{author ? ` — ${author}` : ''}
            </p>
            <p className="mt-2 font-serif text-body text-ink-sub">
              {koreanCount(quotes.length)} 문장을 옮겨 적다
            </p>
            {readingPeriod && (
              <p className="mt-1 text-caption tabular-nums text-ink-faint">{readingPeriod}</p>
            )}
            <p className="mt-8 whitespace-nowrap font-sans text-seal uppercase text-ink-faint">
              READIARY
            </p>
          </footer>
        </>
      ) : (
        <p className="py-12 text-center font-serif text-caption text-ink-faint">
          옮겨 적은 문장이 없어요. 기록의 생각들은 책 상세에서 다시 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
