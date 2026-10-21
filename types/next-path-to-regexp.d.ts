// next-path-to-regexp.d.ts
/** Next가 redirects 규칙을 맞출 때 쓰는 path-to-regexp(v6) 중 테스트가 쓰는 부분 — lib/__tests__/routes.test.ts */
declare module 'next/dist/compiled/path-to-regexp' {
  export function match(
    path: string,
    options?: {
      strict?: boolean;
      sensitive?: boolean;
      delimiter?: string;
      decode?: (value: string) => string;
    }
  ): (pathname: string) => false | { path: string; params: Record<string, string | string[]> };

  export function compile(
    path: string,
    options?: { validate?: boolean }
  ): (params?: object) => string;
}
