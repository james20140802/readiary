import Link from 'next/link';
import Button from '@/components/ui/Button';
import { authHrefWithRedirect } from '@/lib/auth/safeRedirect';
import PublicHeader from './PublicHeader';

/**
 * 로그인하지 않은 사람이 초대 링크를 열었을 때. 예전에는 곧장 로그인 화면으로 보냈는데,
 * 처음 온 사람은 왜 로그인 화면에 왔는지, 계정이 없으면 어떻게 하는지 알 수 없었다.
 * 누가 초대했는지(주소의 닉네임#태그)만 보여 주고 가입·로그인을 고르게 한다.
 * 두 길 모두 돌아올 주소(redirect)를 실어 가입 → 메일 인증 → 일기장 이름 → 초대로 이어진다.
 */
export default function InviteView({
  nickname,
  tag,
  invitePath,
}: {
  nickname: string;
  tag: string;
  /** '/invite/닉네임-태그' — 로그인·가입 뒤 돌아올 곳 */
  invitePath: string;
}) {
  return (
    <div className="mx-auto max-w-[1000px]">
      <PublicHeader auth={false} />
      <section className="mx-auto mt-[6vh] max-w-[440px]">
        <p className="font-sans text-caption font-semibold text-accent">초대 링크</p>
        <h1 className="mt-2 break-keep font-serif text-[30px] font-bold leading-[1.3] text-ink">
          <span className="break-all">
            {nickname}#{tag}
          </span>
          님이 함께 읽자고 했어요
        </h1>
        <p className="mt-2 break-keep font-serif text-[18px] leading-[1.65] text-ink-sub">
          친구가 되면 서로 마음에 남은 문장을 읽고, 좋아요와 댓글을 남길 수 있어요.
        </p>
        <Button asChild fullWidth className="mt-7">
          <Link href={authHrefWithRedirect('/signup', invitePath)} prefetch={false}>
            가입하고 친구 맺으러 가기
          </Link>
        </Button>
        <Button asChild variant="secondary" fullWidth className="mt-3">
          <Link href={authHrefWithRedirect('/login', invitePath)} prefetch={false}>
            이미 계정이 있어요 · 로그인
          </Link>
        </Button>
      </section>
    </div>
  );
}
