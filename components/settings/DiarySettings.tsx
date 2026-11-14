'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Chip from '@/components/ui/Chip';
import { apiFetch, SessionExpiredError } from '@/lib/api/fetch';
import { availableRules, ruleLabel, shownRule } from '@/lib/monthly-sentence/model';
import type { SentenceRule, SentenceRuleSetting } from '@/lib/monthly-sentence/types';
import { Meta, SettingsSection } from './SettingsParts';

const RULE_FAILED = '기준을 바꾸지 못했어요. 잠시 뒤 다시 해 주세요.';

/** 보이는 모양만 — 불러오는 동안의 자리 화면도 이 조각을 쓴다 */
export function DiarySettingsView({
  rules,
  selected,
  disabled,
  onSelect,
}: {
  /** null이면 기준을 불러오지 못했다 */
  rules: SentenceRule[] | null;
  selected: SentenceRule | null;
  disabled: boolean;
  onSelect: (rule: SentenceRule) => void;
}) {
  return (
    <SettingsSection id="diary" title="일기장">
      <Meta className="mt-2">
        달마다 한 문장을 직접 고르지 않은 달에는 이 기준으로 문장이 놓여요.
      </Meta>
      {rules ? (
        <div
          role="radiogroup"
          aria-label="고르지 않은 달을 채우는 기준"
          className="mt-3.5 flex flex-wrap gap-2"
        >
          {rules.map((option) => (
            <Chip
              key={option}
              role="radio"
              aria-checked={option === selected}
              selected={option === selected}
              disabled={disabled}
              onClick={() => onSelect(option)}
              className="min-h-11 px-4"
            >
              {ruleLabel(option)}
            </Chip>
          ))}
        </div>
      ) : (
        <Meta className="mt-3.5">기준을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</Meta>
      )}
    </SettingsSection>
  );
}

/** 설정의 일기장 구역 — 달마다 한 문장에서 고르지 않은 달을 채우는 기준. 고르면 바로 저장한다. */
export default function DiarySettings({ initial }: { initial: SentenceRuleSetting | null }) {
  const router = useRouter();
  const [rule, setRule] = useState(initial?.rule ?? null);
  const [saving, setSaving] = useState(false);

  if (!initial || !rule) {
    return <DiarySettingsView rules={null} selected={null} disabled onSelect={() => {}} />;
  }
  const current = shownRule(rule, initial.reflectionsOn);

  const change = async (next: SentenceRule) => {
    if (saving || next === current) return;
    const previous = rule;
    setSaving(true);
    setRule(next);
    try {
      const res = await apiFetch('/api/monthly-sentences/rule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: next }),
      });
      if (!res.ok) throw new Error('rule');
      // 일기장(프로필)이 새 기준의 문장을 받도록 서버 값을 새로 받는다
      router.refresh();
    } catch (error) {
      setRule(previous);
      if (!(error instanceof SessionExpiredError)) toast.error(RULE_FAILED);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DiarySettingsView
      rules={availableRules(initial.reflectionsOn)}
      selected={current}
      disabled={saving}
      onSelect={(next) => void change(next)}
    />
  );
}
