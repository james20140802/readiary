'use client';
import { useEffect, useRef } from 'react';
import { NOTIFICATIONS_READ_EVENT } from '@/hooks/useUnreadNotifications';
import { apiFetch } from '@/lib/api/fetch';
export default function PushSeen({
  kind,
  id,
}: {
  kind: 'friends' | 'weekly' | 'recall' | 'inbox';
  id?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let visible = false;
    let marked = false;
    const mark = () => {
      if (visible && !marked && document.visibilityState === 'visible') {
        marked = true;
        void apiFetch('/api/push/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, id }),
        })
          .then((r) => {
            if (!r.ok) marked = false;
            else if (kind === 'inbox') window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
          })
          .catch(() => {
            marked = false;
          });
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      mark();
    });
    if (ref.current) observer.observe(ref.current);
    document.addEventListener('visibilitychange', mark);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', mark);
    };
  }, [kind, id]);
  return <span ref={ref} aria-hidden="true" className="block h-px w-px" />;
}
