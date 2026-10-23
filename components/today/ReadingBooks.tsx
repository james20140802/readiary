import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { MyBook } from '@/types/book';
import { readingFraction } from './todayCopy';
import s from './today.module.css';

interface Props {
  books: MyBook[];
  /** 가장 최근에 기록한 책 — 맨 앞에 크게 */
  currentId: string | null;
  latestTexts: Record<string, string>;
  desk?: boolean;
}

const MAX_COVERS = 3;

/** 읽던 책 — 시안 home2 "읽던 책". 표지 셋(첫 권 크게)과 잉크 분수, 마지막으로 남긴 문장 */
export default function ReadingBooks({ books, currentId, latestTexts, desk }: Props) {
  if (books.length === 0) {
    return (
      <div className={desk ? 'mt-0' : 'mt-6'}>
        <p className="font-serif text-note text-ink-sub">
          아직 읽고 있는 책이 없어요. 책을 등록하면 이어 읽던 자리를 여기에서 다시 만나요.
        </p>
        <Button asChild className="mt-5">
          <Link href="/books/new">새 책 등록하기</Link>
        </Button>
      </div>
    );
  }

  const current = books.find((b) => b.id === currentId) ?? books[0];
  const ordered = [current, ...books.filter((b) => b.id !== current.id)];
  const shown = ordered.slice(0, MAX_COVERS);
  const rest = books.length - shown.length;
  const frac = readingFraction({
    last_read_page: current.last_read_page,
    progress: current.progress,
    total: current.books.total_pages,
  });
  const latest = latestTexts[current.id] ?? null;

  const covers = (
    <div className={clsx(s.covers, 'flex items-end gap-3.5')}>
      {shown.map((b, i) => {
        const w = i === 0 ? (desk ? 132 : 150) : desk ? 92 : 96;
        return (
          <Link
            key={b.id}
            href={`/books/${b.book_id}`}
            className={clsx(
              'block rounded-[2px_4px_4px_2px]',
              desk ? 'shrink-0' : clsx('min-w-0', i === 0 ? 'w-[150px]' : 'w-[96px]'),
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper'
            )}
          >
            <Image
              src={b.books.cover_url ?? '/images/default-book-cover.png'}
              alt={`${b.books.title} 표지`}
              width={w}
              height={Math.round(w * 1.5)}
              sizes={`${w}px`}
              className={clsx(
                'aspect-[2/3] h-auto rounded-[2px_4px_4px_2px] bg-sheet object-cover ring-1 ring-hairline',
                desk ? (i === 0 ? 'w-[132px]' : 'w-[92px]') : 'w-full'
              )}
            />
          </Link>
        );
      })}
    </div>
  );
  const fraction = frac && (
    <div className="whitespace-nowrap font-serif text-[26px] text-ink">
      {frac.now} <span className="text-ink-faint">{frac.of}</span>
    </div>
  );

  if (desk) {
    return (
      <section aria-labelledby="today-reading-desk" className={s.reading}>
        <h2 id="today-reading-desk" className="mb-4 font-sans text-overline text-ink-sub">
          읽던 책
        </h2>
        <div className={clsx(s.readingRow, 'flex items-end gap-7')}>
          {covers}
          <div className="min-w-0">
            {fraction}
            <div className="mt-1 font-sans text-caption text-ink-sub">{current.books.title}</div>
            {rest > 0 && (
              <Link
                href="/books"
                className="mt-1 inline-flex min-h-10 items-center font-sans text-caption text-accent focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {rest}권 더 읽는 중
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="mt-6">{covers}</div>
      {fraction && <div className="mt-5">{fraction}</div>}
      <div className="mt-1.5 font-sans text-caption text-ink-sub">
        {current.books.title}
        {rest > 0 ? ` · 외 ${rest}권 읽는 중` : ''}
      </div>
      {latest && (
        <div className="mt-[22px] border-t border-hairline pt-4">
          <div className="font-sans text-overline text-ink-sub">마지막으로 남긴 문장</div>
          <p className="mt-1.5 line-clamp-3 font-serif text-note text-ink">{latest}</p>
        </div>
      )}
      <Link
        href={`/books/${current.book_id}`}
        className="mt-2.5 inline-flex min-h-11 items-center gap-1.5 font-sans text-[17px] font-semibold text-ink focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        책 펼치기
        <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
      </Link>
    </>
  );
}
