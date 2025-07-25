'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function DashboardNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-20">
      <div className="w-full">
        <h1 className="text-2xl font-semibold mb-4">😕 페이지를 찾을 수 없습니다</h1>
        <p className="text-secondary">
          요청하신 대시보드 페이지가 존재하지 않거나 접근할 수 없습니다.
        </p>
      </div>
      <div className="w-full flex justify-end">
        <Button onClick={() => router.back()}>돌아가기</Button>
      </div>
    </div>
  );
}
