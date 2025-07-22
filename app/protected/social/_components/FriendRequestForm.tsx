'use client';

import { Fragment, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Profile } from '@/types/profile';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
      <div className="flex items-center gap-3 space-y-4">
        <input
          placeholder="닉네임#태그"
          value={nicknameAndTag}
          onChange={(e) => setNicknameAndTag(e.target.value)}
          className="border px-4 py-2 rounded-lg w-full text-sm dark:bg-gray-900 dark:text-white"
        />
        <div>
          <button
            title="친구 추가"
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-600"
          >
            ➕
          </button>
        </div>
      </div>

      <Dialog open={showConfirmModal} onClose={() => setShowConfirmModal(false)} as={Fragment}>
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-center items-start pt-16">
          <Dialog.Panel className="bg-white dark:bg-gray-800 p-6 rounded-lg space-y-4 w-full max-w-sm mx-auto">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              친구 요청 보내기
            </Dialog.Title>
            <Dialog.Description className="text-sm text-gray-700 dark:text-gray-300">
              {foundUser?.profile.name ?? ''} ({foundUser?.profile.nickname}#
              {foundUser?.profile.tag}) 님에게 친구 요청을 보낼까요?
            </Dialog.Description>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-sm px-3 py-1 border rounded text-gray-700 dark:text-gray-200"
              >
                취소
              </button>
              <button
                onClick={confirmSendRequest}
                className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={loading}
              >
                요청 보내기
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
}
