// 쓰던 답을 이 기기에 남긴다 — 시트를 실수로 닫거나 화면을 돌려도 밑줄·답글마다 이어 쓴다.
// 공용 기기에서 다음 사람이 앞사람의 초안(나만 보기 근거 포함)을 받지 않도록 키에 계정을 넣고, 계정이 바뀌면 지운다.
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

/** 계정을 키에 넣기 전의 초안도 같은 접두어라 정리할 때 함께 지운다 */
const PREFIX = 'debate-draft:';
const OWNED = `${PREFIX}v2:`;

export function draftKey(userId: string, debateId: string, target: DraftTarget): string {
  const base = `${OWNED}${userId}:${debateId}`;
  return target.kind === 'reply'
    ? `${base}:reply:${target.answerId}`
    : `${base}:${target.position ?? 'whole'}`;
}

export function loadDraft(userId: string, debateId: string, target: DraftTarget): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, debateId, target));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<Draft>;
    if (typeof v.body !== 'string') return null;
    return { stance: v.stance ?? null, body: v.body, evidence: v.evidence ?? null };
  } catch {
    return null;
  }
}

/** 글이 비면 남기지 않고 지운다 */
export function saveDraft(
  userId: string,
  debateId: string,
  target: DraftTarget,
  draft: Draft
): void {
  try {
    const key = draftKey(userId, debateId, target);
    if (!draft.body.trim()) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // 저장 공간이 없거나 막혀 있으면 초안 없이 쓴다
  }
}

export function clearDraft(userId: string, debateId: string, target: DraftTarget): void {
  try {
    localStorage.removeItem(draftKey(userId, debateId, target));
  } catch {
    // 위와 같다
  }
}

/** 지금 계정의 초안만 남긴다. 로그아웃(null)이면 모두 지운다 */
export function clearOtherDebateDrafts(storage: Storage, userId: string | null): void {
  const mine = userId ? `${OWNED}${userId}:` : null;
  for (let i = storage.length - 1; i >= 0; i--) {
    const key = storage.key(i);
    if (key?.startsWith(PREFIX) && (!mine || !key.startsWith(mine))) storage.removeItem(key);
  }
}
