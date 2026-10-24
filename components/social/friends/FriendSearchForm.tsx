'use client';

import { useActionLock } from '@/hooks/useActionLock';
import { apiFetch } from '@/lib/api/fetch';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { Profile } from '@/types/profile';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import FriendAvatar from './FriendAvatar';

interface Props {
  /** 초대 링크로 들어오면 그 사람을 바로 찾아 둔다 */
  initialQuery?: string;
}

/**
 * 닉네임#태그로 친구 찾기 — 찾으면 간지 시트에서 신청을 확인하고 보낸다.
 * 요청 순서·잠금은 기존 친구 요청 폼과 같다(찾기와 보내기가 겹치지 않게).
 */
export default function FriendSearchForm({ initialQuery }: Props) {
  const inputId = useId();
  const hintId = useId();
  const [nicknameAndTag, setNicknameAndTag] = useState(initialQuery ?? '');
  const search = useActionLock();
  const sending = useActionLock();
  const loading = search.busy || sending.busy;
  const [foundUser, setFoundUser] = useState<null | { profile: Profile; isFriend: boolean }>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    if (sending.isLocked() || search.isLocked()) return;
    if (!nicknameAndTag.includes('#')) {
      toast.error('닉네임#태그 모양으로 적어 주세요. 예: yunseo#2041');
      return;
    }

    if (!search.acquire()) return;
    try {
      // tag는 항상 '#' 없는 마지막 조각이므로 마지막 '#'에서 나눈다 (닉네임에 '#'이 있을 수 있다)
      const separatorIndex = nicknameAndTag.lastIndexOf('#');
      const nickname = nicknameAndTag.slice(0, separatorIndex);
      const tag = nicknameAndTag.slice(separatorIndex + 1);
      const res = await apiFetch('/api/friends/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, tag }),
      });

      const result = await res.json();

      if (res.ok && result.profile) {
        setFoundUser({ profile: result.profile, isFriend: result.isFriend });
        if (result.isFriend) {
          toast.error('이미 친구예요.');
        } else {
          setShowConfirm(true);
        }
      } else {
        toast.error(result.error ?? '그런 사람을 찾지 못했어요.');
      }
    } catch {
      toast.error('친구를 찾지 못했어요. 다시 시도해 주세요.');
    } finally {
      search.release();
    }
  };

  const autoSearchRan = useRef(false);
  useEffect(() => {
    if (!initialQuery || autoSearchRan.current) return;
    autoSearchRan.current = true;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const confirmSendRequest = async () => {
    if (!foundUser || search.isLocked() || !sending.acquire()) return;
    try {
      const res = await apiFetch('/api/friends/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: foundUser.profile.nickname, tag: foundUser.profile.tag }),
      });

      if (res.ok) {
        toast.success(`${foundUser.profile.name}에게 친구 신청을 보냈어요`);
        setNicknameAndTag('');
        setShowConfirm(false);
        router.refresh();
      } else {
        const { error } = await res.json();
        toast.error(error ?? '친구 신청을 보내지 못했어요.');
      }
    } catch {
      toast.error('친구 신청 결과를 확인하지 못했어요. 다시 확인해 주세요.');
      router.refresh();
    } finally {
      sending.release();
    }
  };

  const found = foundUser?.profile;

  return (
    <>
      <form
        className="flex items-end gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSearch();
        }}
      >
        <div className="flex-1">
          <label htmlFor={inputId} className="block font-sans text-overline text-ink-sub">
            닉네임#태그로 찾기
          </label>
          <input
            id={inputId}
            aria-describedby={hintId}
            disabled={loading}
            placeholder="yunseo#2041"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={nicknameAndTag}
            onChange={(e) => setNicknameAndTag(e.target.value)}
            className="h-12 w-full rounded-none border-0 border-b border-hairline bg-transparent font-sans text-[18px] font-medium text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent disabled:opacity-60"
          />
          <p id={hintId} className="sr-only">
            친구의 닉네임과 태그를 샵(#)으로 이어 적어요
          </p>
        </div>
        <Button
          type="submit"
          size="sm"
          className="mb-1"
          disabled={loading || !nicknameAndTag.trim()}
        >
          찾기
        </Button>
      </form>

      <Sheet
        open={showConfirm}
        onClose={() => {
          if (!sending.isLocked()) setShowConfirm(false);
        }}
        title="친구 신청"
      >
        {found && (
          <div className="flex items-center gap-3.5 py-3">
            <FriendAvatar profile={found} />
            <div className="min-w-0">
              <p className="font-sans text-[17px] font-semibold text-ink">{found.name}</p>
              <p className="font-sans text-[14px] font-medium text-ink-sub">
                {found.nickname}#{found.tag}
              </p>
            </div>
          </div>
        )}
        <p className="mt-2 font-sans text-[15px] font-medium text-ink-sub">
          수락하면 서로의 &lsquo;친구에게 보임&rsquo; 기록과 서가를 볼 수 있어요.
        </p>
        <Button fullWidth className="mt-[18px]" onClick={confirmSendRequest} disabled={loading}>
          {sending.busy ? '보내는 중…' : '신청 보내기'}
        </Button>
      </Sheet>
    </>
  );
}
