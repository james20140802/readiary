// 서버 RPC 모양(snake_case) → 화면 모양(camelCase). 서버 페이지와 브라우저가 함께 쓴다.
import type {
  DebateAnswer,
  DebateDetail,
  DebateListItem,
  DebatePerson,
  PickKind,
  Range,
  Stance,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any -- RPC JSON을 한 곳에서만 해석한다 */
export type Raw = any;

const person = (p: Raw): DebatePerson => ({
  id: p.id,
  nickname: p.nickname ?? null,
  tag: p.tag ?? null,
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
      prompt: s.prompt ?? null,
      count: s.count ?? 0,
      extra: s.extra ?? 0,
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
