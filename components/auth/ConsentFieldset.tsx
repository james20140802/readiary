'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { PRIVACY_CONSENT, TERMS_OF_SERVICE } from '@/lib/legal/texts';

export interface Consent {
  privacy: boolean;
  terms: boolean;
}

export const NO_CONSENT: Consent = { privacy: false, terms: false };

export function isConsentComplete(consent: Consent): boolean {
  return consent.privacy && consent.terms;
}

interface ConsentFieldsetProps {
  value: Consent;
  onChange: (next: Consent) => void;
  /** 한 화면에 두 번 놓일 일은 없지만 id 충돌을 피하려고 접두어를 받는다 */
  idPrefix?: string;
}

/**
 * 개인정보 수집·이용과 서비스 이용 약관 동의 체크박스 두 개 + 본문 모달.
 * 이메일 가입 화면과, 소셜 로그인으로 처음 온 사람의 온보딩 화면이 같은 것을 쓴다.
 */
export default function ConsentFieldset({
  value,
  onChange,
  idPrefix = 'consent',
}: ConsentFieldsetProps) {
  const [openDoc, setOpenDoc] = useState<'terms' | 'privacy' | null>(null);
  const privacyId = `${idPrefix}-privacy`;
  const termsId = `${idPrefix}-terms`;

  return (
    <>
      <fieldset className="space-y-2 pt-1">
        <legend className="sr-only">동의</legend>
        <label htmlFor={privacyId} className="flex items-center gap-2 text-body-sm text-ink-sub">
          <input
            type="checkbox"
            id={privacyId}
            checked={value.privacy}
            onChange={(e) => onChange({ ...value, privacy: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          <span>
            <button
              type="button"
              onClick={() => setOpenDoc('privacy')}
              className="underline underline-offset-4 hover:text-ink"
            >
              개인정보 수집 및 이용
            </button>
            에 동의합니다
          </span>
        </label>
        <label htmlFor={termsId} className="flex items-center gap-2 text-body-sm text-ink-sub">
          <input
            type="checkbox"
            id={termsId}
            checked={value.terms}
            onChange={(e) => onChange({ ...value, terms: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          <span>
            <button
              type="button"
              onClick={() => setOpenDoc('terms')}
              className="underline underline-offset-4 hover:text-ink"
            >
              서비스 이용 약관
            </button>
            에 동의합니다
          </span>
        </label>
      </fieldset>

      <Modal isOpen={openDoc === 'terms'} onClose={() => setOpenDoc(null)}>
        <LegalDocument
          title="서비스 이용 약관"
          body={TERMS_OF_SERVICE}
          onClose={() => setOpenDoc(null)}
        />
      </Modal>
      <Modal isOpen={openDoc === 'privacy'} onClose={() => setOpenDoc(null)}>
        <LegalDocument
          title="개인정보 수집 및 이용 동의서"
          body={PRIVACY_CONSENT}
          onClose={() => setOpenDoc(null)}
        />
      </Modal>
    </>
  );
}

function LegalDocument({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto px-2 py-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-ink-sub leading-relaxed whitespace-pre-wrap">{body}</p>
      <div className="pt-4 flex justify-end">
        <Button onClick={onClose}>닫기</Button>
      </div>
    </div>
  );
}
