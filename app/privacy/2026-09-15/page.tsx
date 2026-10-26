import type { Metadata } from 'next';
import LegalDocument from '@/components/legal/LegalDocument';
import { PRIVACY_2026_09_15 } from '@/lib/legal/archive';

export const metadata: Metadata = {
  title: '개인정보처리방침(2026년 9월 15일 시행) | Readiary',
  robots: { index: false },
};

/** 지난 판 — 개정판 시행 전까지 적용되는 판이자, 그 뒤에도 남겨 두는 기록 */
export default function PrivacyArchivePage() {
  return (
    <LegalDocument
      seal="Privacy Policy"
      title="개인정보처리방침"
      effective="2026년 9월 15일 시행"
      body={PRIVACY_2026_09_15}
      sibling={{ href: '/terms', label: '서비스 이용 약관' }}
      archived={{ currentHref: '/privacy', currentLabel: '새 판 보기' }}
    />
  );
}
