import { ReactNode } from 'react';

interface AuthFrameProps {
  title: string;
  /** 제목 아래 한두 줄 — 무엇을 하는 화면인지 */
  lead?: ReactNode;
  /** 제목 위의 부리 'Readiary' — 처음 마주치는 로그인 화면에만 */
  wordmark?: boolean;
  children: ReactNode;
  /** 폼 아래 보조 링크들(가입·로그인·재설정으로 건너가기) — 양 끝으로 벌려 놓는다 */
  footer?: ReactNode;
}

/**
 * 인증 화면(로그인·가입·재설정·새 비밀번호·온보딩)의 공통 틀 — 시안 auth.html.
 * 메뉴 없이 괘선 종이 위 좁은 한 단(440px): 부리 제목·부리 리드, 밑줄 입력, 먹 버튼, 작은 링크 줄.
 * 데스크톱에서는 왼쪽에 기울어진 간지 한 장을 두고 폼을 오른쪽에 앉힌다.
 */
export default function AuthFrame({ title, lead, wordmark, children, footer }: AuthFrameProps) {
  return (
    <div className="lg:grid lg:min-h-[calc(100dvh-80px)] lg:grid-cols-2 lg:items-center lg:gap-20">
      <aside
        aria-hidden="true"
        className="vellum hidden max-w-[520px] -rotate-[1.2deg] justify-self-end rounded-[3px] px-11 py-10 lg:block"
      >
        <p className="font-sans text-caption font-semibold text-accent">다시 만나는 문장</p>
        <p className="mt-3 font-serif text-quote-lg text-ink">
          마음에 남은 문장을 적어 두면, 한 달 뒤에도 일 년 뒤에도 다시 만나요.
        </p>
        <p className="mt-3 font-sans text-caption text-ink-sub">Readiary</p>
      </aside>
      <section className="mx-auto w-full max-w-[440px] pb-4 lg:mx-0">
        <header>
          {wordmark && <p className="pt-2 font-serif text-[26px] font-bold text-ink">Readiary</p>}
          <h1 className="mt-7 break-keep font-serif text-[30px] font-bold leading-[1.3] text-ink">
            {title}
          </h1>
          {lead && (
            <p className="mt-2 break-keep font-serif text-[18px] leading-[1.65] text-ink-sub">
              {lead}
            </p>
          )}
        </header>
        <div className="mt-[18px]">{children}</div>
        {footer && <AuthLinks as="footer">{footer}</AuthLinks>}
      </section>
    </div>
  );
}

/** 폼 아래 작은 링크 줄(시안 `.sm-links`) — 링크마다 44px 누름 높이, 양 끝 정렬 */
export function AuthLinks({
  children,
  as: Tag = 'div',
}: {
  children: ReactNode;
  as?: 'div' | 'footer';
}) {
  return (
    <Tag className="mt-3.5 flex flex-wrap items-center justify-between gap-x-4 font-sans text-caption text-ink-sub [&_a:hover]:text-ink [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:rounded-sm focus-visible:[&_a]:outline-none focus-visible:[&_a]:ring-2 focus-visible:[&_a]:ring-accent">
      {children}
    </Tag>
  );
}
