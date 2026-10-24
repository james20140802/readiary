/** 이메일 폼과 소셜 버튼 사이의 "또는" 헤어라인 — 시안 auth.html `.or` */
export default function OrDivider() {
  return (
    <div
      aria-hidden
      className="mb-1 mt-[22px] flex items-center gap-3 font-sans text-fine text-ink-faint"
    >
      <span className="h-px flex-1 bg-hairline" />
      또는
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}
