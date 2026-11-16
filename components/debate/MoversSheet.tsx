'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sheet from '@/components/ui/Sheet';
import { fetchMovers } from '@/lib/debate/client';
import type { DebateMover } from '@/lib/debate/types';

/** 내 답에 생각이 바뀌었다고 누른 사람들 — 답 쓴 사람만 본다. 친구는 서재로 이어진다 */
export default function MoversSheet({
  open,
  onClose,
  answerId,
}: {
  open: boolean;
  onClose(): void;
  answerId: string;
}) {
  const [list, setList] = useState<DebateMover[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchMovers(answerId)
      .then((m) => {
        if (!alive) return;
        setFailed(false);
        setList(m);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [open, answerId]);

  return (
    <Sheet open={open} onClose={onClose} title="생각이 바뀐 사람">
      {failed && <p className="py-4 font-sans text-caption text-ink-sub">불러오지 못했어요.</p>}
      {!failed && list === null && (
        <p className="py-4 font-sans text-caption text-ink-faint">불러오는 중…</p>
      )}
      <ul>
        {list?.map((m) => (
          <li
            key={`${m.nickname}-${m.tag}`}
            className="flex min-h-12 items-center border-b border-hairline font-sans text-body"
          >
            {m.isFriend ? (
              <Link href={`/social/u/${m.nickname}-${m.tag}`} className="text-ink hover:underline">
                {m.nickname}
              </Link>
            ) : (
              <span className="text-ink">{m.nickname}</span>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
