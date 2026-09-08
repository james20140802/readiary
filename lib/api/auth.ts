import { NextResponse } from 'next/server';

/** 사용자 세션 인증 실패. cron 자격 증명이나 외부 API의 401에는 사용하지 않는다. */
export function unauthorized(headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'private, no-store, max-age=0');
  return NextResponse.json(
    { error: 'Unauthorized', code: 'session_expired' },
    { status: 401, headers: responseHeaders }
  );
}
