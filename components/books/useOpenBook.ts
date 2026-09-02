'use client';

import { useCallback, useRef, useState } from 'react';
import type { ShelfBook } from './BookSpineShelf';

/**
 * 책장에서 책을 꺼내고 덮는 상태기계 — 책 목록과 프로필 책장이 공유한다.
 *
 * 열린 채로 다른 책을 누르면 먼저 덮어 꽂고(pending에 담아 두고) 그 다음 책을 꺼낸다.
 * 그동안 책장 위 자리는 열린 채로 둬 책장이 오르내리지 않는다.
 * 진행 중 판단은 ref로 — 갱신 함수에 부작용을 두지 않는다.
 */
export function useOpenBook() {
  const [openBook, setOpenBook] = useState<ShelfBook | null>(null);
  const [slotOpen, setSlotOpen] = useState(false);
  // 책장에서 감출 책등 — 꺼낼 때 같이 감추고, 표지가 돌아가기 시작하는 커밋에서 다시 보인다
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const openRef = useRef<ShelfBook | null>(null);
  const pendingRef = useRef<ShelfBook | null>(null);
  const closingRef = useRef(false);

  const setOpen = useCallback((b: ShelfBook | null) => {
    openRef.current = b;
    setOpenBook(b);
    if (b) setHiddenId(b.id);
  }, []);
  const handleReturn = useCallback(() => setHiddenId(null), []);
  const closeBook = useCallback(() => {
    if (!openRef.current) return;
    closingRef.current = true;
    setOpen(null);
  }, [setOpen]);
  const handleOpen = useCallback(
    (book: ShelfBook) => {
      setSlotOpen(true);
      if (closingRef.current) {
        pendingRef.current = book;
        return;
      }
      const cur = openRef.current;
      if (!cur) {
        setOpen(book);
        return;
      }
      if (cur.id === book.id) return;
      pendingRef.current = book;
      closingRef.current = true;
      setOpen(null);
    },
    [setOpen]
  );
  const handleClosed = useCallback(() => {
    closingRef.current = false;
    const next = pendingRef.current;
    pendingRef.current = null;
    if (next) setOpen(next);
    else setSlotOpen(false);
  }, [setOpen]);
  /** 목록이 통째로 바뀔 때(필터·정렬) — 애니메이션 없이 전부 접는다 */
  const resetOpen = useCallback(() => {
    closingRef.current = false;
    pendingRef.current = null;
    setOpen(null);
    setHiddenId(null);
    setSlotOpen(false);
  }, [setOpen]);

  return {
    openBook,
    slotOpen,
    hiddenId,
    handleOpen,
    closeBook,
    handleReturn,
    handleClosed,
    resetOpen,
  };
}
