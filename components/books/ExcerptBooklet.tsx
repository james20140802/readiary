import Seal from '@/components/ui/Seal';
import { formatReadingPeriod } from '@/lib/dates';

export interface ExcerptBookletProps {
  bookTitle: string;
  author: string | null;
  quotes: { id: string; date: string; quote: string }[];
  /** 읽기 기간 계산용 — 인용 없는 기록의 날짜도 포함한 전체 */
  entryDates: string[];
}

const UNITS = ['한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
const TENS = ['열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];

/** 6 → '여섯', 20 → '스무' — 판권장 문구용 우리말 셈. 100부터는 숫자 그대로. */
export function koreanCount(n: number): string {
  if (n < 1 || n >= 100) return String(n);
  if (n === 20) return '스무';
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  return `${tens > 0 ? TENS[tens - 1] : ''}${unit > 0 ? UNITS[unit - 1] : ''}`;
}

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
          <h1 className="mt-5 font-serif text-[26px] font-bold leading-snug text-ink sm:text-3xl">
            {bookTitle}
          </h1>
          {author && <p className="mt-3 font-serif text-[14px] text-ink-sub">{author}</p>}
          {readingPeriod && (
            <p className="mt-8 text-[12px] tabular-nums text-ink-faint">{readingPeriod}</p>
          )}
        </div>
      </section>

      {quotes.length > 0 ? (
        <>
          {/* 본문 — 번호가 달린 문장들 */}
          <div className="space-y-14 py-14">
            {quotes.map((q, i) => (
              <figure key={q.id} className="text-center">
                <div aria-hidden className="font-serif text-[13px] tabular-nums text-accent">
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
            <p className="font-serif text-[14px] text-ink">
              『{bookTitle}』{author ? ` — ${author}` : ''}
            </p>
            <p className="mt-2 font-serif text-[13px] text-ink-sub">
              {koreanCount(quotes.length)} 문장을 옮겨 적다
            </p>
            {readingPeriod && (
              <p className="mt-1 text-[12px] tabular-nums text-ink-faint">{readingPeriod}</p>
            )}
            <p className="mt-8 whitespace-nowrap font-sans text-seal uppercase text-ink-faint">
              READIARY
            </p>
          </footer>
        </>
      ) : (
        <p className="py-12 text-center font-serif text-[13.5px] text-ink-faint">
          옮겨 적은 문장이 없어요. 기록의 생각들은 책 상세에서 다시 볼 수 있어요.
        </p>
      )}
    </div>
  );
}
