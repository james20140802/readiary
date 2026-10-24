import type { Metadata } from 'next';
import InviteView from '@/components/tools/InviteView';
import { labGuard, LAB_ROBOTS } from '../guard';

export const metadata: Metadata = { title: '초대 견본', robots: LAB_ROBOTS };

export default function InviteLabPage() {
  labGuard();
  return <InviteView nickname="jiwoo" tag="2041" invitePath="/invite/jiwoo-2041" />;
}
