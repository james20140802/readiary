'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types/profile';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface Props {
  initialQuery?: string;
}

export default function FriendRequestForm({ initialQuery }: Props) {
  const [nicknameAndTag, setNicknameAndTag] = useState(initialQuery ?? '');
  const [loading, setLoading] = useState(false);
  const [foundUser, setFoundUser] = useState<null | {
    profile: Profile;
    isFriend: boolean;
  }>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const router = useRouter();

  const handleSearch = async () => {
    if (!nicknameAndTag.includes('#')) {
      toast.error('닉네임과 태그 형식이 올바르지 않아요.');
      return;
    }

    setLoading(true);

    // tag는 항상 '#' 없는 트레일링 세그먼트이므로 마지막 '#'에서 분할 (닉네임에 '#' 포함 가능)
    const separatorIndex = nicknameAndTag.lastIndexOf('#');
    const nickname = nicknameAndTag.slice(0, separatorIndex);
    const tag = nicknameAndTag.slice(separatorIndex + 1);
    const res = await fetch('/api/friends/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, tag }),
    });

    const result = await res.json();

    if (res.ok && result.profile) {
      setFoundUser({ profile: result.profile, isFriend: result.isFriend });
      if (result.isFriend) {
        toast.error('이미 친구입니다.');
      } else {
        setShowConfirmModal(true);
      }
    } else {
      toast.error(result.error ?? '사용자를 찾을 수 없어요.');
    }

    setLoading(false);
  };

  const autoSearchRan = useRef(false);
  useEffect(() => {
    if (!initialQuery || autoSearchRan.current) return;
    autoSearchRan.current = true;
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const confirmSendRequest = async () => {
    if (!foundUser) return;
    setLoading(true);
    const res = await fetch('/api/friends/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: foundUser.profile.nickname, tag: foundUser.profile.tag }),
    });

    if (res.ok) {
      toast.success('친구 요청을 보냈습니다!');
      setNicknameAndTag('');
      setShowConfirmModal(false);
      router.refresh();
    } else {
      const { error } = await res.json();
      toast.error(error ?? '친구 요청 실패');
    }

    setLoading(false);
  };

  return (
    <>
      {/* 종이 위 한 줄 — 박스 대신 hairline 밑줄로 (컴포저 입력줄과 같은 문법) */}
      <div className="flex items-center gap-3 border-b border-hairline pb-2 transition-colors focus-within:border-hairline-strong">
        <UserPlus size={15} className="shrink-0 text-ink-faint" />
        <input
          placeholder="닉네임#태그로 친구 찾기"
          value={nicknameAndTag}
          onChange={(e) => setNicknameAndTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSearch();
          }}
          className="w-full bg-transparent text-body-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !nicknameAndTag.trim()}
          className="shrink-0 px-2 py-1.5 text-body-sm font-semibold text-accent hover:text-accent-hover disabled:opacity-40 transition-colors"
        >
          요청
        </button>
      </div>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <div className="space-y-4">
          <h2 className="text-section-title font-semibold text-ink">친구 요청 보내기</h2>
          <p className="text-body text-ink-sub">
            {foundUser?.profile.name ?? ''} ({foundUser?.profile.nickname}#{foundUser?.profile.tag})
            님에게 친구 요청을 보낼까요?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
              취소
            </Button>
            <Button onClick={confirmSendRequest} disabled={loading}>
              요청 보내기
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
