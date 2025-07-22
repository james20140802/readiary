'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile } from '@/types/profile';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import FormGroup from '@/components/ui/FormGroup';

export default function FriendRequestForm() {
  const [nicknameAndTag, setNicknameAndTag] = useState('');
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

    const [nickname, tag] = nicknameAndTag.split('#');
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
      <FormGroup>
        <div className="flex items-center gap-3">
          <Input
            placeholder="닉네임#태그"
            value={nicknameAndTag}
            onChange={(e) => setNicknameAndTag(e.target.value)}
            className="w-full"
          />
          <Button onClick={handleSearch} disabled={loading} aria-label="친구 추가">
            ➕
          </Button>
        </div>
      </FormGroup>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)}>
        <div className="space-y-4">
          <h2 className="text-section-title font-semibold text-label dark:text-white">
            친구 요청 보내기
          </h2>
          <p className="text-body-text text-secondary">
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
