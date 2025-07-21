'use client';

import Button from '@/components/ui/Button';
import Link from 'next/link';

export function NoBooksSection() {
  return (
    <section className="rounded-xl border border-gray-200 dark:border-darkbg bg-white dark:bg-darkbg px-6 py-8 text-center space-y-4 shadow-sm">
      <p className="text-body-text text-secondary">아직 읽고 있는 책이 없어요.</p>
      <Button asChild>
        <Link href="/protected/books/new">📚 새 책 등록하기</Link>
      </Button>
    </section>
  );
}
