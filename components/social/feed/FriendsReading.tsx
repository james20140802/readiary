import Link from 'next/link';
import clsx from 'clsx';
import BookThumb from '@/components/social/BookThumb';
import type { FriendReading } from '@/components/social/feedFormat';
import styles from './feed.module.css';

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const libraryHref = (r: FriendReading) => `/social/u/${r.profile.nickname}-${r.profile.tag}`;

/** 모바일: 친구들이 읽는 책을 표지로 가로로 넘겨 본다 (시안 .reading) */
export function FriendsReadingStrip({ list }: { list: FriendReading[] }) {
  if (list.length === 0) return null;
  return (
    <section aria-label="친구들이 읽는 책" className="lg:hidden">
      <ul
        className={clsx(
          styles.reading,
          '-mx-6 flex snap-x snap-proximity scroll-px-6 gap-3.5 overflow-x-auto px-6 pb-1.5 pt-0.5'
        )}
      >
        {list.map((r) => (
          <li key={r.profile.id} className="w-16 flex-none snap-start">
            <Link
              href={libraryHref(r)}
              className={clsx('grid justify-items-center gap-0.5 rounded-sm text-center', FOCUS)}
            >
              <BookThumb
                url={r.book.cover_url}
                title={r.book.title}
                width={56}
                className="mb-1.5"
              />
              <span
                data-skeleton
                className="w-full truncate font-sans text-[14px] font-semibold text-ink"
              >
                {r.profile.name}
              </span>
              <span
                data-skeleton
                className="w-full truncate font-sans text-[13px] font-medium text-ink-sub"
              >
                {r.label}
              </span>
              <span className="sr-only">『{r.book.title}』 읽는 중, 서재 보기</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 데스크톱 옆 칸: 친구마다 한 줄 — 표지, 이름, 책과 쪽, 서재 (시안 .friend) */
export function FriendsReadingList({ list }: { list: FriendReading[] }) {
  if (list.length === 0) return null;
  return (
    <section aria-labelledby="friends-reading-label">
      <h2 id="friends-reading-label" className="mb-1.5 font-sans text-overline text-ink-sub">
        친구들이 읽는 책
      </h2>
      <ul>
        {list.map((r) => (
          <li key={r.profile.id} className="border-t border-hairline">
            <Link
              href={libraryHref(r)}
              className={clsx(
                'grid grid-cols-[40px_1fr_auto] items-center gap-x-3.5 gap-y-0.5 py-3',
                FOCUS
              )}
            >
              <BookThumb
                url={r.book.cover_url}
                title={r.book.title}
                width={40}
                className="row-span-2"
              />
              <span data-skeleton className="self-end font-sans text-[16px] font-semibold text-ink">
                {r.profile.name}
              </span>
              <span className="row-span-2 font-sans text-[14px] font-semibold text-accent">
                서재
              </span>
              <span
                data-skeleton
                className="col-start-2 self-start truncate font-sans text-[14px] font-medium text-ink-sub"
              >
                {r.book.title} · {r.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
