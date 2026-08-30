import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // Fetch user profile from 'profiles' table (only when logged in)
  let profile: { id: string } | null = null;
  if (user) {
    const { data } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
    profile = data;
  }

  // 리다이렉트 응답에도 setAll이 실어둔 갱신 쿠키가 함께 가야 한다 — 버리면 토큰
  // 리프레시와 겹칠 때 브라우저에 구 쿠키가 남아 세션이 끊길 수 있다.
  const redirectWithAuthCookies = (url: URL) => {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  // Redirect to onboarding if profile is missing
  if (user && !profile && !request.nextUrl.pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return redirectWithAuthCookies(url);
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    (request.nextUrl.pathname.startsWith('/protected') ||
      request.nextUrl.pathname.startsWith('/onboarding'))
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (request.nextUrl.pathname.startsWith('/protected')) {
      url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);
    }
    return redirectWithAuthCookies(url);
  }

  if (
    user &&
    (request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/protected/dashboard';
    return redirectWithAuthCookies(url);
  }

  if (user && profile && request.nextUrl.pathname.startsWith('/onboarding')) {
    const url = request.nextUrl.clone();
    url.pathname = '/protected/dashboard';
    return redirectWithAuthCookies(url);
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
  matcher: ['/', '/login', '/signup', '/onboarding/:path*', '/protected/:path*'],
};
