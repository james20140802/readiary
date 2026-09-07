'use client';
import { useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { disableDevicePush, PUSH_OWNER_KEY } from '@/lib/push/browser';
export default function PushAccountGuard() {
  useEffect(() => {
    const db = createSupabaseClient();
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      let owner: string | null = null;
      try {
        owner = localStorage.getItem(PUSH_OWNER_KEY);
      } catch {
        return;
      }
      if (owner && owner !== session?.user.id) void disableDevicePush().catch(() => {});
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
