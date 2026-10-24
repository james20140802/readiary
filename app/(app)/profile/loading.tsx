/** 나 — 첫 장(문장 표지) 자리를 먼저 깐다. 장 틀(leaves)은 본문 여백이 없어 스스로 여백을 둔다 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="나의 책을 펼치는 중"
      className="flex flex-col items-center px-6 pt-[calc(72px+var(--app-safe-top))] lg:items-start lg:px-20 lg:pt-10"
    >
      <div className="aspect-[7/10] w-[min(230px,60vw)] rounded-[2px_6px_6px_2px] bg-hairline/70 lg:w-[340px]" />
      <div className="mt-[22px] h-7 w-32 rounded-md bg-hairline/60" />
      <div className="mt-3 h-4 w-56 rounded-md bg-hairline/50" />
    </div>
  );
}
