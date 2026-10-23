import type { Metadata } from 'next';
import { labGuard, LAB_ROBOTS } from '../guard';
import SearchLab from './SearchLab';

export const metadata: Metadata = { title: '찾기 견본', robots: LAB_ROBOTS };

export default async function SearchLabPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  labGuard();
  const { state = 'results' } = await searchParams;
  return <SearchLab state={state} />;
}
