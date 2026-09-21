import { NextResponse } from 'next/server';
import { reflectionAccess, reflectionError, reflectionHeaders } from '@/lib/reflections/server';
import {
  parseReflectionCursor,
  REFLECTION_PAGE_SIZE,
  validReflectionBody,
  uuidPattern,
} from '@/lib/reflections/types';
import type { ReflectionSummary } from '@/lib/reflections/types';
type Context = { params: Promise<{ entry_id: string }> };
const fields = 'id,entry_id,body,is_private,created_at,updated_at';
export async function GET(request: Request, { params }: Context) {
  const { entry_id } = await params;
  const access = await reflectionAccess(entry_id);
  if (access.response) return access.response;
  const { supabase, user, entry, canWrite } = access;
  const raw = new URL(request.url).searchParams.get('cursor');
  const cursor = parseReflectionCursor(raw);
  if (raw && !cursor) return reflectionError('불러올 위치를 확인해 주세요.', 400);
  let query = supabase
    .from('entry_reflections')
    .select(fields)
    .eq('entry_id', entry_id)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(REFLECTION_PAGE_SIZE + 1);
  if (cursor)
    query = query.or(
      `created_at.gt.${cursor.date},and(created_at.eq.${cursor.date},id.gt.${cursor.id})`
    );
  const [{ data, error }, { data: summaries, error: summaryError }] = await Promise.all([
    query,
    supabase.rpc('get_entry_reflection_summaries', { p_entry_ids: [entry_id] }),
  ]);
  if (error || summaryError) return reflectionError('이어 남긴 생각을 불러오지 못했습니다.', 500);
  const items = (data ?? []).slice(0, REFLECTION_PAGE_SIZE);
  const last = items.at(-1);
  const row = summaries?.[0];
  // Do not return a page without a currently visible original in the summary query.
  if (!row) return reflectionError('기록을 볼 수 없습니다.', 404);
  const summary: ReflectionSummary = {
    total: Number(row.total),
    latest: row.latest as ReflectionSummary['latest'],
  };
  return NextResponse.json(
    {
      items,
      nextCursor:
        (data?.length ?? 0) > REFLECTION_PAGE_SIZE && last
          ? JSON.stringify([last.created_at, last.id])
          : null,
      summary,
      canWrite,
      entryIsPrivate: entry.is_private,
      viewerId: user.id,
    },
    { headers: reflectionHeaders }
  );
}
export async function POST(request: Request, { params }: Context) {
  const { entry_id } = await params;
  const access = await reflectionAccess(entry_id, true);
  if (access.response) return access.response;
  const { supabase, entry } = access;
  const input = await request.json().catch(() => null);
  if (
    !input ||
    !uuidPattern.test(input.id) ||
    !validReflectionBody(input.body) ||
    typeof input.is_private !== 'boolean'
  )
    return reflectionError('생각을 1자 이상 10,000자 이내로 입력해 주세요.', 400);
  const { data: prior, error: priorError } = await supabase
    .from('entry_reflections')
    .select(fields)
    .eq('id', input.id)
    .eq('entry_id', entry_id)
    .maybeSingle();
  if (priorError)
    return reflectionError(
      '저장 결과를 확인하지 못했습니다. 같은 내용으로 다시 확인해 주세요.',
      500
    );
  if (prior) return NextResponse.json(prior, { headers: reflectionHeaders });
  if (!input.is_private && entry.is_private)
    return reflectionError('원문이 비공개이면 생각도 나만 볼 수 있습니다.', 400);
  const { data, error } = await supabase
    .from('entry_reflections')
    .insert({ id: input.id, entry_id, body: input.body.trim(), is_private: input.is_private })
    .select(fields)
    .single();
  if (!error) return NextResponse.json(data, { headers: reflectionHeaders, status: 201 });
  if (error.code === '23505') {
    const { data: existing, error: readError } = await supabase
      .from('entry_reflections')
      .select(fields)
      .eq('id', input.id)
      .eq('entry_id', entry_id)
      .maybeSingle();
    // A retry must never overwrite an existing (possibly edited) thought.
    if (!readError && existing) return NextResponse.json(existing, { headers: reflectionHeaders });
  }
  if (['23514', '42501'].includes(error.code))
    return reflectionError('공개 범위와 입력을 다시 확인해 주세요.', 400);
  return reflectionError('저장 결과를 확인하지 못했습니다. 같은 내용으로 다시 확인해 주세요.', 500);
}
