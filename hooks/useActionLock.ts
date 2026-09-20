'use client';

import { useMemo, useRef, useState } from 'react';

/** A synchronous gate: also protects Enter and calls before React commits disabled. */
export function useActionLock() {
  const locked = useRef(false);
  const [destination, setDestination] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const actions = useMemo(
    () => ({
      acquire() {
        if (locked.current) return false;
        locked.current = true;
        setBusy(true);
        return true;
      },
      navigate(href: string) {
        locked.current = true;
        setBusy(true);
        setDestination(href);
      },
      release() {
        locked.current = false;
        setBusy(false);
        setDestination(null);
      },
      isLocked: () => locked.current,
    }),
    []
  );
  return { ...actions, busy, destination };
}
