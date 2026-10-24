'use client';

import TodayError from '@/components/today/TodayError';

export default function Error({ reset }: { reset: () => void }) {
  return <TodayError onRetry={reset} />;
}
