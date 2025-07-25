'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function EntryNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-20">
      <div className="w-full">
        <h1 className="text-2xl font-semibold mb-4">😕 기록을 찾을 수 없습니다.</h1>
        <p className="text-secondary mb-6">요청하신 독서 기록이 존재하지 않거나 삭제되었습니다.</p>
      </div>
      <div className="w-full flex justify-end">
        <Button onClick={() => router.back()}>돌아가기</Button>
      </div>
    </div>
  );
}
