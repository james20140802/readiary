import { getReflectionFeature } from '@/lib/features/entry-reflections';
import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { unauthorized } from '@/lib/api/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { reflectionError, reflectionHeaders } from '@/lib/reflections/server';
import { uuidPattern } from '@/lib/reflections/types';
export async function GET(request: Request) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(reflectionHeaders);
  if (!(await getReflectionFeature()).enabled)
    return reflectionError('아직 사용할 수 없는 기능입니다.', 404);
  const ids = new URL(request.url).searchParams.get('ids')?.split(',') ?? [];
  if (!ids.length || ids.length > 100 || ids.some((id) => !uuidPattern.test(id)))
    return reflectionError('기록 목록을 확인해 주세요.', 400);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_entry_reflection_summaries', {
    p_entry_ids: ids,
  });
  if (error) return reflectionError('이어 남긴 생각을 불러오지 못했습니다.', 500);
  return NextResponse.json(
    Object.fromEntries(
      (data ?? []).map((row) => [row.entry_id, { total: Number(row.total), latest: row.latest }])
    ),
    { headers: reflectionHeaders }
  );
}
