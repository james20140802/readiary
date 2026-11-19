// 브라우저에서 토론 API를 부르고, 서버 모양(snake_case)을 화면 모양(camelCase)으로 바꾼다.
import { apiFetch } from '@/lib/api/fetch';
import type { DebateMover, Range, ReportReason, Stance } from './types';

export { mapAnswer, mapDebate, mapListItem } from './map';
import { mapAnswer, mapDebate, mapListItem, type Raw } from './map';

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
    tag: m.tag,
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

export interface PickableEntry {
  id: string;
  quote: string;
  date?: string;
  pageFrom?: number | null;
  isPrivate: boolean;
  bookTitle: string;
  bookAuthor: string | null;
}

export const fetchPickableEntries = (q: string, page: number, book: string | null = null) =>
  call<{ items: PickableEntry[]; next: number | null }>(
    `/api/debates/entries?q=${encodeURIComponent(q)}&page=${page}${book ? `&book=${book}` : ''}`
  );

export interface PickableBook {
  userBookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  quoteCount: number;
}

export const fetchPickableBooks = () => call<PickableBook[]>('/api/debates/books');
