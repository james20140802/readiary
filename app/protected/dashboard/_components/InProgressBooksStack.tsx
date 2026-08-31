'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import Seal from '@/components/ui/Seal';
import { MyBook } from '@/types/book';

interface Props {
  myBooks: MyBook[];
  /** 처음에 펼쳐둘 user_book id — 가장 최근 기록을 남긴 책 */
  initialTopId: string | null;
  /** user_book id → 그 책에 마지막으로 남긴 문장 한 줄 */
  latestTexts: Record<string, string>;
}

function progressLabel(b: MyBook): string | null {
  if (b.progress != null) return `${b.progress}%`;
  if (b.last_read_page != null) return `${b.last_read_page}쪽`;
  return null;
}

/**
 * 진행 중인 책 — 책상 위 책 더미.
 * 순서는 그대로 두고, 고른 책만 제자리에서 펼쳐진다.
 * 옆면의 폭은 펼쳐진 책과 가까울수록 넓게 — 손 가까이 쌓인 책일수록 잘 보인다.
 */
export function InProgressBooksStack({ myBooks, initialTopId, latestTexts }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(initialTopId);

  if (myBooks.length === 0) return null;

  const foundIdx = myBooks.findIndex((b) => b.id === selectedId);
  const selIdx = foundIdx === -1 ? 0 : foundIdx;

  return (
    <section>
      <h2 className="text-section-title text-ink mb-3">진행 중인 책</h2>

      <div className="space-y-1.5">
        {myBooks.map((b, idx) => {
          const isSelected = idx === selIdx;
          const dist = Math.abs(idx - selIdx);
          const title = b.books.title ?? '(제목 없음)';
          const latestText = latestTexts[b.id] ?? null;

          return (
            <motion.div
              key={b.id}
              layout
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mx-auto"
              style={{ width: isSelected ? '100%' : `${Math.max(70, 96 - dist * 7)}%` }}
            >
              {isSelected ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: 0.08 }}
                >
                  <Link href={`/protected/books/${b.book_id}`} className="block">
                    <Card hoverable className="flex gap-5 px-6 py-5">
                      <div className="relative h-[100px] w-[70px] shrink-0 overflow-hidden rounded-sm border border-hairline">
                        <Image
                          src={b.books.cover_url ?? '/images/default-book-cover.png'}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="70px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Seal className="mb-1 block">읽던 책</Seal>
                        <p className="truncate font-serif text-[17px] font-bold text-ink">
                          {title}
                        </p>
                        <p className="truncate text-caption text-ink-faint">
                          {[b.books.author, progressLabel(b)].filter(Boolean).join(' · ')}
                        </p>
                        {latestText && (
                          <p className="mt-2 line-clamp-2 font-serif text-[13px] leading-relaxed text-ink-sub">
                            “{latestText}”
                          </p>
                        )}
                        <span className="mt-2 inline-block text-[13px] text-accent">
                          이어서 읽기 →
                        </span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  aria-label={`${title} 펼치기`}
                  className="flex h-8 w-full items-center justify-between gap-3 rounded-[3px] border border-hairline bg-card-raised px-4 transition-colors hover:border-hairline-strong"
                >
                  <span className="truncate font-serif text-[12.5px] text-ink">{title}</span>
                  <span className="shrink-0 font-serif text-[11px] text-ink-faint">
                    {progressLabel(b) ?? ''}
                  </span>
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
