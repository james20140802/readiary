'use client';

/**
 * 만 14세 이상 확인 한 줄 — 약관 제4조 2항. 만 14세 미만은 법정대리인 동의가 필요해 받지 않으므로,
 * 이메일 가입과 Google 가입이 모두 지나가는 온보딩에서 프로필을 만들기 전에 한 번 확인한다.
 * 이용 약관·개인정보처리방침은 체크로 받지 않고 LegalNotice로 알린다.
 */
export default function AgeConfirmField({
  checked,
  onChange,
  id = 'age-confirm',
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    // 시안 auth.html `.cons`: 48px 줄, 먹색 체크, 아랫선 — 묶음의 윗선은 감싸는 쪽이 긋는다
    <div className="flex min-h-12 items-center border-b border-hairline">
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
          만 14세 이상이에요 <span className="text-ink-faint">(필수)</span>
        </span>
      </label>
    </div>
  );
}
