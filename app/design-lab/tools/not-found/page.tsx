import type { Metadata } from 'next';
import NotFound from '@/app/not-found';
import { labGuard, LAB_ROBOTS } from '../guard';

export const metadata: Metadata = { title: '없는 주소 견본', robots: LAB_ROBOTS };

export default function NotFoundLabPage() {
  labGuard();
  return <NotFound />;
}
