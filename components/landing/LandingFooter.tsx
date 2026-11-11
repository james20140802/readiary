import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/legal/contact';
import s from './landing.module.css';

/**
 * 랜딩 맨 아래 — 약관·개인정보처리방침·문의 링크와 저작권 표시.
 * Google OAuth 브랜딩은 홈페이지에서 개인정보처리방침으로 가는 링크를 요구한다.
 */
export default function LandingFooter() {
  return (
    <footer className={s.foot}>
      <nav aria-label="서비스 안내">
        <Link href="/terms">이용 약관</Link>
        <Link href="/privacy">개인정보처리방침</Link>
        {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`}>문의</a>}
      </nav>
      <p>© 2026 Readiary</p>
    </footer>
  );
}
