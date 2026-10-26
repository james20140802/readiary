import type { Metadata } from 'next';
import LegalDocument from '@/components/legal/LegalDocument';
import { TERMS_2026_09_13 } from '@/lib/legal/archive';

export const metadata: Metadata = {
  title: '서비스 이용 약관(2026년 9월 13일 시행) | Readiary',
  robots: { index: false },
};

/** 지난 판 — 개정판 시행 전까지 적용되는 판이자, 그 뒤에도 남겨 두는 기록 */
export default function TermsArchivePage() {
  return (
    <LegalDocument
      seal="Terms of Service"
      title="서비스 이용 약관"
      effective="2026년 9월 13일 시행"
      body={TERMS_2026_09_13}
      sibling={{ href: '/privacy', label: '개인정보처리방침' }}
      archived={{ currentHref: '/terms', currentLabel: '새 판 보기' }}
    />
  );
}
