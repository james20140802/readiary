import { NextResponse } from 'next/server';
import { reflectionAccess, reflectionError, reflectionHeaders } from '@/lib/reflections/server';
import { uuidPattern, validReflectionBody } from '@/lib/reflections/types';
type Context = { params: Promise<{ entry_id: string; reflection_id: string }> };
export async function PATCH(request: Request, { params }: Context) {
  const { entry_id, reflection_id } = await params;
  const access = await reflectionAccess(entry_id, true);
  if (access.response) return access.response;
  const input = await request.json().catch(() => null);
  if (
    !uuidPattern.test(reflection_id) ||
    !input ||
    !validReflectionBody(input.body) ||
    typeof input.is_private !== 'boolean' ||
    typeof input.updated_at !== 'string' ||
    !Number.isFinite(Date.parse(input.updated_at))
  )
    return reflectionError('생각과 공개 범위를 확인해 주세요.', 400);
  const { supabase, entry } = access;
  const { data: current, error: readError } = await supabase
    .from('entry_reflections')
    .select('*')
    .eq('entry_id', entry_id)
    .eq('id', reflection_id)
    .maybeSingle();
  if (readError) return reflectionError('생각을 확인하지 못했습니다.', 500);
  if (!current) return reflectionError('생각을 볼 수 없습니다.', 404);
  if (!input.is_private && current.is_private && entry.is_private)
    return reflectionError('원문이 비공개이면 친구에게 공개할 수 없습니다.', 400);
  if (current.body === input.body.trim() && current.is_private === input.is_private)
    return NextResponse.json(current, { headers: reflectionHeaders });
  const { data, error } = await supabase
    .from('entry_reflections')
    .update({ body: input.body.trim(), is_private: input.is_private })
    .eq('entry_id', entry_id)
    .eq('id', reflection_id)
    .eq('updated_at', input.updated_at)
    .select('*')
    .maybeSingle();
  if (error) return reflectionError('생각을 고치지 못했습니다. 다시 확인해 주세요.', 500);
  if (!data)
    return reflectionError('다른 곳에서 수정된 생각입니다. 최신 내용을 확인해 주세요.', 409);
  return NextResponse.json(data, { headers: reflectionHeaders });
}
export async function DELETE(_request: Request, { params }: Context) {
  const { entry_id, reflection_id } = await params;
  const access = await reflectionAccess(entry_id, true);
  if (access.response) return access.response;
  if (!uuidPattern.test(reflection_id)) return reflectionError('생각을 볼 수 없습니다.', 404);
  const { error } = await access.supabase
    .from('entry_reflections')
    .delete()
    .eq('entry_id', entry_id)
    .eq('id', reflection_id);
  if (error) return reflectionError('생각을 지우지 못했습니다. 다시 시도해 주세요.', 500);
  return NextResponse.json({ success: true }, { headers: reflectionHeaders });
}
export async function GET(_request: Request, { params }: Context) {
  const { entry_id, reflection_id } = await params;
  const access = await reflectionAccess(entry_id, true);
  if (access.response) return access.response;
  if (!uuidPattern.test(reflection_id)) return reflectionError('생각을 볼 수 없습니다.', 404);
  const { data, error } = await access.supabase
    .from('entry_reflections')
    .select('id,entry_id,body,is_private,created_at,updated_at')
    .eq('entry_id', entry_id)
    .eq('id', reflection_id)
    .maybeSingle();
  if (error) return reflectionError('생각을 확인하지 못했습니다.', 500);
  if (!data) return reflectionError('생각을 볼 수 없습니다.', 404);
  return NextResponse.json(data, { headers: reflectionHeaders });
}
