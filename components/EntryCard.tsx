'use client';

import Link from 'next/link';
import Card from './ui/Card';

interface EntryCardProps {
  id: string;
  summary: string;
  date: string;
  href?: string;
}

export default function EntryCard({ id, summary, date, href }: EntryCardProps) {
  return (
    <Link href={href ?? `/protected/entry/${id}`} className="block">
      <Card className="space-y-2 transition-colors">
        <p className="text-body-text text-label dark:text-white">{summary}</p>
        <p className="text-sm text-secondary">{new Date(date).toLocaleDateString()}</p>
      </Card>
    </Link>
  );
}
