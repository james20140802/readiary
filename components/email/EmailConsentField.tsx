'use client';
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
   * 온보딩용 한 줄 — 설명·받는 주소·처리방침 링크 없이 체크박스만. 처리 내용은 개인정보처리방침
   * 제1·2·3·5조에 있고, 그 링크는 버튼 아래 고지(LegalNotice)가 이미 준다.
   */
  compact?: boolean;
}) {
  if (compact) {
    return (
      // 만 14세 확인(AgeConfirmField)과 같은 헤어라인 줄 — 묶음의 윗선은 감싸는 쪽이 긋는다
      <div className="flex min-h-12 items-center border-b border-hairline">
        <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 font-sans text-caption text-ink">
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-ink"
          />
          <span>
            {EMAIL_CONSENT_TITLE} <span className="text-ink-faint">(선택)</span>
          </span>
        </label>
      </div>
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
