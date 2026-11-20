'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Sheet from '@/components/ui/Sheet';
import { SessionExpiredError, apiFetch } from '@/lib/api/fetch';
import { photoQuoteVisible } from '@/lib/photo-quote/config';
import { forgetPhotoTextConsent } from '@/lib/photo-quote/consentCache';
import { SettingsRow } from './SettingsParts';

type State = 'loading' | 'failed' | 'consented' | 'none';

/**
 * 사진 글자 읽기 동의를 확인하고 철회하는 행. 기능이 켜져 있으면 상태는 행을 눌렀을 때 읽는다 —
 * 닫혀 있는 것을 위해 설정을 열 때마다 미리 가져오지 않는다.
 * 기능이 꺼져 있으면 철회할 길을 지키려고 설정을 열 때 한 번 묻고, 동의한 사람에게만 행을 보인다.
 */
export default function PhotoTextConsent() {
  const enabled = photoQuoteVisible();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (enabled) return;
    let alive = true;
    void (async () => {
      try {
        const res = await apiFetch('/api/photo-text/consent');
        const data = (await res.json().catch(() => null)) as { consented?: unknown } | null;
        if (alive && res.ok && data?.consented === true) setState('consented');
      } catch {
        // 꺼진 기능의 행이라 실패하면 그리지 않는다
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  if (!enabled && state !== 'consented') return null;

  const load = async () => {
    setState('loading');
    setError(null);
    try {
      const res = await apiFetch('/api/photo-text/consent');
      const data = (await res.json().catch(() => null)) as { consented?: unknown } | null;
      if (!res.ok || typeof data?.consented !== 'boolean') throw new Error('load failed');
      setState(data.consented ? 'consented' : 'none');
    } catch (e) {
      if (!(e instanceof SessionExpiredError)) setState('failed');
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch('/api/photo-text/consent', { method: 'DELETE' });
      if (!res.ok) throw new Error('withdraw failed');
      forgetPhotoTextConsent();
      if (!enabled) setOpen(false);
      setState('none');
      toast.success('동의를 철회했어요.');
    } catch (e) {
      if (!(e instanceof SessionExpiredError))
        setError('철회하지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsRow
        onClick={() => {
          setOpen(true);
          if (enabled) void load();
        }}
        hint="사진으로 문장을 옮길 때 사진을 Google로 보내는 데 대한 동의"
      >
        사진 글자 읽기 동의
      </SettingsRow>
      <Sheet open={open} onClose={() => setOpen(false)} title="사진 글자 읽기 동의">
        <div className="mt-2 font-sans text-body text-ink-sub">
          {state === 'loading' && <p role="status">불러오는 중…</p>}
          {state === 'failed' && (
            <>
              <p role="alert">불러오지 못했어요.</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => void load()}>
                다시 시도
              </Button>
            </>
          )}
          {state === 'consented' && (
            <>
              <p>
                사진을 Google(미국)로 보내 글자를 읽는 데 동의했어요. Readiary는 사진을 저장하지
                않아요.
                {enabled && ' 철회하면 다음에 사진으로 옮기기를 누를 때 다시 물어봐요.'}
              </p>
              {error && (
                <p role="alert" className="mt-3 text-caption font-medium text-danger">
                  {error}
                </p>
              )}
              <Button
                variant="secondary"
                className="mt-4"
                disabled={busy}
                onClick={() => void withdraw()}
              >
                {busy ? '철회하는 중…' : '동의 철회'}
              </Button>
            </>
          )}
          {state === 'none' && (
            <p>아직 동의하지 않았어요. 기록 폼의 사진으로 옮기기를 처음 누를 때 물어봐요.</p>
          )}
        </div>
      </Sheet>
    </>
  );
}
