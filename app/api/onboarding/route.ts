import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { classifyProfileInsertError } from '@/lib/onboarding/classifyProfileInsertError';
import { validateNickname } from '@/lib/profile/nickname';

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { name, nickname, tag, bio } = body;

    if (!name || !nickname || !tag) {
      return NextResponse.json({ error: '이름과 닉네임을 입력해주세요.' }, { status: 400 });
    }

    // 클라이언트(OnboardingForm)와 같은 규칙 — 하이픈 등이 섞인 닉네임은 친구 라우트 슬러그 파싱을 깨뜨린다
    const nicknameError = validateNickname(String(nickname));
    if (nicknameError) {
      return NextResponse.json({ error: nicknameError }, { status: 400 });
    }

    const { data, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name,
        nickname,
        tag,
        bio: bio ?? null,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      const kind = classifyProfileInsertError(insertError);
      if (kind === 'profile_exists') {
        return NextResponse.json(
          { code: 'profile_exists', error: '이미 프로필이 존재합니다.' },
          { status: 409 }
        );
      }
      if (kind === 'tag_conflict') {
        return NextResponse.json(
          { code: 'tag_conflict', error: '같은 닉네임과 태그 조합이 이미 있습니다.' },
          { status: 409 }
        );
      }
      console.error('[ONBOARDING INSERT ERROR]', { insertError, hasData: !!data });
      return NextResponse.json({ error: '프로필 등록에 실패했습니다.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ONBOARDING ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
