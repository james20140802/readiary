// 브라우저에서 토론 API를 부르고, 서버 모양(snake_case)을 화면 모양(camelCase)으로 바꾼다.
import { apiFetch } from '@/lib/api/fetch';
import type {
  DebateAnswer,
  DebateDetail,
  DebateListItem,
  DebateMover,
  DebatePerson,
  PickKind,
  Range,
  ReportReason,
  Stance,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any -- RPC JSON을 한 곳에서만 해석한다 */
type Raw = any;

export class DebateApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'DebateApiError';
  }
}

const person = (p: Raw): DebatePerson => ({
  id: p.id,
  nickname: p.nickname ?? null,
  profileImage: p.profile_image ?? null,
  isFriend: Boolean(p.is_friend),
  isMe: Boolean(p.is_me),
  active: p.active ?? true,
});

const owner = (p: Raw): Omit<DebatePerson, 'active'> => {
  const { active: _drop, ...rest } = person(p);
  void _drop;
  return rest;
};

const totals = (t: Raw) => ({
  agree: t.agree ?? 0,
  differ: t.differ ?? 0,
  question: t.question ?? 0,
  movedPeople: t.moved_people ?? 0,
});

export function mapAnswer(a: Raw): DebateAnswer {
  return {
    id: a.id,
    author: person(a.author),
    stance: (a.stance as Stance | null) ?? null,
    body: a.body ?? null,
    evidence: a.evidence
      ? {
          quote: a.evidence.quote,
          bookTitle: a.evidence.book_title,
          bookAuthor: a.evidence.book_author ?? null,
          pageFrom: a.evidence.page_from ?? null,
          pageTo: a.evidence.page_to ?? null,
          entryId: a.evidence.entry_id ?? null,
        }
      : null,
    movedCount: a.moved_count ?? 0,
    movedByMe: Boolean(a.moved_by_me),
    replyCount: a.reply_count ?? 0,
    replies: Array.isArray(a.replies) ? a.replies.map(mapAnswer) : null,
    hidden: Boolean(a.hidden),
    deleted: Boolean(a.deleted),
    edited: Boolean(a.edited),
    reportedByMe: Boolean(a.reported_by_me),
    createdAt: a.created_at,
  };
}

export function mapDebate(d: Raw): DebateDetail {
  return {
    id: d.id,
    owner: owner(d.owner),
    quote: d.quote,
    bookTitle: d.book_title,
    bookAuthor: d.book_author ?? null,
    pageFrom: d.page_from ?? null,
    pageTo: d.page_to ?? null,
    sourceEntryId: d.source_entry_id ?? null,
    question: d.question,
    createdAt: d.created_at,
    closedAt: d.closed_at ?? null,
    canAnswer: Boolean(d.can_answer),
    summary: d.summary
      ? {
          body: d.summary.body,
          pins: (d.summary.pins ?? []).map((p: Raw) => ({
            answerId: p.answer_id,
            nickname: p.nickname ?? null,
            firstLine: p.first_line ?? null,
            deleted: Boolean(p.deleted),
          })),
        }
      : null,
    totals: totals(d.totals ?? {}),
    sections: (d.sections ?? []).map((s: Raw) => ({
      position: s.position ?? null,
      range: s.start === null || s.start === undefined ? null : { start: s.start, end: s.end },
      count: s.count ?? 0,
      agree: s.agree ?? 0,
      differ: s.differ ?? 0,
      question: s.question ?? 0,
      picks: (s.picks ?? []).map(mapAnswer),
      pickKinds: (s.pick_kinds ?? []) as PickKind[],
    })),
  };
}

export function mapListItem(i: Raw): DebateListItem {
  return {
    id: i.id,
    owner: owner(i.owner),
    quote: i.quote,
    underlines: (i.underlines ?? []) as Range[],
    question: i.question,
    totals: totals(i.totals ?? {}),
    answerCount: i.answer_count ?? 0,
    topLine: i.top_line
      ? { nickname: i.top_line.nickname ?? null, body: i.top_line.body, kind: i.top_line.kind }
      : null,
    summaryFirstLine: i.summary_first_line ?? null,
    closedAt: i.closed_at ?? null,
    lastActivityAt: i.last_activity_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(input, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new DebateApiError(data.error ?? '잠시 후 다시 시도해 주세요.', res.status, data.code);
  }
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export const createDebate = (input: { entryId: string; question: string; underlines: Range[] }) =>
  call<{ id: string }>('/api/debates', json('POST', input));

export const fetchDebate = async (id: string) => mapDebate(await call(`/api/debates/${id}`));

export const updateQuestion = (id: string, question: string) =>
  call(`/api/debates/${id}`, json('PATCH', { question }));

export const deleteDebate = (id: string) => call(`/api/debates/${id}`, { method: 'DELETE' });

export async function fetchSectionAnswers(id: string, position: number | null, after: number) {
  const q = position === null ? 'whole=1' : `position=${position}`;
  const data = await call<{ answers: unknown[]; next: number | null }>(
    `/api/debates/${id}/answers?${q}&after=${after}`
  );
  return { answers: data.answers.map(mapAnswer), next: data.next };
}

export const postAnswer = (
  id: string,
  input: { underline: number | null; stance: Stance; body: string; evidenceEntryId: string | null }
) => call<{ id: string }>(`/api/debates/${id}/answers`, json('POST', input));

export const postReply = (answerId: string, body: string) =>
  call<{ id: string }>(`/api/debate-answers/${answerId}/replies`, json('POST', { body }));

export const fetchReplies = async (answerId: string) =>
  (await call<unknown[]>(`/api/debate-answers/${answerId}/replies`)).map(mapAnswer);

export const editAnswer = (answerId: string, input: { stance: Stance | null; body: string }) =>
  call(`/api/debate-answers/${answerId}`, json('PATCH', input));

export const deleteAnswer = (answerId: string) =>
  call(`/api/debate-answers/${answerId}`, { method: 'DELETE' });

export const setMove = async (answerId: string, on: boolean) =>
  (await call<{ movedCount: number }>(`/api/debate-answers/${answerId}/move`, json('PUT', { on })))
    .movedCount;

export const setHidden = (answerId: string, hidden: boolean) =>
  call(`/api/debate-answers/${answerId}/hidden`, json('PUT', { hidden }));

export const fetchMovers = async (answerId: string): Promise<DebateMover[]> =>
  (await call<Raw[]>(`/api/debate-answers/${answerId}/movers`)).map((m) => ({
    nickname: m.nickname,
    profileImage: m.profile_image ?? null,
    isFriend: Boolean(m.is_friend),
  }));

export const saveSummary = (id: string, input: { body: string; pins: string[] }) =>
  call(`/api/debates/${id}/summary`, json('PUT', input));

export const clearSummary = (id: string) =>
  call(`/api/debates/${id}/summary`, { method: 'DELETE' });

export const report = (
  id: string,
  input: { answerId: string | null; reason: ReportReason; memo: string | null }
) => call(`/api/debates/${id}/report`, json('POST', input));

export async function fetchDebateList(input: { closed: boolean; before: string | null }) {
  const params = new URLSearchParams();
  if (input.closed) params.set('closed', '1');
  if (input.before) params.set('before', input.before);
  const data = await call<{ items: unknown[]; next_before: string | null }>(
    `/api/debates?${params}`
  );
  return { items: data.items.map(mapListItem), nextBefore: data.next_before };
}

export const fetchEntryDebateCount = async (entryId: string) =>
  (await call<{ count: number }>(`/api/entries/${entryId}/debates`)).count;
