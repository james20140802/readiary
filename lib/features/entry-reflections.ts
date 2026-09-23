import { cache } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/supabase/getServerUser';

/** Request-local only. Missing configuration or a failed lookup always disables rollout. */
export const getReflectionFeature = cache(async () => {
  try {
    const {
      data: { user },
      error: authError,
    } = await getServerUser();
    if (!user || authError) return { enabled: false, userId: null };
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('entry_reflections_enabled');
    return { enabled: !error && data === true, userId: user.id };
  } catch {
    return { enabled: false, userId: null };
  }
});
