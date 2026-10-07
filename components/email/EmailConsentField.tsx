'use client';
import { EMAIL_CONSENT_LABEL, EMAIL_CONSENT_DETAILS } from '@/lib/email/consent';
export default function EmailConsentField({
  checked,
  onChange,
  email,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  email: string | null;
  disabled?: boolean;
}) {
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
