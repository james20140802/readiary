import { redirect } from 'next/navigation';

// Preserve existing push links and installed service workers.
export default function Page() {
  redirect('/protected/social/notifications');
}
