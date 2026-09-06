import { cache } from 'react';
import { createSupabaseServerClient } from './server';

/** React request scope only: never persist auth results across requests/users.
 * Use direct auth.getUser() in mutation handlers that may change the session.
 */
export const getServerUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  return supabase.auth.getUser();
});
