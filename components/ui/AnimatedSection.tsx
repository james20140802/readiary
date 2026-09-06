import type { PropsWithChildren } from 'react';

export default function AnimatedSection({ children }: PropsWithChildren) {
  return <section className="space-y-8">{children}</section>;
}
