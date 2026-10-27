'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { ChevronRight } from 'lucide-react';
import { LargeTitle } from '@/components/shell/LargeTitle';
import { TopBarActions } from '@/components/shell/TopBarContext';
import s from './settings.module.css';

export interface TocItem {
  id: string;
  label: string;
}

/** 설정 한 화면 — 큰 제목, 데스크톱 왼쪽의 붙박이 차례, 오른쪽 구역들(시안 settings.html) */
export function SettingsLayout({ toc, children }: { toc: TocItem[]; children: React.ReactNode }) {
  return (
    <>
      {/* 도구 화면 — 상단 바에는 뒤로와 제목만(시안). 기본 찾기·알림을 비운다 */}
      <TopBarActions>{null}</TopBarActions>
      <LargeTitle>설정</LargeTitle>
      <div className="lg:grid lg:grid-cols-[150px_minmax(0,640px)] lg:items-start lg:gap-14">
        <nav
          aria-label="설정 차례"
          className="hidden lg:sticky lg:top-11 lg:mt-2 lg:grid lg:gap-0.5"
        >
          {toc.map((t) => (
            <a
              key={t.id}
              href={`#${t.id}`}
              className="flex h-[38px] items-center font-sans text-[15px] font-medium text-ink-sub hover:text-ink"
            >
              {t.label}
            </a>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </>
  );
}

/** 구역 하나 — 고정 상단 바에 가리지 않게 앵커 여백을 둔다. 첫 구역(프로필)은 제목을 화면 낭독기에만 */
export function SettingsSection({
  id,
  title,
  hideTitle,
  first,
  children,
}: {
  id: string;
  title: string;
  hideTitle?: boolean;
  first?: boolean;
  children: React.ReactNode;
}) {
  const headingId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={clsx(
        'scroll-mt-[calc(72px+var(--app-safe-top))] lg:scroll-mt-10',
        first ? 'mt-2' : 'mt-[34px]'
      )}
    >
      <h2
        id={headingId}
        className={
          hideTitle ? 'sr-only' : 'font-serif text-[22px] font-bold leading-[1.3] text-ink'
        }
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

const ROW =
  'flex min-h-[54px] w-full items-center gap-3 border-t border-hairline text-left font-sans text-[17px] font-medium text-ink';

/** 목록 줄 — 시안의 .lrow. 이동(href)·동작(onClick)·표시만(둘 다 없음) */
export function SettingsRow({
  children,
  hint,
  value,
  href,
  onClick,
  chevron = Boolean(href || onClick),
  last,
  tone,
  disabled,
  id,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
  value?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  last?: boolean;
  tone?: 'danger';
  disabled?: boolean;
  id?: string;
}) {
  const body = (
    <>
      <span className="min-w-0 py-2.5">
        {children}
        {hint && (
          <small className="mt-0.5 block font-sans text-[14px] font-medium leading-[1.45] text-ink-sub">
            {hint}
          </small>
        )}
      </span>
      {value && <span className="ml-auto truncate text-[16px] text-ink-sub">{value}</span>}
      {chevron && (
        <ChevronRight
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className={clsx('shrink-0 text-ink-faint', !value && 'ml-auto')}
        />
      )}
    </>
  );
  const cls = clsx(
    ROW,
    last && 'border-b',
    tone === 'danger' && 'text-danger',
    (href || onClick) &&
      'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent disabled:opacity-50'
  );
  if (href) {
    return (
      <Link id={id} href={href} className={cls}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button id={id} type="button" onClick={onClick} disabled={disabled} className={cls}>
        {body}
      </button>
    );
  }
  return (
    <div id={id} className={cls}>
      {body}
    </div>
  );
}

/** 켜고 끄는 줄 — 이름은 줄 제목에서 가져온다 */
export function SwitchRow({
  title,
  hint,
  checked,
  onChange,
  disabled,
  last,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  last?: boolean;
}) {
  return (
    <div className={clsx(ROW, last && 'border-b')}>
      <span className="min-w-0 py-2.5">
        {title}
        {hint && (
          <small className="mt-0.5 block font-sans text-[14px] font-medium leading-[1.45] text-ink-sub">
            {hint}
          </small>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(s.switch, 'ml-auto')}
      />
    </div>
  );
}

/** 작은 회색 안내 — 시안의 .meta */
export function Meta({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={clsx('font-sans text-[15px] font-medium leading-normal text-ink-sub', className)}>
      {children}
    </p>
  );
}

/** 구역 안 작은 이름표 — 시안의 .label */
export function SubLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={clsx('font-sans text-[14px] font-semibold text-ink-sub', className)}>
      {children}
    </h3>
  );
}
