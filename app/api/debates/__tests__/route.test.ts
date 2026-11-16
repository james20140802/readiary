import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GET as LIST, POST as CREATE } from '../route';
import { DELETE, GET, PATCH } from '../[id]/route';
import { GET as ANSWERS, POST as ANSWER } from '../[id]/answers/route';
import { DELETE as REOPEN, PUT as SUMMARIZE } from '../[id]/summary/route';
import { POST as REPORT } from '../[id]/report/route';
import { GET as ENTRY_COUNT } from '../../entries/[entry_id]/debates/route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));

const getUser = vi.fn();
const rpc = vi.fn();
const id = '10000000-0000-4000-8000-000000000001';
const entryId = '10000000-0000-4000-8000-000000000002';
const answerId = '10000000-0000-4000-8000-000000000003';
const ctx = (v: string) => ({ params: Promise.resolve({ id: v }) });
const req = (method: string, body?: unknown, url = 'http://localhost/x') =>
  new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

describe('POST /api/debates', () => {
  const body = { entryId, question: '가까워질수록?', underlines: [{ start: 0, end: 5 }] };

  it('발제를 RPC 한 번으로 올리고 id를 돌려준다', async () => {
    rpc.mockResolvedValue({ data: id, error: null });
    const res = await CREATE(req('POST', body));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id });
    expect(rpc).toHaveBeenCalledWith('create_debate', {
      p_entry_id: entryId,
      p_question: '가까워질수록?',
      p_underlines: [{ start: 0, end: 5 }],
    });
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('밑줄이 넷이면 RPC를 부르지 않는다', async () => {
    const four = [0, 3, 6, 9].map((s) => ({ start: s, end: s + 1 }));
    const res = await CREATE(req('POST', { ...body, underlines: four }));
    expect(res.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['entryId', { ...body, entryId: 'x' }],
    ['question type', { ...body, question: 3 }],
    ['long question', { ...body, question: '가'.repeat(501) }],
    ['underline shape', { ...body, underlines: [{ start: 'a', end: 1 }] }],
  ])('잘못된 %s는 400', async (_n, b) => {
    expect((await CREATE(req('POST', b))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('세션이 없으면 401 session_expired', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await CREATE(req('POST', body));
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('session_expired');
  });

  it('RPC 예외 이름을 독자의 말로 바꾼다', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'no_quote', code: 'P0001' } });
    const res = await CREATE(req('POST', body));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      code: 'no_quote',
      error: '문장이 있는 기록만 토론을 열 수 있어요.',
    });
  });

  it('알 수 없는 오류는 500, 본문 없이', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } });
    const res = await CREATE(req('POST', body));
    expect(res.status).toBe(500);
    expect((await res.json()).code).toBeUndefined();
  });
});

describe('GET /api/debates', () => {
  it('목록 쪽을 부른다', async () => {
    rpc.mockResolvedValue({ data: { items: [], next_before: null }, error: null });
    const res = await LIST(
      req('GET', undefined, 'http://localhost/api/debates?closed=1&before=2026-11-17T00:00:00.000Z')
    );
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('list_debates', {
      p_closed: true,
      p_before: '2026-11-17T00:00:00.000Z',
      p_limit: 10,
    });
  });
  it('잘못된 before는 400', async () => {
    const res = await LIST(req('GET', undefined, 'http://localhost/api/debates?before=nope'));
    expect(res.status).toBe(400);
  });
});

describe('/api/debates/[id]', () => {
  it('없거나 볼 수 없으면 404', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'not_found', code: 'P0001' } });
    const res = await GET(req('GET'), ctx(id));
    expect(res.status).toBe(404);
  });
  it('잘못된 id는 400', async () => {
    expect((await GET(req('GET'), ctx('nope'))).status).toBe(400);
  });
  it('질문 고치기', async () => {
    const res = await PATCH(req('PATCH', { question: ' 새 질문 ' }), ctx(id));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('update_debate_question', {
      p_id: id,
      p_question: ' 새 질문 ',
    });
  });
  it('지우기', async () => {
    const res = await DELETE(req('DELETE'), ctx(id));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('delete_debate', { p_id: id });
  });
});

describe('/api/debates/[id]/answers', () => {
  it('답을 남긴다', async () => {
    rpc.mockResolvedValue({ data: answerId, error: null });
    const res = await ANSWER(
      req('POST', { underline: 2, stance: 'differ', body: '답', evidenceEntryId: null }),
      ctx(id)
    );
    expect(res.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('add_debate_answer', {
      p_debate_id: id,
      p_underline: 2,
      p_stance: 'differ',
      p_body: '답',
      p_evidence_entry_id: null,
    });
  });
  it('입장이 없으면 400', async () => {
    const res = await ANSWER(req('POST', { underline: null, stance: 'love', body: 'x' }), ctx(id));
    expect(res.status).toBe(400);
  });
  it('정리된 토론이면 409 closed', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'closed', code: 'P0001' } });
    const res = await ANSWER(req('POST', { underline: null, stance: 'agree', body: 'x' }), ctx(id));
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('closed');
  });
  it('단락 쪽: 밑줄 번호와 문장 전체', async () => {
    rpc.mockResolvedValue({ data: { answers: [], next: null }, error: null });
    await ANSWERS(req('GET', undefined, 'http://localhost/x?position=2&after=4'), ctx(id));
    expect(rpc).toHaveBeenLastCalledWith('get_debate_answers', {
      p_id: id,
      p_position: 2,
      p_all_sentence: false,
      p_after: 4,
      p_limit: 10,
    });
    await ANSWERS(req('GET', undefined, 'http://localhost/x?whole=1'), ctx(id));
    expect(rpc).toHaveBeenLastCalledWith('get_debate_answers', {
      p_id: id,
      p_position: null,
      p_all_sentence: true,
      p_after: 0,
      p_limit: 10,
    });
  });
});

describe('정리·신고·기록의 토론 수', () => {
  it('정리', async () => {
    const res = await SUMMARIZE(req('PUT', { body: '정리', pins: [answerId] }), ctx(id));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('set_debate_summary', {
      p_id: id,
      p_summary: '정리',
      p_answer_ids: [answerId],
    });
  });
  it('짚기 셋은 400', async () => {
    const res = await SUMMARIZE(
      req('PUT', { body: '정리', pins: [answerId, answerId, answerId] }),
      ctx(id)
    );
    expect(res.status).toBe(400);
  });
  it('다시 열기', async () => {
    await REOPEN(req('DELETE'), ctx(id));
    expect(rpc).toHaveBeenCalledWith('clear_debate_summary', { p_id: id });
  });
  it('신고와 이미 신고함', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    const ok = await REPORT(req('POST', { answerId, reason: 'spam', memo: null }), ctx(id));
    expect(ok.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('report_debate', {
      p_debate_id: id,
      p_answer_id: answerId,
      p_reason: 'spam',
      p_memo: null,
    });
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'already_reported', code: 'P0001' },
    });
    const again = await REPORT(req('POST', { answerId, reason: 'spam' }), ctx(id));
    expect(again.status).toBe(409);
  });
  it('기록으로 연 토론 수', async () => {
    rpc.mockResolvedValue({ data: 2, error: null });
    const res = await ENTRY_COUNT(req('GET'), { params: Promise.resolve({ entry_id: entryId }) });
    expect(await res.json()).toEqual({ count: 2 });
    expect(rpc).toHaveBeenCalledWith('count_entry_debates', { p_entry_id: entryId });
  });
});
