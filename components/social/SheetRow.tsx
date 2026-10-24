import Link from 'next/link';
import clsx from 'clsx';

// 시안 .lrow — 54px 줄, 위 헤어라인, 마지막 줄은 아래에도
const ROW =
  'flex min-h-[54px] w-full items-center gap-3 border-t border-hairline text-left font-sans text-[17px] font-medium last:border-b ' +
  'hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:opacity-50';

type Props = { children: React.ReactNode; danger?: boolean } & (
  | { href: string; onClick?: () => void }
  | { href?: undefined; onClick: () => void; disabled?: boolean }
);

/** 시트 안 메뉴 한 줄 — 주소가 있으면 링크, 없으면 버튼 */
export default function SheetRow(props: Props) {
  const cls = clsx(ROW, props.danger ? 'text-danger hover:text-danger' : 'text-ink');
  if (props.href !== undefined) {
    return (
      <Link href={props.href} onClick={props.onClick} className={cls}>
        {props.children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} disabled={props.disabled} className={cls}>
      {props.children}
    </button>
  );
}
