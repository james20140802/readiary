'use client';

import { useId, useState, useMemo } from 'react';
import { useActionLock } from '@/hooks/useActionLock';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import EntryCard from '@/components/EntryCard';
import EntryEditSheet from '@/components/entries/EntryEditSheet';
import { EntryFormValues } from '@/components/entries/EntryFormBody';
import { patchEntryInList, removeEntryFromList } from '@/lib/entries/entryList';
import { MyBook } from '@/types/book';
import { Entry, EntryDetailData } from '@/types/entry';
import Image from 'next/image';
import MarkAsFinishedButton from './MarkAsFinishedButton';
import UnfinishBookButton from './UnfinishBookButton';
import { Profile } from '@/types/profile';
import Button from '../ui/Button';
import Link from 'next/link';
import { clsx } from 'clsx';
import { formatReadingPeriod } from '@/lib/dates';
import { motion } from 'framer-motion';
import { inkIn, UNDERLINE_TRANSITION } from '@/lib/motion';
import { useFold } from '@/hooks/useFold';
import { FoldDiv, FoldList } from '@/components/ui/FoldList';

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
  const router = useRouter();
  const finishAction = useActionLock();
  const [isFinished, setIsFinished] = useState(userBook.is_finished);
  // 이 화면에서 방금 완독을 선언했는지 — 그때만 완독 줄이 그어지며 나타난다
  const [justFinished, setJustFinished] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterOption, setFilterOption] = useState<'all' | 'public' | 'private'>('all');
  // 필터를 바꾸면 빠졌던 기록이 새로 마운트된다 — 목록을 한 번 만진 뒤로는 등장 애니메이션 없이 그 자리에 놓는다
  const [listSettled, setListSettled] = useState(false);
  const filterUnderlineId = useId();
  // 이번에 목록에서 빠지는 기록이 지워서 빠지는 것인지 — 그때만 접히며 빠지고,
  // 필터로 빠지는 기록은 지금처럼 바로 사라진다(자주 누르는 조작이라)
  const [foldExits, setFoldExits] = useState(false);
  const fold = useFold({ foldOnExit: (custom) => custom === true });

  // 기록 목록은 서버 props를 따르되, 시트에서 고치거나 지운 결과를 재조회 전에 먼저 반영한다.
  // props가 새로 오면(router.refresh) 렌더 중에 되맞춘다 — React의 '이전 props 기억' 패턴.
  const [entryList, setEntryList] = useState(entries);
  const [prevEntries, setPrevEntries] = useState(entries);
  if (entries !== prevEntries) {
    setPrevEntries(entries);
    setEntryList(entries);
  }

  // 그 자리에서 고치기 — 닫히는 동안에도 마지막 기록을 들고 있어야 퇴장 애니메이션이 자연스럽다
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const openEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setIsEditOpen(true);
  };

  // 저장이 느린 사이 시트를 닫고 다른(또는 같은) 기록을 다시 열었을 수 있다 — 시트가 '요청을 보낸 그 열림'이
  // 아니라고 알려주면(isCurrent=false) 닫지 않는다. 목록 반영은 어느 경우든 한다(서버엔 이미 반영됐으니).
  const handleSaved = (entryId: string, values: EntryFormValues, isCurrent: boolean) => {
    setEntryList((list) => patchEntryInList(list, entryId, values));
    if (isCurrent) setIsEditOpen(false);
    toast.success('기록을 고쳤어요.');
    router.refresh(); // 쪽수가 바뀌면 진행률(last_read_page)도 서버에서 다시 받는다
  };

  const handleDeleted = (entryId: string, isCurrent: boolean) => {
    setFoldExits(true);
    setEntryList((list) => removeEntryFromList(list, entryId));
    if (isCurrent) setIsEditOpen(false);
    toast.success('기록을 지웠어요.');
    router.refresh();
  };

  const FILTER_OPTIONS: { value: 'all' | 'public' | 'private'; label: string }[] = [
    { value: 'all', label: '전체' },
    { value: 'public', label: '공개' },
    { value: 'private', label: '비공개' },
  ];

  const { books, last_read_page, book_id, id } = userBook;
  const { title, author, total_pages, cover_url } = books;

  const sortedEntries = useMemo(() => {
    if (!entryList) return null;

    // 1. 먼저 필터링
    let processed = [...entryList];
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
  }, [entryList, filterOption, sortOrder]);

  // 읽기 기간 — 첫 기록과 마지막 기록의 날짜. 발췌집 표지의 통계와 같은 문법.
  const readingPeriod = formatReadingPeriod((entryList ?? []).map((e) => e.entry.date));

  // 진행 상황은 막대 대신 잉크로 쓴 분수 하나
  const progressLine =
    total_pages != null
      ? `${last_read_page ?? 0} / ${total_pages}`
      : last_read_page != null
        ? `${last_read_page}쪽`
        : '읽는 중';

  return (
    <>
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
            <h1 className="font-serif text-page-title font-bold leading-snug text-ink">{title}</h1>
            <p className="mt-2 font-serif text-body text-ink-sub">{author}</p>
            <p className="mt-5 text-caption tabular-nums text-ink-faint">
              {progressLine}
              {!isFriend && !isFinished && (
                <>
                  <span className="mx-2 text-hairline-strong">·</span>
                  <MarkAsFinishedButton
                    action={finishAction}
                    onFinish={() => {
                      setIsFinished(true);
                      setJustFinished(true);
                    }}
                    userBookId={id}
                  />
                </>
              )}
            </p>
            {readingPeriod && (
              <p className="mt-1 text-caption tabular-nums text-ink-faint">{readingPeriod}</p>
            )}
          </div>
        </section>

        {/* 완독한 책은 hairline 사이에 한 줄로 */}
        {!isFriend && isFinished && (
          <div
            className={clsx(
              'relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y py-3',
              justFinished ? 'border-transparent' : 'border-hairline'
            )}
          >
            {justFinished && (
              <>
                <span
                  aria-hidden
                  className="finish-rule absolute inset-x-0 -top-px h-px bg-hairline"
                />
                <span
                  aria-hidden
                  className="finish-rule absolute inset-x-0 -bottom-px h-px bg-hairline"
                  style={{ animationDelay: '60ms' }}
                />
              </>
            )}
            <p
              className={clsx('font-serif text-body text-ink', justFinished && 'finish-ink')}
              style={justFinished ? { animationDelay: '140ms' } : undefined}
            >
              <span className="font-bold text-accent">완독</span>한 책입니다
            </p>
            <div
              className={clsx('flex items-center gap-2', justFinished && 'finish-ink')}
              style={justFinished ? { animationDelay: '220ms' } : undefined}
            >
              <Link
                href={`/protected/books/${book_id}/excerpts`}
                className="font-serif text-button-sm text-accent hover:underline"
              >
                발췌집 보기 →
              </Link>
              <UnfinishBookButton
                action={finishAction}
                userBookId={id}
                onUnfinish={() => {
                  setIsFinished(false);
                  setJustFinished(false);
                }}
              />
            </div>
          </div>
        )}

        {/* 이 책에 남긴 문장들 */}
        <section>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-serif text-section-title font-bold text-ink">
              독서 기록
              {entryList && entryList.length > 0 && (
                <span className="ml-2 text-caption font-normal tabular-nums text-ink-faint">
                  {entryList.length}
                </span>
              )}
            </h2>
            {!isFriend && (
              <Button asChild size="sm" variant="primary">
                <Link href={`/protected/books/${book_id}/entry/new`}>기록 남기기</Link>
              </Button>
            )}
          </div>

          {entryList && entryList.length > 1 && (
            <div className="mt-3 flex items-center justify-between text-caption">
              {!isFriend ? (
                <div className="flex items-center gap-3">
                  {FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setFilterOption(opt.value);
                        setListSettled(true);
                        setFoldExits(false);
                      }}
                      className={`relative transition-colors ${
                        filterOption === opt.value
                          ? 'text-ink'
                          : 'text-ink-faint hover:text-ink-sub'
                      }`}
                    >
                      {opt.label}
                      {filterOption === opt.value && (
                        <motion.span
                          aria-hidden
                          layoutId={filterUnderlineId}
                          transition={UNDERLINE_TRANSITION}
                          className="absolute inset-x-0 bottom-0 h-px bg-accent"
                        />
                      )}
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

          <FoldList
            className={clsx('mt-1', listSettled && 'ruled-list-settled')}
            custom={foldExits}
            isEmpty={!sortedEntries?.length}
            empty={
              <p className="mt-5 font-serif text-caption text-ink-faint">
                아직 이 책에 남긴 문장이 없습니다.
              </p>
            }
          >
            {sortedEntries?.map((data, i) => (
              // 구분선이 먼저 그어지고 기록이 뒤따른다(globals.css .ruled-item) — 첫 줄은 감추되 늘 렌더해서, 정렬로 첫 자리가 바뀌어도 다시 긋지 않는다
              <FoldDiv
                key={data.entry.id}
                {...fold}
                custom={foldExits}
                className="ruled-item relative pt-px first:pt-0"
              >
                <span
                  aria-hidden
                  className="rule-draw absolute inset-x-0 top-0 h-px bg-hairline"
                  style={inkIn(i)}
                />
                <div className="ink-in" style={inkIn(i)}>
                  <EntryCard
                    id={data.entry.id}
                    reflectionSummary={data.entry.reflectionSummary}
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
                    onEdit={isFriend ? undefined : () => openEdit(data.entry)}
                  />
                </div>
              </FoldDiv>
            ))}
          </FoldList>
        </section>
      </div>

      {/* 시트는 space-y 상자 밖에 — 안에 두면 형제 margin-top(32px)이 fixed 덮개까지 밀어 헤더 위가 비었다 */}
      {!isFriend && (
        <EntryEditSheet
          entry={editingEntry}
          bookId={book_id}
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
