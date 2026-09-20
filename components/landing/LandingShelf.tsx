'use client';

import { useEffect, useRef } from 'react';
import { LayoutGroup } from 'framer-motion';
import OpenBook from '@/components/books/OpenBook';
import { useOpenBook } from '@/components/books/useOpenBook';
import BookSpineShelf from '@/components/books/BookSpineShelf';
import SlideHeading from './SlideHeading';
import { SlideBody } from './Slide';
import { SHELF_DEMO } from './demo';

/** ④ 책장 — 내 책 화면의 책등 서가 그대로. 두께는 쪽수, 잉크 점 하나는 완독 */
export default function LandingShelf() {
  const { openBook, slotOpen, hiddenId, handleOpen, closeBook, handleReturn, handleClosed } =
    useOpenBook();
  const shelfRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!slotOpen && document.activeElement === document.body) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [slotOpen]);

  return (
    <div>
      <SlideHeading
        eyebrow="책장"
        title="책장은 두께로 말합니다"
        body="책등의 두께는 쪽수에 비례하고, 완독한 책은 눌린 종이색에 잉크 점 하나가 찍힙니다. 진행률 막대 없이도 책장이 성취를 말해 줘요."
      />
      <SlideBody>
        <LayoutGroup id="landing-shelf">
          <div ref={shelfRef} className="mt-10 md:mt-12">
            <OpenBook
              book={openBook}
              slotOpen={slotOpen}
              onClose={closeBook}
              onReturn={handleReturn}
              onClosed={handleClosed}
              preview
            />
            <BookSpineShelf
              books={SHELF_DEMO}
              onOpen={(book) => {
                triggerRef.current =
                  shelfRef.current?.querySelector<HTMLButtonElement>(
                    `button[title="${book.title}"]`
                  ) ?? null;
                handleOpen(book);
              }}
              hiddenId={hiddenId}
              className="max-w-[440px]"
            />
          </div>
        </LayoutGroup>
        <p className="mt-6 text-caption text-ink-faint">책등을 눌러 책을 펼쳐 보세요.</p>
      </SlideBody>
    </div>
  );
}
