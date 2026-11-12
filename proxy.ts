import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { profileState, type ProfileState } from '@/lib/auth/profilePresence';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirect';
import { ACCOUNT_RESTORE_PATH, HOME_PATH, isAppRoute } from '@/lib/routes';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Short-lived, server-only positive cache. Onboarding and the restore screen always read the source.
  // getUser above stays uncached so revoked/deleted sessions are checked immediately.
  const { pathname } = request.nextUrl;
  const onRestore = pathname === ACCOUNT_RESTORE_PATH;
  let state: ProfileState = 'missing';
  if (user) {
    try {
      state = await profileState(
        user.id,
        () =>
          supabase
            .from('profiles')
            .select('id, account_deletions(purge_after)')
            .eq('id', user.id)
            .maybeSingle(),
        pathname.startsWith('/onboarding') || onRestore,
        // 탈퇴 마이그레이션보다 앱이 먼저 배포돼도 임베드 실패로 모두가 503을 보지 않게 한다
        () => supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      );
    } catch {
      const response = new NextResponse(
        '일시적으로 프로필을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.',
        {
          status: 503,
          headers: { 'Cache-Control': 'no-store', 'Retry-After': '5' },
        }
      );
      supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
      return response;
    }
  }

  // 리다이렉트 응답에도 setAll이 실어둔 갱신 쿠키가 함께 가야 한다 — 버리면 토큰
  // 리프레시와 겹칠 때 브라우저에 구 쿠키가 남아 세션이 끊길 수 있다.
  const redirectWithAuthCookies = (url: URL) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    return redirectWithAuthCookies(url);
  };

  // 탈퇴 유예 중에는 복구 화면 말고는 앱·온보딩·첫 화면 어디로 와도 복구 화면으로 보낸다
  if (
    user &&
    state === 'pending' &&
    !onRestore &&
    (isAppRoute(pathname) ||
      pathname.startsWith('/onboarding') ||
      pathname === '/' ||
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup'))
  ) {
    return redirectTo(ACCOUNT_RESTORE_PATH);
  }

  // Redirect to onboarding if profile is missing
  if (user && state === 'missing' && !pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return redirectWithAuthCookies(url);
  }

  if (
    !user &&
    !pathname.startsWith('/login') &&
    !pathname.startsWith('/auth') &&
    (isAppRoute(pathname) || pathname.startsWith('/onboarding'))
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (isAppRoute(pathname)) {
      url.searchParams.set('redirect', pathname + request.nextUrl.search);
    }
    return redirectWithAuthCookies(url);
  }

  if (
    user &&
    (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup'))
  ) {
    // 이미 로그인한 채 /login?redirect=… 로 오면(초대 링크 재방문 등) 원래 목적지를 살린다
    const target = sanitizeRedirectPath(request.nextUrl.searchParams.get('redirect'));
    return redirectWithAuthCookies(new URL(target, request.url));
  }

  // 되살릴 것이 없는 독자는 복구 화면 대신 오늘로 간다
  if (user && state === 'active' && (pathname.startsWith('/onboarding') || onRestore)) {
    return redirectTo(HOME_PATH);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

export const config = {
  // /invite 는 보호 대상은 아니지만, 오래 방치된 세션으로 열릴 때가 많아 여기서 토큰을 갱신해야
  // 서버 컴포넌트의 getUser()가 만료 토큰으로 실패해 로그인으로 튕기지 않는다
  // 리터럴이어야 한다(Next가 정적으로 읽는다) — lib/routes.ts의 APP_ROUTE_PREFIXES와 맞춘다(테스트가 확인)
  matcher: [
    '/',
    '/login',
    '/signup/:path*',
    '/onboarding/:path*',
    '/invite/:path*',
    '/account/:path*',
    '/today/:path*',
    '/books/:path*',
    '/entry/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/social/:path*',
    '/search/:path*',
    '/notifications/:path*',
    '/pilsa/:path*',
    '/excerpts/:path*',
  ],
};
