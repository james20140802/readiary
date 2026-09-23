'use client';
import { useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { clearOtherReflectionDrafts } from '@/lib/reflections/draft';
/** Account-scoped drafts must be purged even when no reader is currently open. */
export default function ReflectionDraftGuard() {
  useEffect(() => {
    const {
      data: { subscription },
    } = createSupabaseClient().auth.onAuthStateChange((_event, session) => {
      try {
        clearOtherReflectionDrafts(sessionStorage, session?.user.id ?? null);
      } catch {
        /* blocked storage cannot be read by the next account either */
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
