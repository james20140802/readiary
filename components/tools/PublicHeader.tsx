import Link from 'next/link';
import Button from '@/components/ui/Button';
import { authHrefWithRedirect } from '@/lib/auth/safeRedirect';

interface PublicHeaderProps {
  /**
   * 로그인·가입 뒤 돌아올 경로(초대 링크 등). 없으면 각자의 오늘로 간다.
   * 이미 로그인한 사람이 눌러도 proxy가 목적지(또는 /today)로 보내 준다.
   */
  redirect?: string | null;
  /** 수신거부처럼 계정과 무관한 화면은 로그인 버튼 없이 이름만 */
  auth?: boolean;
}

/**
 * 메뉴가 없는 바깥 화면(공유받은 문장·초대·약관·개인정보처리방침)의 머리 —
 * 왼쪽 부리 'Readiary', 오른쪽 로그인·시작하기. 시안 share.html `.top`.
 * 로그인 상태를 묻지 않는다: 이 화면들은 비로그인 방문자가 주인공이고, 로그인한 사람은
 * /login·/signup에서 proxy가 바로 일기장으로 돌려보낸다.
 */
export default function PublicHeader({ redirect = null, auth = true }: PublicHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between gap-3">
      <Link
        href="/"
        prefetch={false}
        className="rounded-sm font-serif text-[22px] font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Readiary
      </Link>
      {auth && (
        <nav aria-label="계정" className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={authHrefWithRedirect('/login', redirect)} prefetch={false}>
              로그인
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={authHrefWithRedirect('/signup', redirect)} prefetch={false}>
              시작하기
            </Link>
          </Button>
        </nav>
      )}
    </header>
  );
}
