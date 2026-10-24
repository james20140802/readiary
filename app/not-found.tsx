import Link from 'next/link';
import Button from '@/components/ui/Button';

/**
 * 없는 주소 — 도구 화면 문법(괘선 위 산세리프 큰 제목, 짧은 설명, 먹 버튼 하나).
 * 루트 레이아웃의 <main> 안에 그려지므로 main을 중첩하지 않는다. 공유가 해제된 문장 링크도 여기로 온다.
 * '처음으로'는 로그인한 사람을 proxy가 오늘로, 아닌 사람을 첫 화면으로 보낸다.
 */
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[640px] pb-10 pt-[8vh] lg:pt-[12vh]">
      <p className="font-mono text-overline font-medium text-ink-faint">404</p>
      <h1 className="mt-2 font-sans text-page-title text-ink lg:text-page-title-lg">
        이 쪽은 비어 있어요
      </h1>
      <p className="mt-3 break-keep font-serif text-note text-ink-sub">
        주소가 바뀌었거나, 지워졌거나, 더 이상 공유하지 않는 기록일 수 있어요.
      </p>
      <Button asChild className="mt-7">
        <Link href="/" prefetch={false}>
          처음으로
        </Link>
      </Button>
    </div>
  );
}
