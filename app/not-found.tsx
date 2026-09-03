export default function NotFound() {
  // 루트 레이아웃의 <main> 안에 그려지므로 main을 중첩하지 않고, 높이도 셸 여백을 뚫지 않게
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 text-ink">
      <div className="text-center">
        <h1 className="font-serif text-5xl font-bold">404</h1>
        <p className="mt-4 text-lg">페이지를 찾을 수 없습니다.</p>
        <p className="mt-2 text-sm text-ink-sub">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있어요.
        </p>
      </div>
    </div>
  );
}
