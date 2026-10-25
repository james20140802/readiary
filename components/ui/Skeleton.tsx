/**
 * 불러오는 동안의 자리 — 실제 화면 컴포넌트에 자리용 데이터를 넣어 그대로 그린다. 컴포넌트가 불러온 데이터를 그리는
 * 요소에 `data-skeleton`을 달아 두면 이 범위 안에서 그 글자만 먹 막대로, 사진은 빈 면으로 바뀐다(globals.css).
 * 고정 문구·아이콘·틀·여백·간지는 실제 화면과 같은 코드에서 나오므로, 내용이 도착해도 자리가 밀리지 않는다.
 * 범위 안은 보조기기와 키보드에서 빠진다(inert). 막대는 은은히 숨 쉬고, 동작 줄이기에서는 멈춘다.
 */
export function SkeletonScope({
  label,
  className,
  children,
}: {
  /** 보조기기에 읽히는 문장 — "오늘을 펼치는 중" 처럼 */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-label={label} className={className}>
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" inert className="skeleton-scope">
        {children}
      </div>
    </div>
  );
}

const SYLLABLES = '가나다라마바사아자차카타파하';

/** 자리용 글 — 글자 수만 맞추면 실제 문장처럼 줄이 감기고 끝난다(화면에는 막대로만 보인다) */
export function filler(length: number): string {
  let out = '';
  for (let i = 0; out.length < length; i++) {
    out += SYLLABLES[i % SYLLABLES.length];
    if (i % 4 === 3) out += ' ';
  }
  return out.slice(0, length).trimEnd();
}
