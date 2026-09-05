import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { classifyProfileInsertError } from '@/lib/onboarding/classifyProfileInsertError';
import { validateNickname } from '@/lib/profile/nickname';
import { PENDING_REDIRECT_KEY, readPendingRedirect } from '@/lib/auth/pendingRedirect';
import {
  CONSENTED_AT_KEY,
  CONSENT_REQUIRED_MESSAGE,
  consentStamp,
  hasConsented,
} from '@/lib/auth/consent';

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

    const { name: rawName, nickname: rawNickname, tag, bio: rawBio, consent } = body;

    // 약관·개인정보 동의 없이는 프로필(개인정보)을 만들지 않는다 — 이메일 가입과 가입 화면 Google은
    // 표식을 갖고 오고, 로그인 화면 Google로 처음 온 사람은 온보딩 폼에서 동의해 consent: true 로 보낸다
    const consentedBefore = hasConsented(user.user_metadata);
    const consentedNow = consent === true;
    if (!consentedBefore && !consentedNow) {
      return NextResponse.json(
        { code: 'consent_required', error: CONSENT_REQUIRED_MESSAGE },
        { status: 400 }
      );
    }

    // 문자열이 아닌 값(배열 등)은 String()으로 눙치지 않고 거절한다 — 강제 변환된 값만 검증을
    // 통과하고 원본이 그대로 insert되면 서버 규칙이 무력해진다
    if (typeof rawName !== 'string' || typeof rawNickname !== 'string' || typeof tag !== 'string') {
      return NextResponse.json({ error: '이름과 닉네임을 입력해주세요.' }, { status: 400 });
    }

    // 앞뒤 공백은 뜻이 없다 — 공백만 친 이름은 빈 것으로, 빈 자기소개는 ''가 아니라 null로 남긴다
    const name = rawName.trim();
    const nickname = rawNickname.trim();
    const bio = typeof rawBio === 'string' && rawBio.trim() !== '' ? rawBio.trim() : null;

    if (!name || !nickname || !tag) {
      return NextResponse.json({ error: '이름과 닉네임을 입력해주세요.' }, { status: 400 });
    }

    // 클라이언트(OnboardingForm)와 같은 규칙 — 하이픈 등이 섞인 닉네임은 친구 라우트 슬러그 파싱을 깨뜨린다
    const nicknameError = validateNickname(nickname);
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
        bio,
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

    // 메타데이터 뒷정리 한 번에: 여기서 처음 동의했다면 표식을 남기고, 초대 링크로 가입한 사람이면
    // 가입 때 실어 둔 복귀 경로를 한 번 쓰고 비운다. 실패해도 등록은 끝났으니 성공으로 답한다
    // (표식이 안 남아도 프로필이 있으면 온보딩은 다시 열리지 않는다)
    const redirectTo = readPendingRedirect(user.user_metadata);
    const metadata: Record<string, string | null> = {};
    if (!consentedBefore) metadata[CONSENTED_AT_KEY] = consentStamp();
    if (redirectTo) metadata[PENDING_REDIRECT_KEY] = null;
    if (Object.keys(metadata).length > 0) {
      const { error: metadataError } = await supabase.auth.updateUser({ data: metadata });
      if (metadataError) {
        console.error('[ONBOARDING METADATA UPDATE ERROR]', metadataError);
      }
    }
    return NextResponse.json(redirectTo ? { success: true, redirectTo } : { success: true });
  } catch (err) {
    console.error('[ONBOARDING ERROR]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
