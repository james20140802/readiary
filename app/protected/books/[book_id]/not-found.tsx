'use client';

import Button from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-20">
      <div className="w-full">
        <h2 className="text-2xl font-semibold text-label">책을 찾을 수 없어요 📚</h2>
        <p className="mt-4 text-secondary">존재하지 않거나 삭제된 책일 수 있어요.</p>
      </div>
      <div className="w-full flex justify-end">
        <Button onClick={() => router.back()}>돌아가기</Button>
      </div>
    </div>
  );
}
