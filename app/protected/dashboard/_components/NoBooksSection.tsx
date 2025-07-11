'use client';

import Link from 'next/link';

export function NoBooksSection() {
  return (
    <section className="mt-8 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
      <p className="text-md text-gray-700 dark:text-gray-300 mb-3">아직 읽고 있는 책이 없어요.</p>
      <Link
        href="/protected/books/new"
        className="inline-block rounded-lg bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700 transition"
      >
        📚 새 책 등록하기
      </Link>
    </section>
  );
}
