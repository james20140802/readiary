'use client';

import { apiFetch } from '@/lib/api/fetch';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useActionLock } from '@/hooks/useActionLock';

/**
 * 친구 끊기 — 친구 목록 메뉴·친구의 서재·(옛) 프로필 버튼이 같은 요청과 안내를 쓴다.
 * 성공하면 true. 이미 진행 중이면 아무것도 하지 않는다.
 */
export function useRemoveFriend() {
  const action = useActionLock();
  const router = useRouter();

  const remove = async (friendId: string): Promise<boolean> => {
    if (!action.acquire()) return false;
    try {
      const res = await apiFetch('/api/friends/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendId }),
      });
      if (res.ok) {
        toast.success('친구를 끊었어요.');
        router.refresh();
        return true;
      }
      toast.error('친구를 끊지 못했어요.');
      return false;
    } catch {
      toast.error('친구 끊기 결과를 확인하지 못했어요. 목록을 새로고침해 주세요.');
      router.refresh();
      return false;
    } finally {
      action.release();
    }
  };

  return { remove, busy: action.busy, isLocked: action.isLocked };
}
