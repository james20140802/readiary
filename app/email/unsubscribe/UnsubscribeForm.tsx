'use client';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
export default function UnsubscribeForm() {
  const [token, setToken] = useState<string | null>(null);
  const captured = useRef(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    if (captured.current) return;
    captured.current = true;
    setToken(window.location.hash.slice(1));
    window.history.replaceState(null, '', window.location.pathname);
  }, []);
  async function withdraw() {
    if (lock.current || !token) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/email-unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || '처리하지 못했습니다. 다시 시도해 주세요.');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '다시 시도해 주세요.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      {done ? (
        <p role="status">
          Readiary 소식·이벤트 이메일 수신거부가 처리되었습니다.{' '}
          {new Date().toLocaleDateString('ko-KR')}
        </p>
      ) : (
        <>
          <p className="text-body text-ink-sub">
            수신을 거부하면 Readiary 소식·이벤트 이메일을 더 이상 보내지 않습니다. 계정 인증 메일은
            계속 받을 수 있습니다.
          </p>
          {token === '' && (
            <p role="alert">메일의 수신거부 링크를 다시 열거나 알림 설정에서 변경해 주세요.</p>
          )}
          <Button onClick={withdraw} loading={busy} disabled={!token || busy}>
            이메일 수신거부
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
      <a
        href="/protected/notifications/settings"
        className="inline-flex min-h-11 items-center underline underline-offset-4"
      >
        알림 설정으로 이동
      </a>
    </div>
  );
}
