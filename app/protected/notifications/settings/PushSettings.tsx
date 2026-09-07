'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/fetch';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  DEFAULT_PUSH_PREFERENCES,
  PUSH_KINDS,
  type PushPreferences,
  type PushKind,
} from '@/lib/push/types';
import { disableDevicePush, enableDevicePush, existingPush } from '@/lib/push/browser';
const labels: Record<PushKind, string> = {
  reminder: '기록 리마인드 · 3일 쉬었을 때, 주 1회 이하',
  finished: '완독 후 감상 · 완독 7일 후 한 번',
  weekly: '주간 회고 · 일요일',
  recall: '지난 문장 다시 보기 · 격주 이하',
  friends: '친구 새 기록 모아보기 · 수요일',
};
export default function PushSettings() {
  const [p, setP] = useState<PushPreferences>(DEFAULT_PUSH_PREFERENCES);
  const [key, setKey] = useState('');
  const [available, setAvailable] = useState(false);
  const [supported, setSupported] = useState(false);
  const [device, setDevice] = useState(false);
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    void (async () => {
      try {
        const r = await apiFetch('/api/push/settings');
        if (!r.ok) throw new Error('설정을 불러오지 못했습니다. 새로고침해 주세요.');
        const data = await r.json();
        setSupported(
          'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
        );
        setP(data.preferences);
        setAvailable(data.available);
        setKey(data.publicKey ?? '');
        setDevice(!!(await existingPush()));
        setLoaded(true);
      } catch (e) {
        setMessage((e as Error).message);
      } finally {
        setBusy(false);
      }
    })();
  }, []);
  async function persist(next: PushPreferences) {
    const r = await apiFetch('/api/push/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    });
    if (!r.ok) {
      const b = await r.json();
      throw new Error(b.error ?? '저장에 실패했습니다.');
    }
    setP(next);
  }
  async function save(enable = false) {
    // Permission request must be directly attached to the user gesture (before any network await).
    const permission = enable ? Notification.requestPermission() : Promise.resolve('granted');
    setBusy(true);
    setMessage('');
    try {
      if ((await permission) !== 'granted')
        throw new Error('알림이 허용되지 않았습니다. 휴대폰 설정에서 권한을 확인해 주세요.');
      await persist({ ...p, enabled: enable ? true : p.enabled });
      if (enable) {
        const {
          data: { user },
        } = await createSupabaseClient().auth.getUser();
        if (!user) throw new Error('다시 로그인해 주세요.');
        await enableDevicePush(key, user.id);
        setDevice(true);
      }
      setMessage(enable ? '이 기기에서 알림을 받을 준비가 됐어요.' : '알림 설정을 저장했어요.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function stop(all: boolean) {
    setBusy(true);
    try {
      if (all) await persist({ ...p, enabled: false });
      await disableDevicePush();
      setDevice(false);
      setMessage(all ? '모든 기기의 알림을 껐어요.' : '이 기기 알림을 껐어요.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5 text-body-sm">
      <p>
        원하는 소식만 골라 받아보세요. 모두 합쳐 최근 7일 동안 최대 2번, 최소 48시간 간격으로
        보내요. 소식이 겹치면 한 번에 모으고, 기록하거나 확인한 내용은 건너뛰어요.
      </p>
      <p className="text-ink-sub">
        iPhone에서는 Safari의 공유 메뉴에서 ‘홈 화면에 추가’한 뒤 앱을 열어주세요. 알림은 선택
        사항이며, 끄더라도 독서 기록을 이용할 수 있어요.
      </p>
      {!available && loaded && (
        <p role="status">휴대폰 알림을 준비 중입니다. 설정은 둘러볼 수 있어요.</p>
      )}
      {!supported && loaded && (
        <p>이 환경에서는 푸시를 사용할 수 없어요. 홈 화면 앱 또는 지원 브라우저로 열어주세요.</p>
      )}
      <fieldset disabled={busy || !loaded} className="space-y-3">
        <legend className="font-medium mb-3">받을 소식 선택</legend>
        {PUSH_KINDS.map((k) => (
          <label key={k} className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={p.kinds.includes(k)}
              onChange={(e) =>
                setP({
                  ...p,
                  kinds: e.target.checked ? [...p.kinds, k] : p.kinds.filter((x) => x !== k),
                })
              }
            />
            <span>{labels[k]}</span>
          </label>
        ))}
      </fieldset>
      <fieldset disabled={busy || !loaded} className="space-y-3">
        <legend className="font-medium mb-3">받을 시간</legend>
        <label className="block">
          시간대
          <input
            className="block border rounded p-2 w-full"
            value={p.timezone}
            onChange={(e) => setP({ ...p, timezone: e.target.value })}
            placeholder="Asia/Seoul"
          />
        </label>
        <button
          type="button"
          className="underline"
          onClick={() => setP({ ...p, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}
        >
          이 기기의 시간대 사용
        </button>
        <label className="block">
          알림 시간
          <select
            className="ml-3 border rounded p-2"
            value={p.hour}
            onChange={(e) => setP({ ...p, hour: Number(e.target.value) })}
          >
            {Array.from({ length: 13 }, (_, i) => i + 9).map((h) => (
              <option key={h} value={h}>
                {h}시쯤
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-3">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <label key={day}>
              <input
                type="checkbox"
                checked={p.weekdays.includes(i)}
                onChange={(e) =>
                  setP({
                    ...p,
                    weekdays: e.target.checked
                      ? [...p.weekdays, i]
                      : p.weekdays.filter((d) => d !== i),
                  })
                }
              />{' '}
              {day}
            </label>
          ))}
        </div>
        <p className="text-caption text-ink-sub">
          밤 10시~아침 9시에는 보내지 않아요. 일요일을 끄면 주간 회고, 수요일을 끄면 친구 소식도
          쉬어요. 휴대폰 설정에 따라 도착이 늦어질 수 있어요.
        </p>
      </fieldset>
      <p className="text-caption text-ink-sub">
        알림을 켜면 선택한 알림 발송을 위해 기기 푸시 주소·암호화 키·선택 종류·시간대·동의 시각을
        저장해요. 구독은 해제·만료·탈퇴 시 삭제하고 발송 이력은 90일 보관해요.{' '}
        <Link href="/privacy" className="underline">
          개인정보처리방침
        </Link>
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          className="rounded bg-ink text-paper p-3 disabled:opacity-40"
          disabled={
            busy || !loaded || !available || !supported || !p.kinds.length || !p.weekdays.length
          }
          onClick={() => void save(true)}
        >
          {device ? '이 기기 알림 다시 연결' : '동의하고 이 기기 알림 켜기'}
        </button>
        <button
          className="rounded border p-3 disabled:opacity-40"
          disabled={busy || !loaded || !p.weekdays.length || (p.enabled && !p.kinds.length)}
          onClick={() => void save()}
        >
          설정 저장
        </button>
        {device && (
          <button className="underline" disabled={busy} onClick={() => void stop(false)}>
            이 기기만 끄기
          </button>
        )}
        {p.enabled && (
          <button className="underline" disabled={busy} onClick={() => void stop(true)}>
            모든 기기 알림 끄기
          </button>
        )}
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <Link className="underline" href="/protected/notifications/inbox">
        받은 독서 소식 보기
      </Link>
    </div>
  );
}
