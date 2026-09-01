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
  /** 본인 또는 수락된 친구만 프로필 열람 가능 — false면 링크를 걸지 않는다 */
  is_accessible: boolean;
}

interface Props {
  entryId: string;
  isOpen: boolean;
  onClose: () => void;
}

/** 좋아요 명단 — 이름을 누르면 프로필로 이동한다 */
export default function LikersBottomSheet({ entryId, isOpen, onClose }: Props) {
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
            className="fixed bottom-0 left-0 right-0 z-[70] bg-card border border-hairline max-h-[90vh] rounded-t-[20px] flex flex-col w-full mx-auto sm:max-w-[480px] sm:bottom-4 sm:rounded-[24px]"
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

            {/* 명단이 길면 시트가 화면을 넘지 않게 이 영역만 스크롤 — 댓글 시트와 같은 문법 */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-1 custom-scrollbar">
              {isLoading ? (
                <p className="py-8 text-center text-caption text-ink-faint">불러오는 중...</p>
              ) : likerRows.length === 0 ? (
                <p className="py-8 text-center text-caption text-ink-faint">
                  아직 이 기록을 좋아한 사람이 없어요
                </p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {likerRows.map((liker) => {
                    const row = (
                      <>
                        <span
                          className={`text-body-sm font-medium text-ink ${
                            liker.is_accessible ? 'group-hover:text-accent transition-colors' : ''
                          }`}
                        >
                          {liker.name}
                        </span>
                        <span className="text-caption text-ink-faint">
                          {new Date(liker.liked_at).toLocaleDateString('ko-KR', {
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </>
                    );
                    return (
                      <li key={liker.id}>
                        {liker.is_accessible ? (
                          <Link
                            href={`/protected/social/u/${liker.nickname}-${liker.tag}`}
                            className="flex items-center justify-between py-3 group"
                          >
                            {row}
                          </Link>
                        ) : (
                          <div className="flex items-center justify-between py-3">{row}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
