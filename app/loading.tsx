/**
 * 전용 loading.tsx가 없는 화면에서 보이는 공용 로딩 — 특정 화면을 흉내 내지 않고
 * 앱 틀(AppShell) 위에 조용한 문구 하나만 둔다.
 */
export default function Loading() {
  return (
    <p role="status" className="py-16 text-center font-sans text-caption text-ink-sub">
      불러오는 중입니다.
    </p>
  );
}
