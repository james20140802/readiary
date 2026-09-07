import BackButton from '@/components/ui/BackButton';
import PushSettings from './PushSettings';
export default function Page() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <header className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-page-title">휴대폰 알림 설정</h1>
      </header>
      <PushSettings />
    </div>
  );
}
