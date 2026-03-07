'use client';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Link from 'next/link';

export function NoBooksSection() {
  return (
    <Card hoverable={false} className="py-12 text-center flex flex-col items-center gap-4">
      <p className="text-body text-label-sub dark:text-label-muted">아직 읽고 있는 책이 없어요.</p>
      <Button asChild>
        <Link href="/protected/books/new" className="text-button">
          📚 새 책 등록하기
        </Link>
      </Button>
    </Card>
  );
}
