/** 친구의 문장을 불러오는 동안 — 큰 제목 자리와 간지 세 장. 동작 줄이기에서는 깜빡이지 않는다 */
export default function SocialFeedSkeleton() {
  return (
    <div role="status" aria-label="친구의 문장을 불러오는 중" className="lg:max-w-[720px]">
      <div className="h-[39px] w-24 rounded-[3px] bg-hairline motion-safe:animate-pulse" />
      <div className="mt-6 space-y-9">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="vellum rounded-[3px] px-[22px] pb-[18px] pt-[22px]">
            <div className="flex items-center gap-3">
              <div className="h-[54px] w-[38px] rounded-[2px] bg-hairline" />
              <div className="space-y-2">
                <div className="h-4 w-16 rounded-sm bg-hairline motion-safe:animate-pulse" />
                <div className="h-3.5 w-40 rounded-sm bg-hairline motion-safe:animate-pulse" />
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="h-5 w-full rounded-sm bg-hairline motion-safe:animate-pulse" />
              <div className="h-5 w-3/4 rounded-sm bg-hairline motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
