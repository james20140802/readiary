'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api/fetch';
import { EMAIL_COPY_VERSION, type EmailPreferences, type ConsentChange } from '@/lib/email/consent';
import Button from '@/components/ui/Button';
import EmailConsentField from './EmailConsentField';
interface Loaded {
  accountId: string;
  preferences: EmailPreferences;
  email: string | null;
  confirmed: boolean;
  available: boolean;
}
export default function EmailSettings() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);
  const [hasAttempt, setHasAttempt] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const lock = useRef(false);
  const attempt = useRef<ConsentChange | null>(null);
  const alive = useRef(true);
  const load = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await apiFetch('/api/email-preferences');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '설정을 불러오지 못했습니다.');
      if (!alive.current) return;
      if (!data.preferences) {
        setUnavailable(true);
        return;
      }
      setUnavailable(false);
      setLoaded(data);
      setChecked(data.preferences.enabled);
      setConflict(false);
      attempt.current = null;
      setHasAttempt(false);
    } catch {
      if (alive.current) setError('이메일 설정을 불러오지 못했습니다.');
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => {
      clearTimeout(timer);
      alive.current = false;
    };
  }, [load]);
  async function save() {
    if (lock.current || !loaded || conflict) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    const request = attempt.current ?? {
      accountId: loaded.accountId,
      enabled: checked,
      requestId: crypto.randomUUID(),
      expectedVersion: loaded.preferences.version,
      copyVersion: EMAIL_COPY_VERSION,
    };
    attempt.current = request;
    setHasAttempt(true);
    try {
      const response = await apiFetch('/api/email-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const data = await response.json();
      if (!alive.current) return;
      if (!response.ok) {
        if (response.status === 409) setConflict(true);
        if (response.status >= 400 && response.status < 500) {
          attempt.current = null;
          setHasAttempt(false);
        }
        throw new Error(data.error || '저장하지 못했습니다. 다시 시도해 주세요.');
      }
      setLoaded({ ...loaded, preferences: data.preferences });
      setChecked(data.preferences.enabled);
      attempt.current = null;
      setHasAttempt(false);
      setMessage(
        data.preferences.enabled
          ? 'Readiary 이메일 소식 수신 동의가 저장되었습니다.'
          : 'Readiary 이메일 소식 수신거부가 처리되었습니다.'
      );
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : '저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section aria-labelledby="email-settings-heading" className="space-y-3">
      <h2 id="email-settings-heading" className="text-section-title">
        이메일 소식
      </h2>
      {busy && (
        <p role="status" className="text-caption text-ink-sub">
          이메일 설정을 확인하고 있습니다.
        </p>
      )}
      {unavailable && (
        <p className="text-body-sm text-ink-sub">이메일 소식 신청을 준비 중입니다.</p>
      )}
      {loaded && (
        <>
          <EmailConsentField
            checked={checked}
            email={loaded.email}
            disabled={busy || conflict || hasAttempt}
            onChange={(next) => {
              setChecked(next);
              setMessage('');
              setError('');
            }}
          />
          {!loaded.confirmed && (
            <p className="text-caption text-ink-sub">
              이메일 인증을 마친 뒤 수신을 선택할 수 있습니다.
            </p>
          )}
          {!loaded.available && (
            <p className="text-caption text-ink-sub">
              새 신청은 준비 중이며 수신거부는 계속 가능합니다.
            </p>
          )}
          <Button
            onClick={save}
            loading={busy}
            disabled={
              busy ||
              conflict ||
              (checked && (!loaded.confirmed || !loaded.available)) ||
              (checked === loaded.preferences.enabled && !hasAttempt)
            }
          >
            이메일 설정 저장
          </Button>
        </>
      )}
      {error && (
        <div role="alert" className="space-y-2 text-body-sm text-danger">
          <p>{error}</p>
          {(!loaded || conflict || hasAttempt) && (
            <Button variant="secondary" onClick={load} disabled={busy}>
              최신 설정 다시 확인
            </Button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="text-body-sm text-ink-sub">
          {message} {new Date().toLocaleDateString('ko-KR')}
        </p>
      )}
    </section>
  );
}
