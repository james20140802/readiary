// 문장 토론 화면이 쓰는 모양. 서버 RPC(snake_case) → lib/debate/client.ts가 이 모양(camelCase)으로 바꾼다.
import type { Range } from './underline';

export type { Range };

export type Stance = 'agree' | 'differ' | 'question';

export const STANCES: readonly Stance[] = ['agree', 'differ', 'question'];

export const STANCE_LABEL: Record<Stance, string> = {
  agree: '공감',
  differ: '다르게 읽음',
  question: '질문',
};

export type ReportReason = 'abuse' | 'spam' | 'privacy' | 'other';

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
  abuse: '불쾌하거나 공격적인 말',
  spam: '광고·도배',
  privacy: '개인정보 노출',
  other: '그 밖의 이유',
};

export interface DebatePerson {
  id: string;
  nickname: string | null;
  tag: string | null;
  profileImage: string | null;
  isFriend: boolean;
  isMe: boolean;
  /** 탈퇴 유예 중이면 false(본문과 이름이 가려진다) */
  active: boolean;
}

export interface DebateEvidence {
  quote: string;
  bookTitle: string;
  bookAuthor: string | null;
  pageFrom: number | null;
  pageTo: number | null;
  /** 원래 기록 — 볼 권한이 있을 때만 */
  entryId: string | null;
}

export interface DebateAnswer {
  id: string;
  author: DebatePerson;
  /** 답글이면 null */
  stance: Stance | null;
  /** 지웠거나 떠난 사람의 답이면 null */
  body: string | null;
  evidence: DebateEvidence | null;
  movedCount: number;
  movedByMe: boolean;
  replyCount: number;
  /** 앞의 두 답글(답글 자신에게는 null) */
  replies: DebateAnswer[] | null;
  hidden: boolean;
  deleted: boolean;
  edited: boolean;
  reportedByMe: boolean;
  createdAt: string;
}

export type PickKind = 'most_moved' | 'other_side' | 'plain';

export interface DebateSection {
  /** 밑줄 번호(1~3). 문장 전체면 null */
  position: number | null;
  range: Range | null;
  /** 발제자가 이 밑줄에 덧붙인 물음(없으면 null) */
  prompt: string | null;
  count: number;
  /** 세지 않지만 보는 사람에게 보이는 답 수(숨긴 답·자리만 남은 답·떠난 사람의 답) — 이어 불러올 수 있게 */
  extra: number;
  agree: number;
  differ: number;
  question: number;
  picks: DebateAnswer[];
  pickKinds: PickKind[];
}

export interface DebateTotals {
  agree: number;
  differ: number;
  question: number;
  movedPeople: number;
}

export interface DebatePin {
  answerId: string;
  nickname: string | null;
  firstLine: string | null;
  deleted: boolean;
  /** 그 답이 붙은 밑줄 번호(문장 전체면 null). 예전 응답처럼 알 수 없으면 undefined */
  position?: number | null;
}

export interface DebateDetail {
  id: string;
  owner: Omit<DebatePerson, 'active'>;
  quote: string;
  bookTitle: string;
  bookAuthor: string | null;
  pageFrom: number | null;
  pageTo: number | null;
  sourceEntryId: string | null;
  question: string;
  createdAt: string;
  closedAt: string | null;
  canAnswer: boolean;
  summary: { body: string; pins: DebatePin[] } | null;
  totals: DebateTotals;
  sections: DebateSection[];
}

export interface DebateListItem {
  id: string;
  owner: Omit<DebatePerson, 'active'>;
  quote: string;
  underlines: Range[];
  question: string;
  totals: DebateTotals;
  answerCount: number;
  topLine: { nickname: string | null; body: string; kind: 'most_moved' | 'newest' } | null;
  summaryFirstLine: string | null;
  closedAt: string | null;
  lastActivityAt: string;
}

export interface DebateMover {
  nickname: string;
  tag: string;
  profileImage: string | null;
  isFriend: boolean;
}
