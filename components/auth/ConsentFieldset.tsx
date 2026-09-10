'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { splitLegalBlocks } from '@/lib/legal/blocks';
import { PRIVACY_CONSENT, TERMS_OF_SERVICE } from '@/lib/legal/texts';

export interface Consent {
  /** 만 14세 이상 확인 — 약관 제4조 2항 */
  age: boolean;
  privacy: boolean;
  terms: boolean;
}

export const NO_CONSENT: Consent = { age: false, privacy: false, terms: false };

export function isConsentComplete(consent: Consent): boolean {
  return consent.age && consent.privacy && consent.terms;
}

interface ConsentFieldsetProps {
  value: Consent;
  onChange: (next: Consent) => void;
  /** 한 화면에 두 번 놓일 일은 없지만 id 충돌을 피하려고 접두어를 받는다 */
  idPrefix?: string;
}

/**
 * 만 14세 이상 확인, 개인정보 수집·이용과 서비스 이용 약관 동의 체크박스 세 개 + 본문 모달.
 * 이메일 가입 화면과, 소셜 로그인으로 처음 온 사람의 온보딩 화면이 같은 것을 쓴다.
 */
export default function ConsentFieldset({
  value,
  onChange,
  idPrefix = 'consent',
}: ConsentFieldsetProps) {
  const [openDoc, setOpenDoc] = useState<'terms' | 'privacy' | null>(null);
  const ageId = `${idPrefix}-age`;
  const privacyId = `${idPrefix}-privacy`;
  const termsId = `${idPrefix}-terms`;

  return (
    <>
      <fieldset className="space-y-2 pt-1">
        <legend className="sr-only">가입을 위한 필수 확인</legend>
        <label htmlFor={ageId} className="flex items-center gap-2 text-body-sm text-ink-sub">
          <input
            type="checkbox"
            id={ageId}
            checked={value.age}
            onChange={(e) => onChange({ ...value, age: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          <span>만 14세 이상입니다 (필수)</span>
        </label>
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
            에 동의합니다 (필수)
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
            에 동의합니다 (필수)
          </span>
        </label>
      </fieldset>

      <Modal isOpen={openDoc === 'terms'} onClose={() => setOpenDoc(null)}>
        <ConsentDocument
          title="서비스 이용 약관"
          body={TERMS_OF_SERVICE}
          fullHref="/terms"
          onClose={() => setOpenDoc(null)}
        />
      </Modal>
      <Modal isOpen={openDoc === 'privacy'} onClose={() => setOpenDoc(null)}>
        <ConsentDocument
          title="개인정보 수집 및 이용 동의서"
          body={PRIVACY_CONSENT}
          fullHref="/privacy"
          fullLabel="개인정보처리방침 전체 보기"
          onClose={() => setOpenDoc(null)}
        />
      </Modal>
    </>
  );
}

/**
 * 동의 모달 안의 문서 한 장. 공개 페이지(/terms, /privacy)와 같은 본문을 같은 파서로 나눠 그리고,
 * 가입 흐름을 끊지 않도록 전체 문서는 새 탭으로 연다.
 */
function ConsentDocument({
  title,
  body,
  fullHref,
  fullLabel = '새 탭에서 보기',
  onClose,
}: {
  title: string;
  body: string;
  fullHref: string;
  fullLabel?: string;
  onClose: () => void;
}) {
  const blocks = splitLegalBlocks(body);
  return (
    <div className="max-h-[60vh] space-y-4 overflow-y-auto px-2 py-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-4">
        {blocks.map((block, i) => (
          <section key={i}>
            {block.heading && (
              <h3 className="mb-1 text-body-sm font-bold text-ink">{block.heading}</h3>
            )}
            {block.body && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-sub">
                {block.body}
              </p>
            )}
          </section>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 pt-4">
        <Link
          href={fullHref}
          target="_blank"
          rel="noopener"
          className="text-body-sm text-ink-sub underline underline-offset-4 hover:text-ink"
        >
          {fullLabel}
        </Link>
        <Button onClick={onClose}>닫기</Button>
      </div>
    </div>
  );
}
