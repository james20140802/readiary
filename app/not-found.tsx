export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center text-black dark:text-label-invert px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-4 text-lg">페이지를 찾을 수 없습니다.</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-label-muted">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있어요.
        </p>
      </div>
    </main>
  );
}
