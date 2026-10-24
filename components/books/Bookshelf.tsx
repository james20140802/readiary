'use client';

import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';
import { forwardRef } from 'react';
import styles from './books.module.css';
import { spineColor, spineHeightPercent, spineWidthPx, SPINE_ON_COVER_TEXT } from './shelfStyle';
import { SpineTitle } from './BookSpineShelf';

export interface ShelfSpine {
  id: string;
  title: string;
  coverUrl: string | null;
  totalPages: number | null;
  isFinished: boolean;
  href: string;
}

/**
 * 서가 — 시안 shelf.js·app.css "서가". 선반 판 위에 책등이 바닥을 맞춰 선다.
 * 표지 사진이 없는 책은 표지 색을 흉내 낸 책등으로, 표지가 있는 책은 그 표지의 한가운데 띠를 책등으로 쓴다.
 * 다 읽은 책은 한 단계 물러난다(시안 .spine.done). 선반은 flex 줄바꿈과 반복 그라데이션 판으로 긋는다.
 */
const Bookshelf = forwardRef<
  HTMLUListElement,
  { books: ShelfSpine[]; collapsed?: boolean; id?: string }
>(function Bookshelf({ books, collapsed = false, id }, ref) {
  return (
    <ul
      ref={ref}
      id={id}
      className={clsx(styles.shelves, collapsed && styles.collapsed)}
      aria-label="서가"
    >
      {books.map((b) => {
        const [bg, fg] = spineColor(b.title);
        const label = b.isFinished ? `${b.title}, 다 읽음` : b.title;
        return (
          <li key={b.id} className={styles.slot}>
            <Link
              href={b.href}
              title={b.title}
              aria-label={label}
              className={clsx(styles.spine, b.isFinished && styles.done)}
              style={
                {
                  '--w': `${spineWidthPx(b.title, b.totalPages)}px`,
                  '--h': `${spineHeightPercent(b.title)}%`,
                  '--c': bg,
                  '--t': b.coverUrl ? SPINE_ON_COVER_TEXT : fg,
                } as React.CSSProperties
              }
            >
              {b.coverUrl && (
                <>
                  <Image src={b.coverUrl} alt="" fill sizes="60px" className={styles.spineCover} />
                  <span aria-hidden className={styles.spineScrim} />
                </>
              )}
              <span aria-hidden className={styles.spineText}>
                <SpineTitle title={b.title} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
});

export default Bookshelf;
