'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { Profile, FeaturedQuote, Stats } from '@/types/profile';
import BookSpineShelf, { type ShelfBook } from '@/components/books/BookSpineShelf';
import { useTopBar } from '@/components/shell/TopBarContext';
import BookThumb from '@/components/social/BookThumb';
import RemoveFriendButton from '@/components/social/RemoveFriendButton';

export interface LibraryCurrentBook {
  title: string;
  coverUrl: string | null;
  lastReadPage: number | null;
  totalPages: number | null;
  href: string;
}

export interface LibrarySentence {
  key: string;
  quote: string;
  meta: string;
  href: string | null;
}

export interface LibraryExcerpt {
  bookId: string;
  title: string;
  coverUrl: string | null;
  quoteCount: number;
  href: string;
}

export interface FriendLibraryViewProps {
  profile: Profile;
  isOwn: boolean;
  stats: Stats | null;
  featuredQuote: FeaturedQuote | null;
  current: LibraryCurrentBook | null;
  sentences: LibrarySentence[];
  shelfBooks: ShelfBook[];
  shelfTotal: number;
  shelfHref: string;
  excerpts: LibraryExcerpt[];
  /** 회고 집계를 못 불러왔을 때 — 발췌집 자리에 안내를 둔다 */
  retrospectError?: boolean;
}

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-1.5 font-sans text-overline text-ink-sub">
      {children}
    </h2>
  );
}

/**
 * 친구의 서재 — 대표 문장이 제목인 표지, 이름과 소개, 지금 읽는 책, 친구에게 보이는 최근 문장, 서가, 발췌집.
 * 시안 friend.html. 데스크톱은 왼쪽에 표지(고정), 오른쪽에 나머지.
 * 친구에게는 공개 기록으로 만든 값만 온다(서버가 publicOnly로 거른다).
 */
export default function FriendLibraryView({
  profile,
  isOwn,
  stats,
  featuredQuote,
  current,
  sentences,
  shelfBooks,
  shelfTotal,
  shelfHref,
  excerpts,
  retrospectError,
}: FriendLibraryViewProps) {
  useTopBar({
    title: `${profile.name}의 서재`,
    back: { href: '/social/friends', label: '친구' },
  });

  const year = profile.created_at ? new Date(profile.created_at).getFullYear() : null;
  const statLine = [
    isOwn ? '나' : '친구',
    stats && `함께한 책 ${stats.totalBooks}`,
    stats && `남긴 문장 ${stats.totalEntries}`,
    stats && `완독 ${stats.finishedBooks}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-[72px]">
      <div className="lg:sticky lg:top-11">
        <h1 className="sr-only">{profile.name}의 서재</h1>
        {/* 표지 — 이 사람이 고른 대표 문장이 책 제목이 된다 */}
        <div
          aria-hidden
          className="mx-auto flex aspect-[7/10] w-[min(220px,58vw)] flex-col rounded-[6px] lg:mx-0 bg-ink pb-[18px] pl-7 pr-[22px] pt-[22px] text-paper lg:w-[280px]"
        >
          <span className="font-sans text-[12px] font-semibold tracking-[0.06em] opacity-80">
            {profile.name} 지음
          </span>
          <span className="mt-auto line-clamp-6 font-serif text-[21px] font-semibold leading-[1.5]">
            {featuredQuote?.quote ?? `${profile.name}의 서재`}
          </span>
          <span className="mt-5 flex justify-between font-mono text-[12px] font-medium opacity-70">
            <span>{year ?? ''}</span>
            {stats && <span>문장 {stats.totalEntries}</span>}
          </span>
        </div>
        {featuredQuote && (
          <p className="sr-only">
            대표 문장: {featuredQuote.quote}
            {featuredQuote.bookTitle ? ` — 『${featuredQuote.bookTitle}』` : ''}
          </p>
        )}

        <p className="mt-5 font-sans text-[20px] font-bold text-ink">
          {profile.name}{' '}
          <span className="font-mono text-[15px] font-medium text-ink-sub">
            {profile.nickname}#{profile.tag}
          </span>
        </p>
        {profile.bio && (
          <p className="mt-1 whitespace-pre-wrap font-serif text-[17px] leading-[1.65] text-ink-sub">
            {profile.bio}
          </p>
        )}
        <p className="mt-2.5 font-sans text-[15px] font-medium text-ink-sub">{statLine}</p>
      </div>

      <div>
        {current && (
          <section aria-labelledby="lib-current" className="mt-7 lg:mt-0">
            <SectionLabel id="lib-current">지금 읽는 책</SectionLabel>
            <Link
              href={current.href}
              className={clsx('mt-3.5 grid grid-cols-[72px_1fr] items-end gap-4', FOCUS)}
            >
              <BookThumb url={current.coverUrl} title={current.title} width={72} />
              <span>
                <span className="block font-serif text-[19px] font-semibold text-ink">
                  {current.title}
                </span>
                {current.lastReadPage != null && (
                  <span className="mt-1.5 block whitespace-nowrap font-serif text-[22px] text-ink">
                    {current.lastReadPage}
                    {current.totalPages != null && (
                      <span className="text-ink-faint"> / {current.totalPages}</span>
                    )}
                  </span>
                )}
              </span>
            </Link>
          </section>
        )}

        <section aria-labelledby="lib-sentences" className="mt-[34px]">
          <SectionLabel id="lib-sentences">친구에게 보이는 최근 문장</SectionLabel>
          {sentences.length === 0 ? (
            <p className="border-t border-hairline py-6 font-sans text-body-sm text-ink-sub">
              아직 친구에게 보이게 남긴 문장이 없어요.
            </p>
          ) : (
            <ul>
              {sentences.map((s) => {
                const body = (
                  <>
                    <span className="block font-serif text-[20px] font-semibold leading-[1.6] tracking-[-0.01em] text-ink">
                      {s.quote}
                    </span>
                    <span className="mt-1.5 block font-sans text-[15px] font-medium text-ink-sub">
                      {s.meta}
                    </span>
                  </>
                );
                return (
                  <li key={s.key} className="border-t border-hairline">
                    {s.href ? (
                      <Link href={s.href} className={clsx('block py-4 hover:text-accent', FOCUS)}>
                        {body}
                      </Link>
                    ) : (
                      <div className="py-4">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="lib-shelf" className="mt-[34px]">
          <div className="flex items-baseline justify-between">
            <SectionLabel id="lib-shelf">서가 {shelfTotal}권</SectionLabel>
            {shelfTotal > 0 && (
              <Link
                href={shelfHref}
                className={clsx(
                  'inline-flex min-h-11 items-center font-sans text-[15px] font-semibold text-ink',
                  FOCUS
                )}
              >
                서가 전체
              </Link>
            )}
          </div>
          {shelfBooks.length === 0 ? (
            <p className="border-t border-hairline py-6 font-sans text-body-sm text-ink-sub">
              아직 꽂힌 책이 없어요.
            </p>
          ) : (
            <BookSpineShelf books={shelfBooks} className="mt-2.5" />
          )}
        </section>

        <section aria-labelledby="lib-excerpts" className="mt-[34px]">
          <SectionLabel id="lib-excerpts">발췌집</SectionLabel>
          {retrospectError ? (
            <p className="border-t border-hairline py-6 font-sans text-body-sm text-ink-sub">
              발췌집을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
            </p>
          ) : excerpts.length === 0 ? (
            <p className="border-t border-hairline py-6 font-sans text-body-sm text-ink-sub">
              다 읽은 책에서 옮겨 적은 문장이 생기면 발췌집이 놓여요.
            </p>
          ) : (
            <ul>
              {excerpts.map((ex) => (
                <li key={ex.bookId} className="border-t border-hairline">
                  <Link
                    href={ex.href}
                    className={clsx(
                      'grid grid-cols-[52px_1fr_auto] items-center gap-3.5 py-3',
                      FOCUS
                    )}
                  >
                    <BookThumb url={ex.coverUrl} title={ex.title} width={52} />
                    <span className="min-w-0">
                      <span className="block truncate font-serif text-[17px] font-semibold text-ink">
                        {ex.title}
                      </span>
                      <span className="block font-sans text-[15px] font-medium text-ink-sub">
                        문장 {ex.quoteCount}
                      </span>
                    </span>
                    <span className="font-sans text-[15px] font-semibold text-accent">펼치기</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!isOwn && (
          <div className="mt-[34px] border-t border-hairline pt-2">
            <RemoveFriendButton friendId={profile.id} name={profile.name} />
          </div>
        )}
      </div>
    </div>
  );
}
