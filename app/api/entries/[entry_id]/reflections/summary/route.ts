import { getReflectionFeature } from '@/lib/features/entry-reflections';
import { NextResponse } from 'next/server';
import { reflectionAccess, reflectionError, reflectionHeaders } from '@/lib/reflections/server';
export async function GET(request: Request, { params }: { params: Promise<{ entry_id: string }> }) {
  const { entry_id } = await params;
  const access = await reflectionAccess(entry_id, false, true);
  if (access.response) return access.response;
  const enabled = (await getReflectionFeature()).enabled;
  if (!enabled && !access.canWrite) return reflectionError('기록을 볼 수 없습니다.', 404);
  if (new URL(request.url).searchParams.get('publicOnly') === '1') {
    if (!access.canWrite) return reflectionError('기록을 볼 수 없습니다.', 404);
    const { count, error } = await access.supabase
      .from('entry_reflections')
      .select('id', { count: 'exact', head: true })
      .eq('entry_id', entry_id)
      .eq('is_private', false);
    if (error || count === null) return reflectionError('공개 범위를 확인하지 못했습니다.', 500);
    return NextResponse.json({ total: count, latest: null }, { headers: reflectionHeaders });
  }
  const { data, error } = await access.supabase.rpc('get_entry_reflection_summaries', {
    p_entry_ids: [entry_id],
  });
  if (error) return reflectionError('이어 남긴 생각을 불러오지 못했습니다.', 500);
  if (!data?.[0]) return reflectionError('기록을 볼 수 없습니다.', 404);
  return NextResponse.json(
    { total: Number(data[0].total), latest: enabled ? data[0].latest : null },
    { headers: reflectionHeaders }
  );
}
