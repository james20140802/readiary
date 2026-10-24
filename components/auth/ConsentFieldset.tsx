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
      {/* 시안 auth.html `.cons`: 헤어라인 사이 48px 줄, 먹색 체크, 오른쪽 "보기" */}
      <fieldset className="!mt-5">
        <legend className="sr-only">가입을 위한 필수 확인</legend>
        <ConsentRow
          id={ageId}
          checked={value.age}
          onChange={(checked) => onChange({ ...value, age: checked })}
        >
          만 14세 이상이에요
        </ConsentRow>
        <ConsentRow
          id={termsId}
          checked={value.terms}
          onChange={(checked) => onChange({ ...value, terms: checked })}
          onView={() => setOpenDoc('terms')}
          viewLabel="서비스 이용 약관 보기"
        >
          서비스 이용 약관에 동의해요
        </ConsentRow>
        <ConsentRow
          id={privacyId}
          checked={value.privacy}
          onChange={(checked) => onChange({ ...value, privacy: checked })}
          onView={() => setOpenDoc('privacy')}
          viewLabel="개인정보 수집 및 이용 동의서 보기"
        >
          개인정보 수집·이용에 동의해요
        </ConsentRow>
      </fieldset>

      <Modal
        ariaLabel="서비스 이용 약관"
        isOpen={openDoc === 'terms'}
        onClose={() => setOpenDoc(null)}
      >
        <ConsentDocument
          title="서비스 이용 약관"
          body={TERMS_OF_SERVICE}
          fullHref="/terms"
          onClose={() => setOpenDoc(null)}
        />
      </Modal>
      <Modal
        ariaLabel="개인정보 수집 및 이용 동의서"
        isOpen={openDoc === 'privacy'}
        onClose={() => setOpenDoc(null)}
      >
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

/** 동의 한 줄 — 체크박스와 문구가 한 label, 본문 보기는 label 밖의 따로 누르는 버튼 */
function ConsentRow({
  id,
  checked,
  onChange,
  onView,
  viewLabel,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onView?: () => void;
  viewLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 border-t border-hairline last:border-b">
      <label
        htmlFor={id}
        className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 font-sans text-caption text-ink"
      >
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-ink"
        />
        <span>
          {children} <span className="text-ink-faint">(필수)</span>
        </span>
      </label>
      {onView && (
        <button
          type="button"
          onClick={onView}
          aria-label={viewLabel}
          className="min-h-11 shrink-0 rounded-sm px-1 font-sans text-overline font-medium text-ink-sub underline underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          보기
        </button>
      )}
    </div>
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
    <div className="space-y-4 px-2 py-4">
      <h2 className="text-section-title font-semibold">{title}</h2>
      <div className="space-y-4">
        {blocks.map((block, i) => (
          <section key={i}>
            {block.heading && (
              <h3 className="mb-1 text-body font-bold text-ink">{block.heading}</h3>
            )}
            {block.body && (
              <p className="whitespace-pre-wrap text-body leading-relaxed text-ink-sub">
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
          className="text-button-sm text-ink-sub underline underline-offset-4 hover:text-ink"
        >
          {fullLabel}
        </Link>
        <Button onClick={onClose}>닫기</Button>
      </div>
    </div>
  );
}
