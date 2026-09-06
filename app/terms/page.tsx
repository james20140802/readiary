import type { Metadata } from 'next';
import LegalDocument from '@/components/legal/LegalDocument';
import { TERMS_EFFECTIVE, TERMS_OF_SERVICE } from '@/lib/legal/texts';

export const metadata: Metadata = {
  title: '서비스 이용 약관 | Readiary',
  description: 'Readiary 독서 기록 서비스의 이용 약관입니다.',
};

/** 공개 이용 약관 — 로그인 없이 누구나 볼 수 있고, Google OAuth 동의 화면의 서비스 약관 링크가 여기를 가리킨다 */
export default function TermsPage() {
  return (
    <LegalDocument
      seal="Terms of Service"
      title="서비스 이용 약관"
      effective={`${TERMS_EFFECTIVE} 시행`}
      body={TERMS_OF_SERVICE}
      sibling={{ href: '/privacy', label: '개인정보처리방침' }}
    />
  );
}
