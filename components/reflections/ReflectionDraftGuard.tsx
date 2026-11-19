'use client';
import { useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { clearOtherReflectionDrafts } from '@/lib/reflections/draft';
import { clearOtherDebateDrafts } from '@/lib/debate/draft';
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
      try {
        // 토론 답 초안도 계정에 묶여 있다 — 로그아웃·계정 전환 때 다른 계정의 것을 지운다
        clearOtherDebateDrafts(localStorage, session?.user.id ?? null);
      } catch {
        /* 위와 같다 */
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
