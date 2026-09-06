import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isAvatarPath } from '@/lib/profile/avatarPath';

const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
  Vary: 'Cookie',
};

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path');
  if (!path || !isAvatarPath(path)) return new Response(null, { status: 400, headers });
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return new Response(null, { status: 401, headers });

  // 저장하지 않았거나 삭제한 사진은 주소를 알아도 서비스에서 전달하지 않는다.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_image', path)
    .limit(1)
    .maybeSingle();
  if (profileError) return new Response(null, { status: 503, headers });
  if (!profile) return new Response(null, { status: 404, headers });

  const { data, error } = await supabase.storage.from('profiles').download(path);
  if (error || !data) return new Response(null, { status: 404, headers });
  if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(data.type)) {
    return new Response(null, { status: 415, headers });
  }
  return new Response(data, { headers: { ...headers, 'Content-Type': data.type } });
}
