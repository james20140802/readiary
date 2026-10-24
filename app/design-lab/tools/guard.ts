import { notFound } from 'next/navigation';

/** 견본은 프로덕션 배포(VERCEL_ENV=production)에서 열리지 않는다 */
export function labGuard() {
  if (process.env.VERCEL_ENV === 'production') notFound();
}

export const LAB_ROBOTS = { index: false } as const;
