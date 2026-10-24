'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { useRemoveFriend } from './useRemoveFriend';

interface Props {
  friendId: string;
  /** 확인 문구에 쓰는 이름 */
  name?: string;
}

/** "친구 끊기" 글자 버튼 + 확인 시트 */
export default function RemoveFriendButton({ friendId, name }: Props) {
  const [confirming, setConfirming] = useState(false);
  const { remove, busy, isLocked } = useRemoveFriend();

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-11 font-sans text-button-sm text-ink-sub transition-colors hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        친구 끊기
      </button>
      <RemoveFriendConfirm
        open={confirming}
        name={name}
        busy={busy}
        onCancel={() => {
          if (!isLocked()) setConfirming(false);
        }}
        onConfirm={async () => {
          await remove(friendId);
          setConfirming(false);
        }}
      />
    </>
  );
}

/** 친구 끊기 확인 — 친구 목록 메뉴와 서재에서 함께 쓴다 */
export function RemoveFriendConfirm({
  open,
  name,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  name?: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title = name ? `${name}님과 친구를 끊을까요?` : '친구를 끊을까요?';
  return (
    <Sheet open={open} onClose={onCancel} ariaLabel={title}>
      <h2 className="font-sans text-[18px] font-bold text-ink">{title}</h2>
      <p className="mt-2 font-sans text-body-sm text-ink-sub">
        서로의 &lsquo;친구에게 보임&rsquo; 기록과 서가를 더는 볼 수 없어요. 다시 친구가 되려면
        신청부터 해야 해요.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={busy}>
          그대로 두기
        </Button>
        <Button size="sm" variant="danger" onClick={onConfirm} disabled={busy}>
          {busy ? '끊는 중…' : '친구 끊기'}
        </Button>
      </div>
    </Sheet>
  );
}
