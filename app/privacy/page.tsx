import type { Metadata } from 'next';
import LegalDocument from '@/components/legal/LegalDocument';
import { PRIVACY_EFFECTIVE, PRIVACY_POLICY } from '@/lib/legal/texts';

export const metadata: Metadata = {
  title: '개인정보처리방침 | Readiary',
  description:
    'Readiary가 어떤 개인정보를 어떻게 처리하는지, Google 계정 로그인으로 받는 정보를 어디까지 쓰는지 알립니다.',
};

/** 공개 개인정보처리방침 — 로그인 없이 누구나 볼 수 있고, Google OAuth 동의 화면의 개인정보처리방침 링크가 여기를 가리킨다 */
export default function PrivacyPage() {
  return (
    <LegalDocument
      seal="Privacy Policy"
      title="개인정보처리방침"
      effective={`${PRIVACY_EFFECTIVE} 시행`}
      body={PRIVACY_POLICY}
      sibling={{ href: '/terms', label: '서비스 이용 약관' }}
    />
  );
}
