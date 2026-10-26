'use client';
import { useId, useState } from 'react';
import {
  EMAIL_CONSENT_DETAILS,
  EMAIL_CONSENT_LABEL,
  EMAIL_CONSENT_TITLE,
} from '@/lib/email/consent';
export default function EmailConsentField({
  checked,
  onChange,
  email,
  disabled = false,
  compact = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  email: string | null;
  disabled?: boolean;
  /**
   * 온보딩용 한 줄 — 체크박스와 "보기"만 두고, 동의 받을 때 알려야 할 목적·항목·보유 기간·거부할
   * 권리(개인정보 보호법 제15조 제2항)는 "보기"로 펼친다. 처리방침 링크는 버튼 아래 고지가 준다.
   */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <CompactEmailConsent
        checked={checked}
        onChange={onChange}
        email={email}
        disabled={disabled}
      />
    );
  }

  return (
    <fieldset disabled={disabled} className="space-y-2 border-t border-hairline pt-4">
      <label className="flex min-h-11 items-center gap-3 text-body-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby="email-consent-description"
          className="h-5 w-5 accent-accent"
        />
        <span>{EMAIL_CONSENT_LABEL}</span>
      </label>
      <p id="email-consent-description" className="text-caption text-ink-sub break-keep">
        {EMAIL_CONSENT_DETAILS}
      </p>
      {email && <p className="text-caption text-ink-sub break-all">받는 주소: {email}</p>}
      <a
        href="/privacy"
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 items-center text-caption underline underline-offset-4"
      >
        개인정보 처리방침 (새 창)
      </a>
    </fieldset>
  );
}

function CompactEmailConsent({
  checked,
  onChange,
  email,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  email: string | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const detailsId = `${id}-details`;

  return (
    // 만 14세 확인(AgeConfirmField)과 같은 헤어라인 줄 — 묶음의 윗선은 감싸는 쪽이 긋는다
    <div className="border-b border-hairline">
      <div className="flex min-h-12 items-center gap-3">
        <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 font-sans text-caption text-ink">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            // 접혀 있어도 화면 읽기 프로그램에는 안내가 함께 읽힌다
            aria-describedby={detailsId}
            className="h-5 w-5 shrink-0 accent-ink"
          />
          <span>
            {EMAIL_CONSENT_TITLE} <span className="text-ink-faint">(선택)</span>
          </span>
        </label>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={open ? '이메일 소식 안내 접기' : '이메일 소식 안내 보기'}
          className="min-h-11 shrink-0 rounded-sm px-1 font-sans text-overline font-medium text-ink-sub underline underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {open ? '접기' : '보기'}
        </button>
      </div>
      <div
        id={detailsId}
        hidden={!open}
        className="space-y-1 pb-3 pl-8 font-sans text-fine text-ink-sub"
      >
        <p className="break-keep">{EMAIL_CONSENT_DETAILS}</p>
        {email && <p className="break-all">받는 주소: {email}</p>}
      </div>
    </div>
  );
}
