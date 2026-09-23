'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';

export const ReflectionFeatureContext = createContext(false);
export const useReflectionFeature = () => useContext(ReflectionFeatureContext);

export default function ReflectionFeatureProvider({
  children,
  initial,
}: {
  children?: React.ReactNode;
  initial: { enabled: boolean; userId: string | null };
}) {
  const [enabled, setEnabled] = useState(initial.enabled);
  useEffect(() => {
    let userId = initial.userId;
    let sequence = 0;
    let controller: AbortController | undefined;
    const refresh = async () => {
      const request = ++sequence;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch('/api/features/entry-reflections', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const next = response.ok ? await response.json() : null;
        if (request !== sequence) return;
        setEnabled(next?.userId === userId && next?.enabled === true);
      } catch {
        if (request === sequence) setEnabled(false);
      }
    };
    const focus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const {
      data: { subscription },
    } = createSupabaseClient().auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user.id ?? null;
      if (nextId !== userId) {
        userId = nextId;
        setEnabled(false);
        void refresh();
      }
    });
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    return () => {
      sequence++;
      controller?.abort();
      subscription.unsubscribe();
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [initial.userId]);
  return (
    <ReflectionFeatureContext.Provider value={enabled}>
      {children}
    </ReflectionFeatureContext.Provider>
  );
}
