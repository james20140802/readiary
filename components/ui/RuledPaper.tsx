import clsx from 'clsx';

interface RuledPaperProps {
  /** margin: 왼쪽 여백선 + 가로 괘선, plain: 가로 괘선만 */
  variant: 'margin' | 'plain';
  /** 데스크톱에서 사이드바 오른쪽부터 깐다 */
  besideSidebar?: boolean;
}

/** 화면 뒤에 고정으로 깔리는 일기장 괘선 — 장식이라 보조기기에는 숨긴다 */
export default function RuledPaper({ variant, besideSidebar }: RuledPaperProps) {
  return (
    <div
      aria-hidden
      className={clsx(
        'diary-ruled',
        variant === 'plain' && 'diary-ruled--plain',
        besideSidebar && 'diary-ruled--beside-sidebar'
      )}
    />
  );
}
