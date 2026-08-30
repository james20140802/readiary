import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청 본문입니다.' }, { status: 400 });
  }

  const { ids, clearOlderThan } = body as { ids?: unknown; clearOlderThan?: unknown };
  const hasIds = ids !== undefined;
  if (hasIds && (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string'))) {
    return NextResponse.json({ error: 'ids는 문자열 배열이어야 합니다.' }, { status: 400 });
  }

  const hasClearOlderThan = clearOlderThan !== undefined;
  if (
    hasClearOlderThan &&
    (typeof clearOlderThan !== 'string' || Number.isNaN(Date.parse(clearOlderThan)))
  ) {
    return NextResponse.json(
      { error: 'clearOlderThan은 파싱 가능한 날짜 문자열이어야 합니다.' },
      { status: 400 }
    );
  }

  if (!hasIds && !hasClearOlderThan) {
    return NextResponse.json({ error: 'ids 또는 clearOlderThan이 필요합니다.' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();

  if (hasIds) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: nowIso })
      .eq('user_id', user.id)
      .in('id', ids as string[])
      .is('read_at', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (hasClearOlderThan) {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: nowIso })
      .eq('user_id', user.id)
      .lte('created_at', clearOlderThan as string)
      .is('read_at', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
