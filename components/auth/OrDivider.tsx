/** 소셜 버튼과 이메일 폼 사이의 "또는" 헤어라인 */
export default function OrDivider() {
  return (
    <div aria-hidden className="my-6 flex items-center gap-3 text-caption text-ink-faint">
      <span className="h-px flex-1 bg-hairline" />
      또는
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}
