import Link from 'next/link';
import clsx from 'clsx';

const LINK =
  'rounded-sm underline underline-offset-[3px] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/**
 * 이용 약관·개인정보처리방침 고지 한 줄. 서비스 제공에 필요한 개인정보는 계약 이행(개인정보 보호법
 * 제15조 제1항 제4호)으로 처리하므로 체크로 동의를 받지 않고, 누르기 전에 볼 수 있게 알린다.
 * 문서는 새 탭으로 열어 입력하던 가입 화면을 잃지 않게 한다.
 */
export default function LegalNotice({
  action,
  className,
}: {
  /** 무엇을 하면 동의하게 되는지 — "가입하면", "일기장을 펼치면" */
  action: string;
  className?: string;
}) {
  return (
    <p className={clsx('break-keep font-sans text-fine text-ink-sub', className)}>
      {action}{' '}
      <Link href="/terms" target="_blank" rel="noopener" className={LINK}>
        서비스 이용 약관<span className="sr-only"> (새 탭)</span>
      </Link>
      과{' '}
      <Link href="/privacy" target="_blank" rel="noopener" className={LINK}>
        개인정보처리방침<span className="sr-only"> (새 탭)</span>
      </Link>
      에 동의하게 돼요.
    </p>
  );
}
