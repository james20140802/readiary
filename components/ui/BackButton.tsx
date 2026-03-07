'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    // window.history.length가 1보다 크면 뒤로 갈 히스토리가 있다는 뜻입니다.
    // 하지만 단순 접속 시에도 1~2일 수 있으므로,
    // 보통은 서비스의 '메인 경로'를 백업으로 설정합니다.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      // 히스토리가 없다면 무조건 메인 페이지로 보냅니다.
      router.push('/protected/dashboard');
    }
  };

  return (
    <button
      onClick={handleBack}
      className="p-2 -ml-3 hover:bg-surface-raised dark:hover:bg-dark-raised rounded-full transition-colors"
      aria-label="뒤로 가기"
    >
      <ChevronLeft className="w-6 h-6 text-secondary" />
    </button>
  );
}
