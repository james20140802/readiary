export default function Loading() {
  return (
    <div className="w-full flex flex-col items-center justify-center py-24 space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-accent border-opacity-50" />
      <p className="text-ink text-body">책 정보를 불러오는 중입니다...</p>
    </div>
  );
}
