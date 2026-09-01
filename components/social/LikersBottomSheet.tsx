'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface Liker {
  id: string;
  name: string;
  nickname: string;
  tag: string;
  liked_at: string;
}

interface Props {
  entryId: string;
  bookTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

/** 카드가 늘 갖춰 두는 최소 괘선 수 — 빈 줄이 다음 이름을 기다린다 */
const MIN_ROWS = 5;

/**
 * 좋아요 명단 — 도서관 대출카드.
 * 한 책(기록)을 거쳐간 사람들의 이름과 날짜가 괘선 위에 쌓인다.
 */
export default function LikersBottomSheet({ entryId, bookTitle, isOpen, onClose }: Props) {
  // null = 아직 한 번도 못 불러옴(로딩). 재오픈 시엔 이전 명단을 보여주며 조용히 갱신한다
  const [likers, setLikers] = useState<Liker[] | null>(null);
  const isLoading = likers === null;

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch(`/api/likes?entry_id=${entryId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled) setLikers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLikers((prev) => prev ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [entryId, isOpen]);

  const likerRows = likers ?? [];
  const emptyRowCount = Math.max(MIN_ROWS - likerRows.length, 1);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-card border border-hairline rounded-t-[20px] w-full mx-auto sm:max-w-[480px] sm:bottom-4 sm:rounded-[24px]"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-1">
              <h3 className="text-[16px] font-bold">
                좋아요 {likerRows.length > 0 ? likerRows.length : ''}
              </h3>
              <button
                onClick={onClose}
                className="p-1.5 bg-card-raised rounded-full"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            {/* 대출카드 */}
            <div className="px-5 pb-6 pt-2">
              <div className="rounded-[3px] border border-hairline-strong bg-card-raised/40 px-5 pb-5 pt-4">
                <p className="text-center text-seal text-ink-faint">대출 카드</p>
                <p className="mt-1 truncate text-center font-serif text-body-sm font-bold text-ink">
                  『{bookTitle}』
                </p>

                <table className="mt-3 w-full border-collapse">
                  <thead>
                    <tr className="border-b border-hairline-strong">
                      <th className="w-24 py-1.5 text-left text-caption font-medium text-ink-faint">
                        날짜
                      </th>
                      <th className="py-1.5 text-left text-caption font-medium text-ink-faint">
                        이름
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr className="border-b border-hairline">
                        <td colSpan={2} className="py-2.5 text-center text-caption text-ink-faint">
                          명단을 펼치는 중...
                        </td>
                      </tr>
                    ) : (
                      <>
                        {likerRows.map((liker) => (
                          <tr key={liker.id} className="border-b border-hairline">
                            <td className="py-2.5 font-serif text-caption text-ink-faint">
                              {new Date(liker.liked_at).toLocaleDateString('ko-KR', {
                                month: 'long',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="py-2.5">
                              <Link
                                href={`/protected/social/u/${liker.nickname}-${liker.tag}`}
                                className="font-serif text-body-sm text-ink hover:text-accent transition-colors"
                              >
                                {liker.name}
                              </Link>
                            </td>
                          </tr>
                        ))}
                        {Array.from({ length: emptyRowCount }).map((_, i) => (
                          <tr key={`empty-${i}`} className="border-b border-hairline">
                            <td className="py-2.5">&nbsp;</td>
                            <td />
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              {!isLoading && likerRows.length === 0 && (
                <p className="mt-3 text-center text-caption text-ink-faint">
                  아직 이 기록을 좋아한 사람이 없어요
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
