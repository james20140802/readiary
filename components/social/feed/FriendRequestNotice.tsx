import Link from 'next/link';
import clsx from 'clsx';
import type { Friend } from '@/types/friends';
import Button from '@/components/ui/Button';
import { subjectParticle } from '@/components/social/feedFormat';
import FriendRequestActions from '@/components/social/requests/FriendRequestActions';
import AcceptFriendRequestButton from '@/components/social/requests/AcceptFriendRequestButton';

interface Props {
  pending: Friend[];
  friendCount: number;
  /** strip: 모바일 피드 위 한 줄(시안 .req), card: 데스크톱 옆 칸 간지 */
  variant: 'strip' | 'card';
  className?: string;
}

function who(pending: Friend[]) {
  const first = pending[0].profile.name;
  return pending.length === 1 ? first : `${first} 외 ${pending.length - 1}명`;
}

/** 받은 친구 신청 — 한 명이면 바로 수락할 수 있고, 여럿이면 받은 요청으로 데려간다 */
export default function FriendRequestNotice({ pending, friendCount, variant, className }: Props) {
  if (pending.length === 0) return null;
  const single = pending.length === 1 ? pending[0].profile : null;
  const message = (
    <>
      <b className="font-semibold">{who(pending)}</b>
      {subjectParticle(who(pending))} 친구 신청을 보냈어요
    </>
  );

  if (variant === 'card') {
    return (
      <section
        aria-label="받은 친구 신청"
        className={clsx('vellum rounded-[3px] px-[18px] py-4', className)}
      >
        <p className="font-sans text-[16px] font-semibold text-ink">{message}</p>
        <div className="mt-3 flex gap-2">
          {single ? (
            <FriendRequestActions friendUserId={single.id} name={single.name} />
          ) : (
            <Button asChild size="sm">
              <Link href="/social/friends?tab=pending">받은 요청 보기</Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="받은 친구 신청"
      className={clsx(
        'vellum flex items-center justify-between gap-3 rounded-[3px] py-2.5 pl-4 pr-2.5 lg:hidden',
        className
      )}
    >
      <p className="min-w-0 font-sans text-[15px] font-medium text-ink">{message}</p>
      <div className="flex shrink-0 gap-1.5">
        <Button asChild size="sm" variant="secondary">
          <Link href={single ? '/social/friends' : '/social/friends?tab=pending'}>
            {single ? `친구 ${friendCount}` : '받은 요청'}
          </Link>
        </Button>
        {single && <AcceptFriendRequestButton friendUserId={single.id} name={single.name} />}
      </div>
    </section>
  );
}
