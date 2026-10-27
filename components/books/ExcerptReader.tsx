'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Share } from 'lucide-react';
import Button from '@/components/ui/Button';
import Pile from '@/components/ui/Pile';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { formatReadingPeriod, todayKST } from '@/lib/dates';
import { monthDay, spanSentence } from '@/components/entry/dates';
import ExportExcerptsButton from './ExportExcerptsButton';

type Quote = { id: string; date: string; quote: string };

interface ExcerptReaderProps {
  bookTitle: string;
  author: string | null;
  quotes: Quote[];
  /** 읽기 기간 계산용 — 인용 없는 기록의 날짜도 포함한 전체 */
  entryDates: string[];
  /** 책 한 권으로 가는 링크('책 펼치기') */
  bookId?: string;
  /** 견본에서 날짜를 고정할 때 */
  today?: string;
}

const ICON_BUTTON = 'relative grid h-11 w-11 place-items-center rounded-full text-ink';

/**
 * 발췌집(시안 excerpt.html) — 옮겨 적은 문장이 한 장씩 쌓인 간지 묶음. 한 장의 비율(4:5)은 카드로 내보낼 때와 같다.
 * 묶음을 넘기거나 '한 줄로 펼치기'로 처음부터 차례로 읽는다. 이미지로 내보내기는 예전과 같은 조판으로 찍는다.
 */
export default function ExcerptReader({
  bookTitle,
  author,
  quotes,
  entryDates,
  bookId,
  today: todayProp,
}: ExcerptReaderProps) {
  useTopBar({ title: '발췌집', back: { href: '/books', label: '책장' } });
  const [exportOpen, setExportOpen] = useState(false);
  const today = todayProp ?? todayKST();
  const period = formatReadingPeriod(entryDates);
  const has = quotes.length > 0;

  return (
    <>
      {has && (
        <TopBarActions>
          <button
            type="button"
            aria-label="이미지로 내보내기"
            onClick={() => setExportOpen(true)}
            className={ICON_BUTTON}
          >
            <Share size={22} strokeWidth={1.75} aria-hidden />
          </button>
        </TopBarActions>
      )}
      <div className="lg:grid lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:items-start lg:gap-[72px]">
        {/* 표제지 */}
        <div className="pb-2.5 pt-[30px] text-center lg:sticky lg:top-11 lg:text-left">
          <div className="font-sans text-[13px] font-semibold tracking-[0.16em] text-ink-sub">
            발췌집
          </div>
          <h1
            data-skeleton
            className="mt-[18px] text-balance break-keep font-serif text-[30px] font-bold leading-[1.35] text-ink"
          >
            {bookTitle}
          </h1>
          {author && (
            <div data-skeleton className="mt-2 font-sans text-[16px] font-medium text-ink-sub">
              {author}
            </div>
          )}
          {has && (
            <p
              data-skeleton
              className="mt-[26px] text-balance font-serif text-[17px] leading-[1.7] text-ink-sub"
            >
              {spanSentence(
                quotes.map((q) => q.date),
                quotes.length
              )}
            </p>
          )}
          <div className="mt-[22px] flex gap-2">
            {has && (
              <Button size="sm" onClick={() => setExportOpen(true)}>
                이미지로 내보내기
              </Button>
            )}
            {bookId && (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/books/${bookId}`}>책 펼치기</Link>
              </Button>
            )}
          </div>
        </div>

        <div>
          {has ? (
            <ExcerptPile quotes={quotes} today={today} />
          ) : (
            <p className="mt-8 font-serif text-note text-ink-sub">
              옮겨 적은 문장이 없어요. 남긴 생각은 책 한 권에서 다시 볼 수 있어요.
            </p>
          )}
          {/* 판권 */}
          <div className="mt-[30px] border-t border-ink pt-5 font-sans text-[14px] font-medium leading-[1.9] text-ink-sub">
            <span data-skeleton>{bookTitle}</span> 발췌집
            {period && (
              <>
                <br />
                <span data-skeleton>{period}</span>
              </>
            )}
            <br />
            문장 <span data-skeleton>{quotes.length}</span>
          </div>
        </div>
      </div>

      {has && (
        <ExportExcerptsButton
          bookTitle={bookTitle}
          author={author}
          quotes={quotes}
          entryDates={entryDates}
          open={exportOpen}
          onOpenChange={setExportOpen}
          hideTrigger
        />
      )}
    </>
  );
}

const LINK = 'min-h-10 font-sans text-[15px] font-semibold';

/** 옮겨 적은 문장 한 장 — 아래에 옮겨 적은 날 */
function ExcerptSlip({ quote, today }: { quote: Quote; today: string }) {
  return (
    <>
      <p
        data-skeleton
        className="whitespace-pre-wrap break-words font-serif text-[22px] font-semibold leading-[1.65] tracking-[-0.01em] text-ink lg:text-[24px]"
      >
        {quote.quote}
      </p>
      <div className="mt-auto flex justify-end pt-3.5 font-mono text-[13px] font-medium text-ink-faint">
        <time data-skeleton dateTime={quote.date}>
          {monthDay(quote.date, today)}
        </time>
      </div>
    </>
  );
}

// 간지 한 장의 안쪽 여백(.vellum-slip 16/18px)을 시안 .xc(26/24/20px)로 바꾸고 4:5 비율을 준다.
// 비율은 최소 높이로만 작동해 긴 문장은 장이 늘어난다.
const SLIP_BOX =
  '-mx-[18px] -mb-[18px] -mt-4 flex aspect-[4/5] flex-col px-6 pb-5 pt-[26px] lg:aspect-auto lg:min-h-[440px]';

function ExcerptPile({ quotes, today }: { quotes: Quote[]; today: string }) {
  const [flat, setFlat] = useState(false);
  // 펼치고 묶을 때 버튼이 새로 그려지므로 키보드 초점을 다시 그 버튼에 둔다
  const toggleRef = useRef<HTMLButtonElement>(null);
  const toggled = useRef(false);
  useEffect(() => {
    if (!toggled.current) return;
    toggled.current = false;
    toggleRef.current?.focus();
  }, [flat]);

  const toggle = (
    <button
      ref={toggleRef}
      type="button"
      aria-pressed={flat}
      onClick={() => {
        toggled.current = true;
        setFlat((v) => !v);
      }}
      className={`${LINK} text-ink`}
    >
      {flat ? '다시 묶기' : '한 줄로 펼치기'}
    </button>
  );

  if (flat)
    return (
      <div className="lg:max-w-[500px]">
        <div className="mt-2 flex items-center justify-end gap-3.5">{toggle}</div>
        <ol aria-label="옮겨 적은 문장" className="mt-2 flex flex-col gap-3.5">
          {quotes.map((q) => (
            <li key={q.id} className="vellum-slip">
              <div className="-mx-[18px] -mb-[18px] -mt-4 flex flex-col px-6 pb-5 pt-[26px]">
                <ExcerptSlip quote={q} today={today} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    );

  return (
    <Pile
      items={quotes}
      getKey={(q) => q.id}
      label="옮겨 적은 문장 묶음. 맨 위 간지를 옆으로 밀면 다음 문장이 나와요"
      nextLabel="다음 장"
      slipInset={50}
      className="lg:max-w-[500px]"
      renderHeader={({ position, next, canNext, nextLabel }) => (
        <div className="mb-2 mt-2 flex items-center justify-between gap-2">
          <span
            data-skeleton
            aria-live="polite"
            className="font-mono text-[13px] font-medium text-ink-sub"
          >
            {position}
          </span>
          <span className="flex gap-3.5">
            {toggle}
            {canNext && (
              <button type="button" onClick={next} className={`${LINK} text-accent`}>
                {nextLabel}
              </button>
            )}
          </span>
        </div>
      )}
      renderSlip={(q) => (
        <div className={SLIP_BOX}>
          <ExcerptSlip quote={q} today={today} />
        </div>
      )}
    />
  );
}
