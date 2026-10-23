'use client';
import { useActionLock } from '@/hooks/useActionLock';
import AcceptFriendRequestButton from './AcceptFriendRequestButton';
import DeclineFriendRequestButton from './DeclineFriendRequestButton';
export default function FriendRequestActions({
  friendUserId,
  name,
}: {
  friendUserId: string;
  name?: string;
}) {
  const action = useActionLock();
  return (
    <div className="flex gap-1.5">
      <AcceptFriendRequestButton friendUserId={friendUserId} action={action} name={name} />
      <DeclineFriendRequestButton friendUserId={friendUserId} action={action} name={name} />
    </div>
  );
}
