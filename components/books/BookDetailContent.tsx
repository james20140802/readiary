'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronsUpDown } from 'lucide-react';
import clsx from 'clsx';
import { useActionLock } from '@/hooks/useActionLock';
import EntryCard from '@/components/EntryCard';
import EntryEditSheet from '@/components/entries/EntryEditSheet';
import { EntryFormValues } from '@/components/entries/EntryFormBody';
import Sheet from '@/components/ui/Sheet';
import { Leaf, Leaves } from '@/components/shell/Leaves';
import { TopBarActions, useTopBar } from '@/components/shell/TopBarContext';
import { patchEntryInList, removeEntryFromList } from '@/lib/entries/entryList';
import { MyBook } from '@/types/book';
import { Entry, EntryDetailData } from '@/types/entry';
import { Profile } from '@/types/profile';
import BookStack, { type FlagEntry } from './BookStack';
import BookActionsMenu from './BookActionsMenu';
import { useMarkAsFinished } from './MarkAsFinishedButton';
import UnfinishBookButton from './UnfinishBookButton';
import { buildFlags } from './flags';
import { monthDay, pageLabel, shortDate } from './bookFormat';
import { BTN_INK, BTN_LINE } from './buttonStyles';

interface Props {
  userBook: MyBook;
  entries: EntryDetailData[] | null;
  userId?: string;
  isFriend?: boolean;
  friendProfile?: Profile;
}

type Order = 'desc' | 'asc';

function compareEntries(order: Order) {
  return (a: EntryDetailData, b: EntryDetailData) => {
    const d = a.entry.date.localeCompare(b.entry.date);
    const c = (a.entry.created_at ?? '').localeCompare(b.entry.created_at ?? '');
    const v = d || c || a.entry.id.localeCompare(b.entry.id);
    return order === 'desc' ? -v : v;
  };
}

const FLAG_HINT =
  '책 옆으로 나온 플래그는 기록을 남긴 쪽이에요. 위가 앞쪽, 아래가 뒤쪽. 같은 날 남긴 기록은 같은 색이에요.';

/**
 * 책 한 권 — 시안 book-layer.html. 왼쪽(모바일은 첫 장)에 표지 위 기록 간지와 플래그,
 * 오른쪽(모바일은 다음 장)에 이 책에서 남긴 기록이 원고처럼 흐른다.
 * 친구의 책도 같은 부품으로 보여 준다(고치기·완독·메뉴 없이).
 */
export default function BookDetailContent({
  userBook,
  entries,
  userId,
  isFriend = false,
  friendProfile,
}: Props) {
  const router = useRouter();
  const finishAction = useActionLock();
  const [isFinished, setIsFinished] = useState(!!userBook.is_finished);
  const [order, setOrder] = useState<Order>('desc');
  const [finishOpen, setFinishOpen] = useState(false);

  // 기록 목록은 서버 props를 따르되, 시트에서 고치거나 지운 결과를 재조회 전에 먼저 반영한다.
  const [entryList, setEntryList] = useState(entries);
  const [prevEntries, setPrevEntries] = useState(entries);
  if (entries !== prevEntries) {
    setPrevEntries(entries);
    setEntryList(entries);
  }
  const [prevFinished, setPrevFinished] = useState(userBook.is_finished);
  if (userBook.is_finished !== prevFinished) {
    setPrevFinished(userBook.is_finished);
    setIsFinished(!!userBook.is_finished);
  }

  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const openEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setIsEditOpen(true);
  };
  const handleSaved = (entryId: string, values: EntryFormValues, isCurrent: boolean) => {
    setEntryList((list) => patchEntryInList(list, entryId, values));
    if (isCurrent) setIsEditOpen(false);
    toast.success('기록을 고쳤어요.');
    router.refresh(); // 쪽수가 바뀌면 진행(last_read_page)도 서버에서 다시 받는다
  };
  const handleDeleted = (entryId: string, isCurrent: boolean) => {
    setEntryList((list) => removeEntryFromList(list, entryId));
    if (isCurrent) setIsEditOpen(false);
    toast.success('기록을 지웠어요.');
    router.refresh();
  };

  const { finish, busy: finishing } = useMarkAsFinished({
    userBookId: userBook.id,
    action: finishAction,
    onFinish: () => {
      setIsFinished(true);
      setFinishOpen(false);
      toast.success('다 읽은 책으로 꽂았어요.');
    },
  });

  const { books, last_read_page, book_id, id } = userBook;
  const { title, author, total_pages, cover_url } = books;
  const list = useMemo(() => entryList ?? [], [entryList]);
  const sorted = useMemo(() => [...list].sort(compareEntries(order)), [list, order]);
  const newest = useMemo(() => [...list].sort(compareEntries('desc')), [list]);
  const latest = newest[0]?.entry;
  const earliest = newest[newest.length - 1]?.entry;
  const quoteCount = list.filter((e) => e.entry.quote?.trim()).length;

  const friendSlug =
    isFriend && friendProfile ? `${friendProfile.nickname}-${friendProfile.tag}` : null;

  const flags = useMemo(
    () =>
      buildFlags<FlagEntry>(
        list.map((d) => ({
          id: d.entry.id,
          date: d.entry.date,
          createdAt: d.entry.created_at,
          fromPage: d.entry.from_page,
          toPage: d.entry.to_page,
          quote: d.entry.quote,
          note: d.entry.note,
          href: friendSlug ? `/social/u/${friendSlug}/entry/${d.entry.id}` : `/entry/${d.entry.id}`,
        })),
        total_pages
      ),
    [list, total_pages, friendSlug]
  );

  const frac: [number, number | null] | null =
    total_pages != null && total_pages > 0
      ? [last_read_page ?? 0, total_pages]
      : last_read_page != null
        ? [last_read_page, null]
        : null;
  const latestPage = latest ? pageLabel(latest.from_page, latest.to_page) : null;

  const stack = (
    <BookStack
      title={title}
      author={author}
      coverUrl={cover_url}
      kicker={`${isFinished ? '다 읽음' : '읽는 중'} · 기록 ${list.length}장`}
      frac={frac}
      quote={latest ? (latest.quote ?? latest.note) : null}
      metaStart={earliest ? `${monthDay(earliest.date)}부터` : null}
      metaEnd={latest ? `${shortDate(latest.date)}${latestPage ? ` · ${latestPage}` : ''}` : null}
      flags={flags}
    />
  );

  const hintText =
    flags.length > 0
      ? FLAG_HINT
      : list.length > 0
        ? '쪽 번호를 적은 기록은 책 옆에 플래그로 꽂혀요.'
        : null;
  const hint = hintText && (
    <p className="mt-2.5 font-sans text-caption leading-[1.5] text-ink-sub">{hintText}</p>
  );

  const actions = !isFriend && (
    <div className="mt-[22px] flex flex-wrap gap-2">
      <Link href={`/books/${book_id}/entry/new`} className={BTN_INK}>
        이어서 남기기
      </Link>
      {isFinished ? (
        <>
          <Link href={`/books/${book_id}/excerpts`} className={BTN_LINE}>
            발췌집 펼치기
          </Link>
          <UnfinishBookButton
            action={finishAction}
            userBookId={id}
            onUnfinish={() => setIsFinished(false)}
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setFinishOpen(true)}
          aria-haspopup="dialog"
          className={BTN_LINE}
        >
          완독
        </button>
      )}
    </div>
  );

  const manuscript = (desktop: boolean) => {
    let slips = 0;
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-sans text-overline text-ink-sub">
            {desktop ? '이 책에서 남긴 기록' : '기록'} {list.length}
          </h2>
          {list.length > 1 && (
            <button
              type="button"
              onClick={() => setOrder((v) => (v === 'desc' ? 'asc' : 'desc'))}
              className="inline-flex min-h-11 items-center gap-1 font-sans text-[14px] font-semibold text-ink-sub"
            >
              {order === 'desc' ? '최신순' : '오래된 순'}
              <ChevronsUpDown size={16} strokeWidth={1.75} aria-hidden />
              <span className="sr-only">, 눌러서 순서 바꾸기</span>
            </button>
          )}
        </div>
        {sorted.length === 0 ? (
          <div className="border-t border-hairline py-8">
            <p className="font-serif text-note text-ink-sub">아직 이 책에 남긴 기록이 없어요.</p>
            {!isFriend && (
              <Link
                href={`/books/${book_id}/entry/new`}
                className="mt-2 inline-flex min-h-11 items-center font-sans text-[17px] font-semibold text-accent"
              >
                첫 문장 남기기
              </Link>
            )}
          </div>
        ) : (
          <>
            {sorted.map((data, i) => {
              const hasSlip = (data.entry.reflectionSummary?.total ?? 0) > 0;
              const tilt: 1 | 2 = hasSlip && slips++ % 2 === 1 ? 2 : 1;
              return (
                <EntryCard
                  key={data.entry.id}
                  first={!desktop && i === 0}
                  slipTilt={tilt}
                  id={data.entry.id}
                  reflectionSummary={data.entry.reflectionSummary}
                  quote={data.entry.quote}
                  note={data.entry.note}
                  date={data.entry.date}
                  fromPage={data.entry.from_page}
                  toPage={data.entry.to_page}
                  isPrivate={data.entry.is_private}
                  userId={userId}
                  href={friendSlug ? `/social/u/${friendSlug}/entry/${data.entry.id}` : undefined}
                  initialCommentCount={data.initialCommentCount}
                  initialLikeCount={data.initialLikeCount}
                  initialLiked={data.initialLiked}
                  onEdit={isFriend ? undefined : () => openEdit(data.entry)}
                />
              );
            })}
            {order === 'desc' && (
              <p className="mt-5 text-center font-sans text-caption text-ink-sub">
                처음 남긴 기록이에요
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {isFriend ? (
        <div className="space-y-10">
          <div>
            {stack}
            {hint}
          </div>
          {manuscript(false)}
        </div>
      ) : (
        <OwnLayout
          title={title}
          menu={
            <BookActionsMenu
              userBookId={id}
              bookId={book_id}
              title={title}
              isFinished={isFinished}
            />
          }
          stack={stack}
          hint={hint}
          actions={actions}
          finished={isFinished}
          manuscript={manuscript}
        />
      )}

      {!isFriend && (
        <>
          <Sheet
            open={finishOpen}
            onClose={() => {
              if (!finishAction.isLocked()) setFinishOpen(false);
            }}
            title="다 읽었나요?"
          >
            <p className="font-serif text-[18px] leading-[1.7] text-ink-sub">
              끝까지 읽지 않았어도 괜찮아요. 내가 다 읽었다고 하면 다 읽은 책이에요.
              {quoteCount > 0
                ? ` 남긴 문장 ${quoteCount}개가 한 권의 발췌집으로 묶여요.`
                : ' 남긴 문장은 한 권의 발췌집으로 묶여요.'}
            </p>
            <button
              type="button"
              onClick={finish}
              disabled={finishing}
              aria-busy={finishing}
              className={clsx(BTN_INK, 'mt-5 w-full')}
            >
              {finishing ? '꽂는 중…' : '다 읽었어요'}
            </button>
          </Sheet>
          <EntryEditSheet
            entry={editingEntry}
            bookId={book_id}
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        </>
      )}
    </>
  );
}

/** 내 책: 모바일은 책 한 장 → 원고 장, 데스크톱은 왼쪽 책(따라 내려옴)과 오른쪽 원고 */
function OwnLayout({
  title,
  menu,
  stack,
  hint,
  actions,
  finished,
  manuscript,
}: {
  title: string;
  menu: React.ReactNode;
  stack: React.ReactNode;
  hint: React.ReactNode;
  actions: React.ReactNode;
  finished: boolean;
  manuscript: (desktop: boolean) => React.ReactNode;
}) {
  useTopBar({ title, back: { href: '/books', label: '책장' } });
  return (
    <>
      <TopBarActions>{menu}</TopBarActions>
      <Leaves>
        <Leaf title={title} free>
          {stack}
          {hint}
          {actions}
        </Leaf>
        <Leaf title="원고" label={`${title}에 남긴 기록`} vellum free>
          {manuscript(false)}
        </Leaf>
      </Leaves>
      <div className="mx-auto hidden max-w-[1400px] grid-cols-[400px_minmax(0,1fr)] items-start gap-16 pb-16 pl-20 pr-14 pt-11 lg:grid">
        <div className="sticky top-11">
          {stack}
          {hint}
          <div className="flex items-start gap-2">
            <div className="flex-1">{actions}</div>
            <div className="mt-[24px]">{menu}</div>
          </div>
          {!finished && (
            <div className="mt-[34px] border-t border-hairline pt-[18px]">
              <div className="font-sans text-overline text-ink-sub">다 읽으면</div>
              <p className="mt-1.5 font-serif text-[17px] leading-[1.65] text-ink">
                남긴 문장들이 한 권의 발췌집으로 묶여요.
              </p>
            </div>
          )}
        </div>
        <div className="mt-[30px]">{manuscript(true)}</div>
      </div>
    </>
  );
}
