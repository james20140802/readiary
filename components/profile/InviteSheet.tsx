'use client';

import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 닉네임#태그 */
  handle: string;
  /** /invite/ 뒤에 붙는 조각 — buildInviteSlug */
  inviteSlug: string;
}

const inviteUrl = (slug: string) => `${window.location.origin}/invite/${encodeURIComponent(slug)}`;

/** 함께 읽을 사람 부르기 — 닉네임#태그 복사, 초대 링크 복사·보내기(시안 me.html의 invite 시트) */
export default function InviteSheet({ open, onClose, handle, inviteSlug }: Props) {
  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
    } catch {
      toast.error('복사하지 못했어요. 길게 눌러 직접 복사해 주세요.');
    }
  };

  const share = async () => {
    const url = inviteUrl(inviteSlug);
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Readiary에서 친구 맺기', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('초대 링크를 복사했어요.');
      }
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        toast.error('초대 링크를 보내지 못했어요. 링크 복사로 전해 주세요.');
      }
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="함께 읽을 사람 부르기">
      <p className="font-serif text-[17px] leading-[1.65] text-ink">
        링크를 받은 사람이 로그인하면 바로 나에게 친구 신청을 보낼 수 있어요.
      </p>
      <button
        type="button"
        onClick={() => void copy(handle, '닉네임#태그를 복사했어요.')}
        className="mt-3.5 flex min-h-[54px] w-full items-center gap-3 border-y border-hairline text-left font-sans text-[17px] font-medium text-ink"
      >
        내 닉네임#태그
        <span className="ml-auto truncate font-mono text-[16px] text-ink-sub">{handle}</span>
        <Copy size={18} strokeWidth={1.75} className="shrink-0 text-ink-faint" aria-hidden />
        <span className="sr-only">복사하기</span>
      </button>
      <div className="mt-[18px] flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => void copy(inviteUrl(inviteSlug), '링크를 복사했어요.')}
        >
          링크 복사
        </Button>
        <Button className="flex-1" onClick={() => void share()}>
          초대 링크 보내기
        </Button>
      </div>
    </Sheet>
  );
}
