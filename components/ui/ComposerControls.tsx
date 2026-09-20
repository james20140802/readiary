import type { ReactNode, Ref } from 'react';

interface Props {
  books: ReactNode;
  children: ReactNode;
  controlsRef?: Ref<HTMLDivElement>;
  booksRef?: Ref<HTMLDivElement>;
}

/** 실제 입력창과 랜딩이 공유하는 배치: 넓으면 한 줄, 좁으면 책 선택만 윗줄로. */
export default function ComposerControls({ books, children, controlsRef, booksRef }: Props) {
  return (
    <div className="mt-3.5 border-t border-hairline pt-3.5">
      <div
        ref={controlsRef}
        className="flex flex-wrap items-center gap-x-4 gap-y-2.5 [container-type:inline-size]"
      >
        <div
          ref={booksRef}
          className="relative flex max-w-full flex-none items-center gap-2 whitespace-nowrap"
        >
          {books}
        </div>
        <div className="flex min-w-max flex-auto items-center gap-px whitespace-nowrap [@container(min-width:250px)]:gap-1 [&>button]:shrink-0 [&>button:nth-child(4)]:px-2">
          {children}
        </div>
      </div>
    </div>
  );
}
