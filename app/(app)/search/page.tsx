import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import LibrarySearch from '@/components/search/LibrarySearch';
export default async function SearchPage() {
  const {
    data: { user },
  } = await getServerUser();
  if (!user) redirect('/login');
  return <LibrarySearch key={user.id} userId={user.id} />;
}
