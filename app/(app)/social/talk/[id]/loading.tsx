export default function DebateLoading() {
  return (
    <div
      className="mx-auto max-w-[640px] animate-pulse motion-reduce:animate-none"
      aria-busy="true"
      aria-label="토론을 불러오는 중"
    >
      <div className="h-4 w-32 rounded bg-hairline" />
      <div className="mt-5 h-7 w-full rounded bg-hairline" />
      <div className="mt-3 h-7 w-4/5 rounded bg-hairline" />
      <div className="mt-8 h-5 w-3/4 rounded bg-hairline" />
      <div className="mt-10 h-5 w-1/2 rounded bg-hairline" />
      <div className="mt-4 h-16 w-full rounded bg-hairline" />
    </div>
  );
}
