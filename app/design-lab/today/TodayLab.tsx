'use client';

import { ReflectionFeatureContext } from '@/components/features/ReflectionFeatureProvider';
import TodayView, { type TodayViewProps } from '@/components/today/TodayView';
import TodaySkeleton from '@/components/today/TodaySkeleton';
import TodayError from '@/components/today/TodayError';
import ComposerDemo, { type ComposerDemoProps } from './ComposerDemo';

export type LabState = 'default' | 'quiet' | 'new' | 'saved' | 'pending' | 'loading' | 'error';

/** 견본 화면 — 실제 TodayView에 견본 데이터를 넣는다. 회상 알림 읽음 처리는 끈다 */
export default function TodayLab({
  state,
  view,
  composer,
}: {
  state: LabState;
  view: Omit<TodayViewProps, 'composer' | 'markSeen'>;
  composer: ComposerDemoProps;
}) {
  if (state === 'loading') return <TodaySkeleton />;
  if (state === 'error') return <TodayError onRetry={() => window.location.reload()} />;
  return (
    <ReflectionFeatureContext.Provider value>
      <TodayView {...view} markSeen={false} composer={<ComposerDemo {...composer} />} />
    </ReflectionFeatureContext.Provider>
  );
}
