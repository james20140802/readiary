/** 이번 주의 기록을 읽는 동안 — 같은 자리에 큰 제목과 헤어라인 줄만 먼저 깐다 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[640px]" aria-busy="true">
      <h1 className="font-sans text-page-title lg:text-page-title-lg">이번 주의 기록</h1>
      <p role="status" className="mt-1.5 font-sans text-caption text-ink-sub">
        이번 주에 남긴 기록을 펼치고 있어요.
      </p>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        {[0, 1].map((day) => (
          <div key={day} className="mt-[34px]">
            <div className="mb-3 h-3.5 w-32 rounded-sm bg-ink/[0.08]" />
            {[0, 1].map((row) => (
              <div key={row} className="space-y-2.5 border-t border-hairline py-4">
                <div className="h-5 w-11/12 rounded-sm bg-ink/[0.06]" />
                <div className="h-5 w-3/5 rounded-sm bg-ink/[0.06]" />
                <div className="h-3.5 w-28 rounded-sm bg-ink/[0.06]" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
