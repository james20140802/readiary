'use client';
import { useActionLock } from '@/hooks/useActionLock';
import AcceptFriendRequestButton from './AcceptFriendRequestButton';
import DeclineFriendRequestButton from './DeclineFriendRequestButton';
export default function FriendRequestActions({ friendUserId }: { friendUserId: string }) {
  const action = useActionLock();
  return (
    <div className="flex gap-1">
      <AcceptFriendRequestButton friendUserId={friendUserId} action={action} />
      <DeclineFriendRequestButton friendUserId={friendUserId} action={action} />
    </div>
  );
}
