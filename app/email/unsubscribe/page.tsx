import type { Metadata } from 'next';
import UnsubscribeForm from './UnsubscribeForm';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '이메일 수신거부 | Readiary',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default function Page() {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 space-y-6">
      <h1 className="text-page-title">이메일 수신거부</h1>
      <UnsubscribeForm />
    </div>
  );
}
