'use client';

import { useState, useMemo } from 'react';
import EntryCard from '@/components/EntryCard';
import { MyBook } from '@/types/book';
import { EntryDetailData } from '@/types/entry';
import Image from 'next/image';
import MarkAsFinishedButton from './MarkAsFinishedButton';
import UnfinishBookButton from './UnfinishBookButton';
import { Profile } from '@/types/profile';
import Button from '../ui/Button';
import Link from 'next/link';

interface Props {
  userBook: MyBook;
  entries: EntryDetailData[] | null;
  userId?: string;
  isFriend?: boolean;
  friendProfile?: Profile;
}

export default function BookDetailContent({
  userBook,
  entries,
  userId,
  isFriend = false,
  friendProfile,
}: Props) {
  const [isFinished, setIsFinished] = useState(userBook.is_finished);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterOption, setFilterOption] = useState<'all' | 'public' | 'private'>('all');

  const FILTER_OPTIONS: { value: 'all' | 'public' | 'private'; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'public', label: '공개' },
    { value: 'private', label: '비공개' },
  ];

  const { books, last_read_page, book_id, id } = userBook;
  const { title, author, total_pages, cover_url } = books;

  const sortedEntries = useMemo(() => {
    if (!entries) return null;

    // 1. 먼저 필터링
    let processed = [...entries];
    if (filterOption === 'public') {
      processed = processed.filter((e) => !e.entry.is_private);
    } else if (filterOption === 'private') {
      processed = processed.filter((e) => e.entry.is_private);
    }

    // 2. 이어서 정렬
    return processed.sort((a, b) => {
      const dateA = new Date(a.entry.date).getTime();
      const dateB = new Date(b.entry.date).getTime();
      if (dateA !== dateB) {
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      }
      const createdA = new Date(a.entry.created_at).getTime();
      const createdB = new Date(b.entry.created_at).getTime();
      return sortOrder === 'desc' ? createdB - createdA : createdA - createdB;
    });
  }, [entries, filterOption, sortOrder]);

  // 읽기 기간 — 첫 기록과 마지막 기록의 날짜. 발췌집 표지의 통계와 같은 문법.
  const entryDates = (entries ?? []).map((e) => e.entry.date.slice(0, 10)).sort();
  const readingPeriod = (() => {
    if (entryDates.length === 0) return null;
    const [fy, fm, fd] = entryDates[0].split('-').map(Number);
    const [ly, lm, ld] = entryDates[entryDates.length - 1].split('-').map(Number);
    if (!fy || !fm || !fd || !ly || !lm || !ld) return null;
    const from = `${fy}. ${fm}. ${fd}.`;
    if (entryDates[0] === entryDates[entryDates.length - 1]) return from;
    const to = fy === ly ? `${lm}. ${ld}.` : `${ly}. ${lm}. ${ld}.`;
    return `${from} — ${to}`;
  })();

  // 진행 상황은 막대 대신 잉크로 쓴 분수 하나
  const progressLine =
    total_pages != null
      ? `${last_read_page ?? 0} / ${total_pages}`
      : last_read_page != null
        ? `${last_read_page}쪽`
        : '읽는 중';

  return (
    <div className="space-y-8">
      {/* 속표지 — 표지와 서지 정보 */}
      <section className="flex items-start gap-5 sm:gap-8">
        <Image
          src={cover_url ?? '/images/default-book-cover.png'}
          alt={`${title} 표지`}
          width={128}
          height={192}
          className="w-20 shrink-0 rounded object-cover shadow-sm sm:w-24"
        />
        <div className="min-w-0 pt-1">
          <h1 className="font-serif text-[24px] font-bold leading-snug text-ink sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 font-serif text-[14px] text-ink-sub">{author}</p>
          <p className="mt-5 text-[12.5px] tabular-nums text-ink-faint">
            {progressLine}
            {!isFriend && !isFinished && (
              <>
                <span className="mx-2 text-hairline-strong">·</span>
                <MarkAsFinishedButton onFinish={() => setIsFinished(true)} userBookId={id} />
              </>
            )}
          </p>
          {readingPeriod && (
            <p className="mt-1 text-[12px] tabular-nums text-ink-faint">{readingPeriod}</p>
          )}
        </div>
      </section>

      {/* 완독한 책은 hairline 사이에 한 줄로 */}
      {!isFriend && isFinished && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-hairline py-3">
          <p className="font-serif text-[13.5px] text-ink">
            <span className="font-bold text-accent">완독</span>한 책입니다
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/protected/books/${book_id}/excerpts`}
              className="font-serif text-[12.5px] text-accent hover:underline"
            >
              발췌집 보기 →
            </Link>
            <UnfinishBookButton userBookId={id} onUnfinish={() => setIsFinished(false)} />
          </div>
        </div>
      )}

      {/* 이 책에 남긴 문장들 */}
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-[19px] font-bold text-ink">
            독서 기록
            {entries && entries.length > 0 && (
              <span className="ml-2 text-[13px] font-normal tabular-nums text-ink-faint">
                {entries.length}
              </span>
            )}
          </h2>
          {!isFriend && (
            <Button asChild size="sm" variant="primary">
              <Link href={`/protected/books/${book_id}/entry/new`}>기록 남기기</Link>
            </Button>
          )}
        </div>

        {entries && entries.length > 1 && (
          <div className="mt-3 flex items-center justify-between text-[13.5px]">
            {!isFriend ? (
              <div className="flex items-center gap-3">
                {FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterOption(opt.value)}
                    className={`transition-colors ${
                      filterOption === opt.value
                        ? 'text-ink underline decoration-accent underline-offset-4'
                        : 'text-ink-faint hover:text-ink-sub'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}
            <button
              onClick={() => setSortOrder((v) => (v === 'desc' ? 'asc' : 'desc'))}
              className="text-ink-faint transition-colors hover:text-ink-sub"
            >
              {sortOrder === 'desc' ? '최신순' : '오래된순'} ↕
            </button>
          </div>
        )}

        {sortedEntries && sortedEntries.length > 0 ? (
          <div className="mt-1 divide-y divide-hairline">
            {sortedEntries.map((data) => (
              <EntryCard
                key={data.entry.id}
                variant="flow"
                id={data.entry.id}
                quote={data.entry.quote}
                note={data.entry.note}
                date={data.entry.date}
                fromPage={data.entry.from_page}
                toPage={data.entry.to_page}
                isPrivate={data.entry.is_private}
                userId={userId}
                href={
                  isFriend && friendProfile
                    ? `/protected/social/u/${friendProfile.nickname + '-' + friendProfile.tag}/entry/${data.entry.id}`
                    : undefined
                }
                initialCommentCount={data.initialCommentCount}
                initialLikeCount={data.initialLikeCount}
                initialLiked={data.initialLiked}
              />
            ))}
          </div>
        ) : (
          <p className="mt-6 font-serif text-[13.5px] text-ink-faint">
            아직 이 책에 남긴 문장이 없습니다.
          </p>
        )}
      </section>
    </div>
  );
}
