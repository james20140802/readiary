import { ReactNode } from 'react';
import AnimatedSection from '@/components/ui/AnimatedSection';

interface AuthFrameProps {
  title: string;
  /** 제목 아래 한 줄 — 무엇을 하는 화면인지 */
  lead?: ReactNode;
  children: ReactNode;
  /** 헤어라인 아래 보조 링크들(가입·로그인·재설정으로 건너가기) */
  footer?: ReactNode;
}

/**
 * 인증 화면(로그인·가입·재설정·새 비밀번호·온보딩)의 공통 틀 — 랜딩과 같은 讀 글리프와 부리 제목,
 * 좁은 한 단, 헤어라인으로 나눈 푸터. 도구(입력·버튼)는 산세리프, 제목만 부리.
 */
export default function AuthFrame({ title, lead, children, footer }: AuthFrameProps) {
  return (
    <section className="mx-auto w-full max-w-sm pb-4 pt-2 md:pt-8">
      <header className="text-center">
        <span aria-hidden className="font-serif text-3xl text-ink-faint">
          讀
        </span>
        <h1 className="mt-3 font-serif text-2xl font-bold leading-snug text-ink">{title}</h1>
        {lead && <p className="mt-2 break-keep text-body-sm text-ink-sub">{lead}</p>}
      </header>
      <AnimatedSection>
        <div className="mt-8">{children}</div>
      </AnimatedSection>
      {footer && (
        <footer className="mt-8 flex flex-col gap-2 border-t border-hairline pt-5 text-center text-body-sm text-ink-sub [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-ink">
          {footer}
        </footer>
      )}
    </section>
  );
}
