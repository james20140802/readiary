import ReflectionFeatureProvider from '@/components/features/ReflectionFeatureProvider';
import { getReflectionFeature } from '@/lib/features/entry-reflections';
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReflectionFeatureProvider initial={await getReflectionFeature()}>
      {children}
    </ReflectionFeatureProvider>
  );
}
