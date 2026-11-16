// 쓰던 답을 이 기기에 남긴다 — 시트를 실수로 닫거나 화면을 돌려도 밑줄·답글마다 이어 쓴다.
import type { PickableEntry } from './client';
import type { Stance } from './types';

export type DraftTarget =
  | { kind: 'answer'; position: number | null }
  | { kind: 'reply'; answerId: string };

export interface Draft {
  stance: Stance | null;
  body: string;
  evidence: PickableEntry | null;
}

export function draftKey(debateId: string, target: DraftTarget): string {
  return target.kind === 'reply'
    ? `debate-draft:${debateId}:reply:${target.answerId}`
    : `debate-draft:${debateId}:${target.position ?? 'whole'}`;
}

export function loadDraft(debateId: string, target: DraftTarget): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(debateId, target));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Draft>;
    if (typeof v.body !== 'string') return null;
    return { stance: v.stance ?? null, body: v.body, evidence: v.evidence ?? null };
  } catch {
    return null;
  }
}

/** 글이 비면 남기지 않고 지운다 */
export function saveDraft(debateId: string, target: DraftTarget, draft: Draft): void {
  try {
    if (!draft.body.trim()) localStorage.removeItem(draftKey(debateId, target));
    else localStorage.setItem(draftKey(debateId, target), JSON.stringify(draft));
  } catch {
    // 저장 공간이 없거나 막혀 있으면 초안 없이 쓴다
  }
}

export function clearDraft(debateId: string, target: DraftTarget): void {
  try {
    localStorage.removeItem(draftKey(debateId, target));
  } catch {
    // 위와 같다
  }
}
