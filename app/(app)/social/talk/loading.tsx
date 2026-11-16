export default function DebateListLoading() {
  return (
    <div
      className="mx-auto max-w-[1040px] animate-pulse motion-reduce:animate-none"
      aria-busy="true"
      aria-label="토론 목록을 불러오는 중"
    >
      <div className="h-9 w-24 rounded bg-hairline" />
      <div className="mt-5 h-11 w-full rounded-full bg-hairline lg:w-[280px]" />
      {[0, 1].map((i) => (
        <div key={i} className="mt-8">
          <div className="h-4 w-28 rounded bg-hairline" />
          <div className="mt-3 h-6 w-full rounded bg-hairline" />
          <div className="mt-2 h-6 w-3/4 rounded bg-hairline" />
        </div>
      ))}
    </div>
  );
}
