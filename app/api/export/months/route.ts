import { NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api/auth';
import { getServerUser } from '@/lib/supabase/getServerUser';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { exportHeaders } from '@/lib/export/server';

/** 기록이 있는 달 — 최신 달 먼저, 개수만 */
export async function GET() {
  const {
    data: { user },
    error: authError,
  } = await getServerUser();
  if (authError || !user) return unauthorized(exportHeaders);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_entry_months');
  if (error) {
    console.error('Entry months unavailable:', error.code);
    return NextResponse.json(
      { error: '기록이 있는 달을 불러오지 못했어요.' },
      { status: 500, headers: exportHeaders }
    );
  }
  return NextResponse.json(
    { months: (data ?? []).map((row) => ({ month: row.month, entryCount: row.entry_count })) },
    { headers: exportHeaders }
  );
}
