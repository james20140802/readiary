import EntryFormSkeleton from '@/components/entries/EntryFormSkeleton';

export default function Loading() {
  return (
    <EntryFormSkeleton
      heading="기록 고치기"
      submitLabel="고쳐 남기기"
      back={{ href: '#', label: '기록' }}
      existing
    />
  );
}
