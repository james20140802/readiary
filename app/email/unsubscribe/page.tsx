import type { Metadata } from 'next';
import PublicHeader from '@/components/tools/PublicHeader';
import UnsubscribeForm from './UnsubscribeForm';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '이메일 수신거부 | Readiary',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
/** 메일의 수신거부 링크 착지 — 메뉴 없는 괘선 위 도구 화면. 계정과 무관하게 열리므로 로그인 버튼은 두지 않는다 */
export default function Page() {
  return (
    <div className="mx-auto max-w-[1000px]">
      <PublicHeader auth={false} />
      <section className="mx-auto mt-[6vh] max-w-[480px]">
        <h1 className="font-sans text-page-title text-ink">이메일 수신거부</h1>
        <UnsubscribeForm />
      </section>
    </div>
  );
}
