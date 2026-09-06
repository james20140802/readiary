import type { ReactNode } from 'react';

type PageKind =
  | 'dashboard'
  | 'books'
  | 'book'
  | 'entry'
  | 'form'
  | 'search'
  | 'profile'
  | 'social'
  | 'friends'
  | 'notifications'
  | 'page';

function Block({ className = '' }: { className?: string }) {
  return <div className={'rounded-md bg-hairline/60 ' + className} />;
}
function Lines() {
  return (
    <div className="space-y-3">
      <Block className="h-3 w-full" />
      <Block className="h-3 w-5/6" />
      <Block className="h-3 w-2/3" />
    </div>
  );
}
function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-hairline bg-card p-5 sm:p-6">{children}</div>;
}
function BookHeader() {
  return (
    <div className="flex gap-5">
      <Block className="h-32 w-20 shrink-0 sm:h-36 sm:w-24" />
      <div className="flex-1 space-y-4 pt-1">
        <Block className="h-7 w-3/4" />
        <Block className="h-3 w-1/3" />
        <Block className="h-3 w-1/2" />
      </div>
    </div>
  );
}
function Rows({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-hairline">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-5">
          <Block className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Block className="h-3 w-2/3" />
            <Block className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
function Shelf() {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-hairline pb-5 sm:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={'space-y-3 ' + (i === 3 ? 'hidden sm:block' : '')}>
          <Block className="aspect-[2/3] w-full" />
          <Block className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}

/** Static server-rendered placeholders, with reduced-motion support. */
export default function PageSkeleton({ kind = 'page' }: { kind?: PageKind }) {
  let content: ReactNode;
  switch (kind) {
    case 'dashboard':
      content = (
        <>
          <Panel>
            <Block className="mb-5 h-8 w-2/3" />
            <Block className="h-28 w-full" />
            <Block className="ml-auto mt-4 h-9 w-24" />
          </Panel>
          <div className="flex justify-between gap-3">
            {Array.from({ length: 7 }, (_, i) => (
              <Block key={i} className="h-10 flex-1" />
            ))}
          </div>
          <Block className="h-40 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <Panel>
              <Lines />
            </Panel>
            <Panel>
              <Lines />
            </Panel>
          </div>
        </>
      );
      break;
    case 'books':
      content = (
        <>
          <Block className="h-9 w-48" />
          <Shelf />
          <Shelf />
        </>
      );
      break;
    case 'book':
      content = (
        <>
          <BookHeader />
          <Block className="h-10 w-full" />
          <Lines />
          <Lines />
        </>
      );
      break;
    case 'entry':
      content = (
        <>
          <BookHeader />
          <Panel>
            <div className="space-y-8 py-6">
              <Lines />
              <Lines />
            </div>
          </Panel>
          <Block className="h-4 w-1/3" />
        </>
      );
      break;
    case 'form':
      content = (
        <>
          <Block className="h-12 w-full" />
          <Panel>
            <div className="space-y-6">
              <Block className="h-10 w-1/2" />
              <Block className="h-36 w-full" />
              <Block className="h-36 w-full" />
            </div>
          </Panel>
          <Block className="ml-auto h-10 w-28" />
        </>
      );
      break;
    case 'search':
      content = (
        <>
          <Block className="h-12 w-full" />
          <Rows count={3} />
        </>
      );
      break;
    case 'profile':
      content = (
        <>
          <Panel>
            <div className="space-y-6 py-6">
              <Block className="mx-auto h-16 w-16 rounded-full" />
              <Block className="mx-auto h-6 w-32" />
              <Lines />
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Block key={i} className="h-14" />
                ))}
              </div>
            </div>
          </Panel>
          <Shelf />
        </>
      );
      break;
    case 'social':
      content = (
        <>
          {Array.from({ length: 3 }, (_, i) => (
            <Panel key={i}>
              <Rows count={1} />
              <Lines />
              <Block className="mt-5 h-4 w-24" />
            </Panel>
          ))}
        </>
      );
      break;
    case 'friends':
      content = (
        <>
          <Block className="h-11 w-full" />
          <Block className="h-9 w-2/3" />
          <Rows />
        </>
      );
      break;
    case 'notifications':
      content = (
        <>
          <Block className="ml-auto h-8 w-24" />
          <Rows count={6} />
        </>
      );
      break;
    default:
      content = (
        <>
          <Panel>
            <Lines />
          </Panel>
          <Panel>
            <Lines />
          </Panel>
        </>
      );
  }
  return (
    <div role="status" aria-label="페이지를 불러오는 중입니다" className="w-full">
      <span className="sr-only">페이지를 불러오는 중입니다.</span>
      <div aria-hidden="true" className="space-y-8 motion-safe:animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <Block className="h-8 w-40" />
          <Block className="h-8 w-16" />
        </div>
        {content}
      </div>
    </div>
  );
}
