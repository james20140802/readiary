'use client';

import { apiFetch } from '@/lib/api/fetch';
import { likersUrl, type CommentTarget } from '@/lib/comments/target';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';

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
  target: CommentTarget;
  isOpen: boolean;
  onClose: () => void;
}

/** 좋아한 사람 — 간지 시트. 이름을 누르면 그 사람의 서재로 간다 */
export default function LikersBottomSheet({ target, isOpen, onClose }: Props) {
  // null = 아직 한 번도 못 불러옴(로딩). 다시 열면 이전 명단을 보여주며 조용히 갱신한다
  const [likers, setLikers] = useState<Liker[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const isLoading = likers === null && !failed;
  const url = likersUrl(target);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    apiFetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('likers unavailable');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLikers(Array.isArray(data) ? data : []);
        setFailed(false);
      })
      .catch(() => {
        // 실패를 '아무도 좋아하지 않았다'로 보이지 않는다. 전에 받은 명단이 있으면 그대로 둔다.
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url, isOpen, attempt]);

  const likerRows = likers ?? [];

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      title={likerRows.length > 0 ? `좋아한 사람 ${likerRows.length}` : '좋아한 사람'}
    >
      {failed && (
        <div role="alert" className="py-6 text-center">
          <p className="font-sans text-caption text-ink-sub">좋아한 사람을 불러오지 못했어요.</p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            다시 시도
          </Button>
        </div>
      )}
      {failed && likers === null ? null : isLoading ? (
        <p role="status" className="py-8 text-center font-sans text-caption text-ink-sub">
          불러오는 중…
        </p>
      ) : likerRows.length === 0 ? (
        <p className="py-8 text-center font-sans text-caption text-ink-sub">
          {target.kind === 'entry'
            ? '아직 이 기록을 좋아한 사람이 없어요'
            : '아직 이 발췌집을 좋아한 사람이 없어요'}
        </p>
      ) : (
        <ul>
          {likerRows.map((liker) => {
            const row = (
              <>
                <span className="font-sans text-[17px] font-medium text-ink">{liker.name}</span>
                <span className="ml-auto font-sans text-[15px] text-ink-sub">
                  {new Date(liker.liked_at).toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </>
            );
            return (
              <li key={liker.id} className="border-t border-hairline last:border-b">
                {liker.is_accessible ? (
                  <Link
                    href={`/social/u/${liker.nickname}-${liker.tag}`}
                    className="flex min-h-[54px] items-center gap-3 hover:text-accent"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex min-h-[54px] items-center gap-3">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
