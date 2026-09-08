'use client';
import Link from 'next/link';
import { Bell, Check, Send } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Chip from '@/components/ui/Chip';
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
const labels: Record<PushKind, { title: string; description: string }> = {
  reminder: { title: '기록 리마인드', description: '읽는 책에 기록을 3일 쉬었을 때 · 주 1회 이하' },
  finished: { title: '완독 후 감상', description: '완독하고 7일 뒤, 감상이 없다면 · 책마다 한 번' },
  weekly: { title: '주간 회고', description: '이번 주에 남긴 기록 돌아보기 · 일요일' },
  recall: {
    title: '지난 문장 다시 보기',
    description: '오래전 남긴 문장과 다시 만나기 · 격주 이하',
  },
  friends: { title: '친구의 새 기록', description: '친구들의 기록을 한 번에 모아서 · 수요일' },
};
export default function PushSettings() {
  const [p, setP] = useState<PushPreferences>(DEFAULT_PUSH_PREFERENCES);
  const [testAvailable, setTestAvailable] = useState(false);
  const [scheduledAvailable, setScheduledAvailable] = useState(false);
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
        setTestAvailable(data.testAvailable === true);
        setScheduledAvailable(data.scheduledAvailable === true);
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
    setMessage('');
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
  async function testPush() {
    setBusy(true);
    setMessage('');
    try {
      const subscription = await existingPush();
      if (!subscription) throw new Error('먼저 이 기기의 알림을 켜주세요.');
      const response = await apiFetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? '테스트 발송에 실패했습니다.');
      setMessage('테스트 알림 발송을 접수했어요. 아이폰 알림 센터에서 도착 여부를 확인해 주세요.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const disabledReason = !loaded
    ? busy
      ? '설정을 불러오는 중이에요.'
      : '설정을 불러오지 못했어요. 새로고침해 주세요.'
    : !available
      ? '휴대폰 알림은 아직 준비 중이에요. 정식 제공 전에는 켤 수 없어요.'
      : !supported
        ? 'iPhone은 Safari에서 홈 화면에 추가한 앱으로 열어주세요.'
        : !p.kinds.length
          ? '받을 알림을 하나 이상 선택해 주세요.'
          : !p.weekdays.length
            ? '알림을 받을 요일을 하나 이상 선택해 주세요.'
            : '';
  return (
    <div className="space-y-9 text-body-sm">
      <section className="border-b border-hairline pb-6">
        <div className="flex items-center gap-2 text-ink">
          <Bell size={18} strokeWidth={1.75} aria-hidden />
          <h2 className="font-semibold">책 밖에서도, 가끔 안부를</h2>
        </div>
        <p className="mt-3 text-ink-sub leading-relaxed">
          받고 싶은 알림만 골라주세요. 모두 합쳐 일주일에 최대 두 번, 적어도 이틀 간격으로 보내요.
          알릴 내용이 있을 때만 찾아갈게요.
        </p>
        <p className="mt-2 text-caption text-ink-sub">
          댓글과 친구 요청은 앱 안의 알림에서 확인할 수 있어요.
        </p>
        {loaded && (
          <p className="mt-4 text-caption text-accent" role="status">
            {device && p.enabled ? '이 기기 알림 켜짐' : '이 기기 알림 꺼짐'}
            {testAvailable && !scheduledAvailable
              ? ' · 본인 계정 테스트 중, 자동 발송은 꺼져 있어요.'
              : ''}
          </p>
        )}
      </section>

      <fieldset disabled={busy || !loaded}>
        <legend className="text-section-title mb-2">받을 알림</legend>
        <div className="divide-y divide-hairline">
          {PUSH_KINDS.map((kind) => (
            <label
              key={kind}
              className="flex min-h-20 cursor-pointer items-center justify-between gap-4 py-4"
            >
              <span>
                <span className="block font-medium text-ink">{labels[kind].title}</span>
                <span className="mt-1 block text-caption text-ink-sub">
                  {labels[kind].description}
                </span>
              </span>
              <span className="relative shrink-0">
                <input
                  type="checkbox"
                  className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  checked={p.kinds.includes(kind)}
                  onChange={(e) =>
                    setP({
                      ...p,
                      kinds: e.target.checked
                        ? [...p.kinds, kind]
                        : p.kinds.filter((k) => k !== kind),
                    })
                  }
                />
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-hairline-strong text-transparent peer-checked:border-ink peer-checked:bg-ink peer-checked:text-ink-invert peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-paper peer-disabled:opacity-50"
                  aria-hidden
                >
                  <Check size={14} strokeWidth={2} />
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={busy || !loaded} className="space-y-5">
        <legend className="text-section-title mb-3">받기 좋은 시간</legend>
        <div className="flex items-center justify-between gap-4 border-b border-hairline pb-3">
          <label htmlFor="push-hour" className="font-medium">
            알림 시간
          </label>
          <select
            id="push-hour"
            className="min-h-11 bg-paper text-ink text-right focus-visible:outline-accent"
            value={p.hour}
            onChange={(e) => setP({ ...p, hour: Number(e.target.value) })}
          >
            {Array.from({ length: 13 }, (_, i) => i + 9).map((h) => (
              <option key={h} value={h}>
                {h < 12 ? '오전' : '오후'} {h % 12 || 12}시쯤
              </option>
            ))}
          </select>
        </div>
        <div>
          <p id="push-days" className="mb-3 font-medium">
            받을 요일
          </p>
          <div role="group" aria-labelledby="push-days" className="flex flex-wrap gap-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
              <Chip
                key={day}
                selected={p.weekdays.includes(i)}
                aria-pressed={p.weekdays.includes(i)}
                aria-label={`${day}요일`}
                className="min-h-11 min-w-11 justify-center"
                onClick={() =>
                  setP({
                    ...p,
                    weekdays: p.weekdays.includes(i)
                      ? p.weekdays.filter((d) => d !== i)
                      : [...p.weekdays, i],
                  })
                }
              >
                {day}
              </Chip>
            ))}
          </div>
          <p className="mt-3 text-caption text-ink-sub">
            일요일을 끄면 주간 회고, 수요일을 끄면 친구 기록 알림도 쉬어요.
          </p>
        </div>
        <details className="border-b border-hairline pb-3">
          <summary className="cursor-pointer py-2 text-ink-sub">시간대 · {p.timezone}</summary>
          <div className="pt-2 space-y-2">
            <Input
              variant="line"
              label="시간대"
              value={p.timezone}
              onChange={(e) => setP({ ...p, timezone: e.target.value })}
              placeholder="Asia/Seoul"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setP({ ...p, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
              }
            >
              이 기기의 시간대 사용
            </Button>
          </div>
        </details>
        <p className="text-caption text-ink-sub">
          밤 10시부터 아침 9시까지는 보내지 않아요. 휴대폰 설정에 따라 도착이 늦어질 수 있어요.
        </p>
      </fieldset>

      <section className="space-y-4">
        <h2 className="text-section-title">이 기기에서 받기</h2>
        <p className="text-caption text-ink-sub">
          iPhone에서는 Safari의 공유 메뉴에서 ‘홈 화면에 추가’한 뒤, 홈 화면의 앱을 열어주세요.
        </p>
        <p className="text-caption text-ink-sub leading-relaxed">
          알림을 켜면 선택한 알림 발송을 위해 기기 푸시 주소·암호화 키·선택 종류·시간대·동의 시각을
          저장해요. 구독은 해제·만료·탈퇴 시 삭제하고 발송 이력은 90일 보관해요. 알림은 선택
          사항이에요.{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            개인정보처리방침
          </Link>
        </p>
        {disabledReason && (
          <p id="push-disabled-reason" className="text-caption text-ink-sub">
            {disabledReason}
          </p>
        )}
        <div className="space-y-3">
          <Button
            fullWidth
            disabled={busy || !!disabledReason}
            aria-describedby={disabledReason ? 'push-disabled-reason' : undefined}
            onClick={() => void save(true)}
          >
            {device ? '이 기기 알림 다시 연결' : '동의하고 이 기기 알림 켜기'}
          </Button>
          <Button
            fullWidth
            variant="secondary"
            disabled={busy || !loaded || !p.weekdays.length || (p.enabled && !p.kinds.length)}
            onClick={() => void save()}
          >
            설정 저장
          </Button>
        </div>
        {(device || p.enabled) && (
          <div className="flex flex-wrap justify-center gap-2">
            {device && (
              <Button variant="ghost" disabled={busy} onClick={() => void stop(false)}>
                이 기기만 끄기
              </Button>
            )}
            {p.enabled && (
              <Button variant="ghost" disabled={busy} onClick={() => void stop(true)}>
                모든 기기 알림 끄기
              </Button>
            )}
          </div>
        )}
      </section>
      {testAvailable && (
        <section className="border-t border-hairline pt-6 space-y-3">
          <h2 className="font-semibold">내 기기로 테스트</h2>
          <p className="text-caption text-ink-sub">
            이 계정에서만 사용할 수 있어요. 위에서 알림을 켠 뒤 눌러주세요. 선택한 시간과 관계없이
            지금 이 기기에 한 번 보내요. 중복 방지를 위해 마지막 테스트 시각을 저장하며, 1분 뒤 다시
            보낼 수 있어요.
          </p>
          <Button
            variant="secondary"
            fullWidth
            disabled={busy || !device || !p.enabled}
            onClick={() => void testPush()}
          >
            <Send size={16} strokeWidth={1.75} aria-hidden />
            테스트 알림 보내기
          </Button>
        </section>
      )}
      <p role="status" aria-live="polite" className="text-body-sm text-ink">
        {message}
      </p>
    </div>
  );
}
