'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-20">
      <div className="w-full">
        <h1 className="text-page-title font-semibold">프로필을 찾을 수 없어요</h1>
        <p className="text-body-text text-label">
          존재하지 않는 사용자이거나, 친구가 아닌 사용자의 프로필이에요.
        </p>
      </div>
      <div className="w-full flex justify-end">
        <Button onClick={() => router.back()}>돌아가기</Button>
      </div>
    </div>
  );
}
