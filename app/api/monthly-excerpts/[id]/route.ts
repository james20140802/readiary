import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { badRequest, excerptHeaders, rpcFailure } from '@/lib/monthly-excerpt/errors';
import { isUuid } from '@/lib/share/validation';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type Context = { params: Promise<{ id: string }> };

/** 친구에게 보여 주기 / 나만 보기 */
export async function PATCH(request: Request, { params }: Context) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const { id } = await params;
  if (!isUuid(id)) return badRequest('발췌집을 확인해 주세요.');
  const body = (await request.json().catch(() => null)) as { isShared?: unknown } | null;
  if (typeof body?.isShared !== 'boolean') return badRequest('공개 범위를 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_monthly_excerpt_shared', {
    p_id: id,
    p_is_shared: body.isShared,
  });
  if (error) return rpcFailure(error, '공개 범위를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  return NextResponse.json({ ok: true }, { headers: excerptHeaders });
}

/** 발췌집 지우기. 문장은 기록에 그대로 남는다. 소유자 RLS가 남의 것을 막는다. */
export async function DELETE(_request: Request, { params }: Context) {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(excerptHeaders);

  const { id } = await params;
  if (!isUuid(id)) return badRequest('발췌집을 확인해 주세요.');

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('monthly_excerpts')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) return rpcFailure(error, '발췌집을 지우지 못했어요. 잠시 뒤 다시 시도해 주세요.');
  if (!data || data.length === 0) return rpcFailure({ message: 'not_found' }, '');
  return new NextResponse(null, { status: 204, headers: excerptHeaders });
}
