'use client';

import Link from 'next/link';

interface EntryCardProps {
  id: string;
  summary: string;
  date: string;
  href?: string;
}

export default function EntryCard({ id, summary, date, href }: EntryCardProps) {
  return (
    <Link
      href={href ?? `/protected/entry/${id}`}
      className="block bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-md transition cursor-pointer px-4 py-3 space-y-2"
    >
      <p className="text-base text-gray-800 dark:text-gray-100">{summary}</p>
      <p className="text-sm text-gray-500">{new Date(date).toLocaleDateString()}</p>
    </Link>
  );
}
