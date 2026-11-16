import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { DELETE, PATCH } from '../[answerId]/route';
import { GET as REPLIES, POST as REPLY } from '../[answerId]/replies/route';
import { PUT as MOVE } from '../[answerId]/move/route';
import { PUT as HIDE } from '../[answerId]/hidden/route';
import { GET as MOVERS } from '../[answerId]/movers/route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/supabase/getServerUser', () => ({ getServerUser: () => getUser() }));

const getUser = vi.fn();
const rpc = vi.fn();
const answerId = '10000000-0000-4000-8000-000000000003';
const ctx = (v: string) => ({ params: Promise.resolve({ answerId: v }) });
const req = (method: string, body?: unknown) =>
  new Request('http://localhost/x', {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: 'me' } }, error: null });
  rpc.mockReset().mockResolvedValue({ data: null, error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ rpc } as never);
});

describe('/api/debate-answers/[answerId]', () => {
  it('생각이 바뀌었어요 켜기는 새 수를 돌려준다', async () => {
    rpc.mockResolvedValue({ data: 4, error: null });
    const res = await MOVE(req('PUT', { on: true }), ctx(answerId));
    expect(await res.json()).toEqual({ movedCount: 4 });
    expect(rpc).toHaveBeenCalledWith('set_debate_move', { p_answer_id: answerId, p_on: true });
  });
  it('자기 답이면 409 own_answer', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'own_answer', code: 'P0001' } });
    const res = await MOVE(req('PUT', { on: true }), ctx(answerId));
    expect(res.status).toBe(409);
  });
  it('on이 불리언이 아니면 400', async () => {
    expect((await MOVE(req('PUT', { on: 'yes' }), ctx(answerId))).status).toBe(400);
  });
  it('고치기(답글은 stance null)', async () => {
    await PATCH(req('PATCH', { stance: null, body: '고침' }), ctx(answerId));
    expect(rpc).toHaveBeenCalledWith('edit_debate_answer', {
      p_id: answerId,
      p_stance: null,
      p_body: '고침',
    });
  });
  it('지우기', async () => {
    await DELETE(req('DELETE'), ctx(answerId));
    expect(rpc).toHaveBeenCalledWith('delete_debate_answer', { p_id: answerId });
  });
  it('답글 남기기와 읽기', async () => {
    rpc.mockResolvedValueOnce({ data: 'r1', error: null });
    const res = await REPLY(req('POST', { body: '답글' }), ctx(answerId));
    expect(res.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('add_debate_reply', { p_answer_id: answerId, p_body: '답글' });
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await REPLIES(req('GET'), ctx(answerId));
    expect(rpc).toHaveBeenLastCalledWith('get_debate_replies', { p_answer_id: answerId });
  });
  it('답글에 답글은 422', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'nested_reply', code: 'P0001' } });
    expect((await REPLY(req('POST', { body: 'x' }), ctx(answerId))).status).toBe(422);
  });
  it('숨기기와 누른 사람', async () => {
    await HIDE(req('PUT', { hidden: true }), ctx(answerId));
    expect(rpc).toHaveBeenCalledWith('set_debate_answer_hidden', {
      p_answer_id: answerId,
      p_hidden: true,
    });
    rpc.mockResolvedValueOnce({ data: [], error: null });
    await MOVERS(req('GET'), ctx(answerId));
    expect(rpc).toHaveBeenLastCalledWith('get_debate_movers', { p_answer_id: answerId });
  });
  it('세션이 없으면 401', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await DELETE(req('DELETE'), ctx(answerId))).status).toBe(401);
  });
});
