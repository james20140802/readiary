'use client';
import Link from 'next/link';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Meta, SwitchRow } from '@/components/settings/SettingsParts';
import { apiFetch } from '@/lib/api/fetch';
import { createSupabaseClient } from '@/lib/supabase/client';
import {
  DEFAULT_PUSH_PREFERENCES,
  PUSH_KINDS,
  type PushPreferences,
  type PushKind,
} from '@/lib/push/types';
import { disableDevicePush, enableDevicePush, existingPush } from '@/lib/push/browser';

export const PUSH_LABELS: Record<PushKind, { title: string; description: string }> = {
  reminder: { title: '기록 리마인드', description: '읽는 책에 기록을 3일 쉬었을 때 · 주 1회 이하' },
  finished: { title: '완독 후 감상', description: '완독하고 7일 뒤, 감상이 없다면 · 책마다 한 번' },
  weekly: { title: '주간 회고', description: '이번 주에 남긴 기록 돌아보기 · 일요일' },
  recall: {
    title: '지난 문장 다시 보기',
    description: '오래전 남긴 문장과 다시 만나기 · 격주 이하',
  },
  friends: { title: '친구의 새 기록', description: '친구들의 기록을 한 번에 모아서 · 수요일' },
};

/** 시안 순서 — 기록 리마인드, 지난 문장, 주간 회고, 완독 후 감상, 친구의 새 기록 */
const KIND_ORDER: PushKind[] = ['reminder', 'recall', 'weekly', 'finished', 'friends'];
const ORDERED_KINDS = KIND_ORDER.filter((k) => PUSH_KINDS.includes(k));

export interface PushSettingsViewProps {
  loaded: boolean;
  busy: boolean;
  /** 이 기기가 구독되어 있다 */
  device: boolean;
  /** 계정 단위 알림이 켜져 있다 */
  enabled: boolean;
  kinds: PushKind[];
  testAvailable: boolean;
  scheduledAvailable: boolean;
  /** 이 기기 알림을 켤 수 없는 이유 — 없으면 '' */
  disabledReason: string;
  onToggleKind: (kind: PushKind, on: boolean) => void;
  onEnable: () => void;
  onSave: () => void;
  onStop: (all: boolean) => void;
  onTest: () => void;
}

/** 알림 구역의 모양 — 이 기기 상태 간지, 받을 알림 스위치, 저장·끄기·시험 */
export function PushSettingsView({
  loaded,
  busy,
  device,
  enabled,
  kinds,
  testAvailable,
  scheduledAvailable,
  disabledReason,
  onToggleKind,
  onEnable,
  onSave,
  onStop,
  onTest,
}: PushSettingsViewProps) {
  const on = device && enabled;
  return (
    <div>
      <div className="vellum mt-2.5 rounded-[3px] px-5 py-[18px]">
        <p className="font-sans text-[16px] font-semibold text-ink" role="status">
          {!loaded
            ? busy
              ? '알림 설정을 확인하고 있어요'
              : '알림 설정을 불러오지 못했어요'
            : on
              ? '이 기기 알림이 켜져 있어요'
              : '이 기기 알림이 꺼져 있어요'}
        </p>
        <Meta className="mt-1">
          받고 싶은 알림만 골라 주세요. 모두 합쳐 일주일에 최대 두 번, 기기 시간대 기준 저녁 8시쯤
          보내요. 댓글과 친구 요청은 앱 안에서 확인할 수 있어요.
          {loaded && testAvailable && !scheduledAvailable
            ? ' 지금은 본인 계정 시험 중이라 자동 발송은 꺼져 있어요.'
            : ''}
        </Meta>
        {disabledReason && (
          <Meta className="mt-2">
            <span id="push-disabled-reason">{disabledReason}</span>
          </Meta>
        )}
        <Button
          size="sm"
          className="mt-3"
          disabled={busy || !!disabledReason}
          aria-describedby={disabledReason ? 'push-disabled-reason' : undefined}
          onClick={onEnable}
        >
          {device ? '이 기기 알림 다시 연결' : '동의하고 이 기기 알림 켜기'}
        </Button>
        <p className="mt-3 font-sans text-[13px] font-medium leading-normal text-ink-sub">
          아이폰은 Safari에서 ‘홈 화면에 추가’로 설치한 뒤에 알림을 받을 수 있어요. 알림을 켜면
          선택한 알림을 보내기 위해 기기 푸시 주소·암호화 키·선택 종류·시간대·동의 시각을 저장해요.
          구독은 해제·만료·탈퇴 시 삭제하고 발송 이력은 90일 보관해요. 알림은 선택 사항이에요.{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            개인정보처리방침
          </Link>
        </p>
      </div>

      <fieldset disabled={busy || !loaded} className="mt-3.5">
        <legend className="sr-only">받을 알림</legend>
        {ORDERED_KINDS.map((kind, i) => (
          <SwitchRow
            key={kind}
            title={PUSH_LABELS[kind].title}
            hint={PUSH_LABELS[kind].description}
            checked={kinds.includes(kind)}
            onChange={(next) => onToggleKind(kind, next)}
            disabled={busy || !loaded}
            last={i === ORDERED_KINDS.length - 1}
          />
        ))}
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !loaded || (enabled && !kinds.length)}
          onClick={onSave}
        >
          고른 알림 저장
        </Button>
        {testAvailable && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !device || !enabled}
            onClick={onTest}
          >
            이 기기로 시험해 보기
          </Button>
        )}
        {device && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onStop(false)}>
            이 기기만 끄기
          </Button>
        )}
        {enabled && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => onStop(true)}>
            모든 기기 알림 끄기
          </Button>
        )}
      </div>
      {testAvailable && (
        <Meta className="mt-2 text-[13px]">
          시험 알림은 이 계정에서만 보낼 수 있어요. 마지막 시험 시각을 저장하며 1분 뒤 다시 보낼 수
          있어요.
        </Meta>
      )}
    </div>
  );
}

/** 휴대폰 독서 알림 설정 — 불러오기·저장·기기 구독은 그대로, 모양은 PushSettingsView */
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
  useEffect(() => {
    void (async () => {
      try {
        const r = await apiFetch('/api/push/settings');
        if (!r.ok) throw new Error('설정을 불러오지 못했습니다. 새로고침해 주세요.');
        const data = await r.json();
        setSupported(
          'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
        );
        setP({
          ...data.preferences,
          hour: 20,
          weekdays: [...DEFAULT_PUSH_PREFERENCES.weekdays],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        setAvailable(data.available);
        setTestAvailable(data.testAvailable === true);
        setScheduledAvailable(data.scheduledAvailable === true);
        setKey(data.publicKey ?? '');
        setDevice(!!(await existingPush()));
        setLoaded(true);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(false);
      }
    })();
  }, []);
  async function persist(next: PushPreferences) {
    next = {
      ...next,
      hour: 20,
      weekdays: [...DEFAULT_PUSH_PREFERENCES.weekdays],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
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
      toast.success(enable ? '이 기기에서 알림을 받을 준비가 됐어요.' : '알림 설정을 저장했어요.');
    } catch (e) {
      toast.error((e as Error).message);
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
      toast.success(all ? '모든 기기의 알림을 껐어요.' : '이 기기 알림을 껐어요.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function testPush() {
    setBusy(true);
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
      toast.success(
        '테스트 알림 발송을 접수했어요. 아이폰 알림 센터에서 도착 여부를 확인해 주세요.'
      );
    } catch (e) {
      toast.error((e as Error).message);
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
          : '';
  return (
    <PushSettingsView
      loaded={loaded}
      busy={busy}
      device={device}
      enabled={p.enabled}
      kinds={p.kinds}
      testAvailable={testAvailable}
      scheduledAvailable={scheduledAvailable}
      disabledReason={disabledReason}
      onToggleKind={(kind, on) =>
        setP({ ...p, kinds: on ? [...p.kinds, kind] : p.kinds.filter((k) => k !== kind) })
      }
      onEnable={() => void save(true)}
      onSave={() => void save()}
      onStop={(all) => void stop(all)}
      onTest={() => void testPush()}
    />
  );
}
