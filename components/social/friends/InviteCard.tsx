'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import { buildInviteSlug } from '@/lib/social/invite';

interface Props {
  nickname: string;
  tag: string;
  className?: string;
}

/**
 * 함께 읽을 사람 부르기 — 내 닉네임#태그와 초대 링크. 링크를 받은 사람이 로그인하면
 * 친구 찾기에 내 이름이 채워진 채로 열린다(/invite → /social/friends?invite=).
 */
export default function InviteCard({ nickname, tag, className }: Props) {
  const [copied, setCopied] = useState(false);
  const handle = `${nickname}#${tag}`;
  const inviteUrl = () =>
    `${window.location.origin}/invite/${encodeURIComponent(buildInviteSlug(nickname, tag))}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl());
      setCopied(true);
      toast.success('초대 링크를 복사했어요');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('복사하지 못했어요. 닉네임#태그를 직접 알려 주세요.');
    }
  };

  const share = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Readiary에서 친구 맺기', url: inviteUrl() });
      } else {
        await copy();
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        toast.error('초대 링크를 보내지 못했어요.');
      }
    }
  };

  return (
    <aside
      aria-labelledby="invite-title"
      className={clsx('vellum rounded-[3px] px-[22px] py-5', className)}
    >
      <h2 id="invite-title" className="font-serif text-[21px] font-bold leading-[1.3] text-ink">
        함께 읽을 사람 부르기
      </h2>
      <p className="mt-1.5 font-serif text-[16px] leading-[1.65] text-ink-sub">
        링크를 받은 사람이 로그인하면 바로 나에게 친구 신청을 보낼 수 있어요.
      </p>
      <p className="mt-3.5 font-mono text-[15px] font-medium text-ink" data-skeleton>
        {handle}
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={share}>
          초대 링크 보내기
        </Button>
        <Button size="sm" variant="secondary" onClick={copy} aria-live="polite">
          {copied ? '복사했어요' : '복사'}
        </Button>
      </div>
    </aside>
  );
}
