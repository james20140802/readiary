import BackButton from '@/components/ui/BackButton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8" aria-busy="true">
      <header className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-page-title">이번 주의 기록</h1>
      </header>
      <p role="status" className="text-body-sm text-ink-sub">
        이번 주에 남긴 기록을 펼치고 있어요.
      </p>
      <div
        aria-hidden="true"
        className="ml-1 space-y-10 border-l border-hairline-strong pl-6 motion-safe:animate-pulse"
      >
        {[0, 1, 2].map((day) => (
          <div key={day} className="space-y-4 py-2">
            <div className="h-4 w-24 rounded-sm bg-card-raised" />
            <div className="h-5 w-40 rounded-sm bg-card-raised" />
            <div className="h-24 max-w-lg rounded-sm bg-card-raised" />
          </div>
        ))}
      </div>
    </div>
  );
}
