// @vitest-environment jsdom
import { StrictMode, createElement as h } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '@/lib/api/fetch';
import { preparePhoto } from '@/lib/photo-quote/image';
import PhotoQuoteButton, { forgetPhotoTextConsent } from '../PhotoQuoteButton';

vi.mock('@/lib/api/fetch', () => ({
  apiFetch: vi.fn(),
  SessionExpiredError: class SessionExpiredError extends Error {},
}));
vi.mock('@/lib/photo-quote/image', async (original) => ({
  ...(await original<typeof import('@/lib/photo-quote/image')>()),
  preparePhoto: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

let finePointer = false;
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: query.includes('pointer: fine') ? finePointer : false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  onchange: null,
  dispatchEvent: () => false,
}));

const WORDS = [
  { text: '책을', box: [10, 10, 60, 30], sep: ' ' },
  { text: '읽는', box: [70, 10, 120, 30], sep: ' ' },
  { text: '일', box: [130, 10, 180, 30], sep: '' },
];
const BLOB = new Blob(['jpeg'], { type: 'image/jpeg' });
const FILE = new File(['raw'], 'page.jpg', { type: 'image/jpeg' });

type Reply = { status?: number; body: unknown };
/** 경로별 응답을 차례로 돌려준다 */
function serve(routes: Record<string, Reply[]>) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.mocked(apiFetch).mockImplementation(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ url, method, body: init?.body });
    const queue = routes[`${method} ${url}`];
    if (!queue?.length) throw new Error(`unexpected ${method} ${url}`);
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    return Response.json(reply.body, { status: reply.status ?? 200 });
  });
  return calls;
}

const consented = { 'GET /api/photo-text/consent': [{ body: { consented: true } }] };
const revoke = vi.fn();

beforeEach(() => {
  finePointer = false;
  forgetPhotoTextConsent();
  vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', 'true');
  vi.mocked(preparePhoto).mockResolvedValue({
    blob: BLOB,
    url: 'blob:photo',
    width: 300,
    height: 400,
  });
  URL.revokeObjectURL = revoke;
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function setup() {
  const onText = vi.fn();
  const view = render(h(PhotoQuoteButton, { onText }));
  return { ...view, onText };
}

const open = () => fireEvent.click(screen.getByRole('button', { name: '사진으로 옮기기' }));

/** 사진 받기 시트에서 앨범 입력으로 사진을 고른다 */
async function choosePhoto() {
  const pick = await screen.findByRole('button', { name: '앨범에서 고르기' });
  const input = pick.parentElement!.querySelector('input[type="file"]:not([capture])')!;
  fireEvent.change(input, { target: { files: [FILE] } });
}

describe('PhotoQuoteButton', () => {
  it('기능이 꺼져 있으면 아무것도 그리지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_PHOTO_QUOTE_ENABLED', '');
    const { container } = setup();
    expect(container.innerHTML).toBe('');
  });

  it('처음이면 동의를 먼저 묻고, 취소하면 사진을 받지도 동의를 남기지도 않는다', async () => {
    const calls = serve({ 'GET /api/photo-text/consent': [{ body: { consented: false } }] });
    setup();
    open();
    expect(await screen.findByText('사진 속 글자를 읽으려면')).toBeTruthy();
    expect(screen.getByText(/Google\(미국\)의 서버로 전송됩니다/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(screen.queryByText('사진 속 글자를 읽으려면')).toBeNull());
    expect(screen.queryByRole('button', { name: '앨범에서 고르기' })).toBeNull();
    expect(calls.filter((c) => c.method === 'POST')).toEqual([]);
  });

  it('동의하고 계속하면 동의를 남긴 뒤 사진 받기를 연다', async () => {
    const calls = serve({
      'GET /api/photo-text/consent': [{ body: { consented: false } }],
      'POST /api/photo-text/consent': [{ body: { consented: true } }],
    });
    setup();
    open();
    fireEvent.click(await screen.findByRole('button', { name: '동의하고 계속' }));
    expect(await screen.findByRole('button', { name: '사진 찍기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '앨범에서 고르기' })).toBeTruthy();
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'GET /api/photo-text/consent',
      'POST /api/photo-text/consent',
    ]);
  });

  it('동의를 남기지 못하면 사진 받기로 넘어가지 않는다', async () => {
    serve({
      'GET /api/photo-text/consent': [{ body: { consented: false } }],
      'POST /api/photo-text/consent': [{ status: 503, body: { error: 'x' } }],
    });
    setup();
    open();
    fireEvent.click(await screen.findByRole('button', { name: '동의하고 계속' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '앨범에서 고르기' })).toBeNull();
  });

  it('사진 찍기는 뒤 카메라를, 앨범은 카메라 없이 연다', async () => {
    serve(consented);
    setup();
    open();
    const shoot = await screen.findByRole('button', { name: '사진 찍기' });
    const inputs = [...shoot.parentElement!.querySelectorAll('input[type="file"]')];
    expect(inputs.map((i) => i.getAttribute('capture'))).toEqual(['environment', null]);
    expect(inputs.every((i) => i.getAttribute('accept')?.includes('image/*'))).toBe(true);
  });

  it('읽은 글 전체를 가져온다 — 드래그 없이 키보드만으로 되는 길', async () => {
    const calls = serve({
      ...consented,
      'POST /api/photo-text': [{ body: { width: 300, height: 400, words: WORDS } }],
    });
    const { onText } = setup();
    open();
    await choosePhoto();
    const use = await screen.findByRole('button', { name: '이 문장 쓰기' });
    await screen.findByText('첫 낱말을 길게 누른 채 끝까지 끌어 보세요');
    expect((use as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '전부 가져오기' }));
    expect(onText).toHaveBeenCalledWith('책을 읽는 일');
    await waitFor(() => expect(screen.queryByRole('button', { name: '전부 가져오기' })).toBeNull());
    const sent = calls.find((c) => c.url === '/api/photo-text')!;
    expect(sent.body).toBe(BLOB);
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });

  it('고른 구간만 가져온다', async () => {
    finePointer = true;
    serve({
      ...consented,
      'POST /api/photo-text': [{ body: { width: 300, height: 400, words: WORDS } }],
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 300,
      bottom: 400,
      width: 300,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const { onText } = setup();
    open();
    const pick = await screen.findByRole('button', { name: '사진 고르기' });
    fireEvent.change(pick.parentElement!.querySelector('input[type="file"]')!, {
      target: { files: [FILE] },
    });
    await screen.findByText('첫 낱말에서 끝 낱말까지 끌어 보세요');
    const stage = screen.getByRole('application');
    const at = (x: number) => ({
      clientX: x,
      clientY: 20,
      pointerType: 'mouse',
      pointerId: 1,
      button: 0,
    });
    fireEvent.pointerDown(stage, at(80));
    fireEvent.pointerMove(stage, at(150));
    fireEvent.pointerUp(stage, at(150));
    fireEvent.click(screen.getByRole('button', { name: '이 문장 쓰기' }));
    expect(onText).toHaveBeenCalledWith('읽는 일');
    vi.restoreAllMocks();
  });

  it('글자가 없는 사진은 가져올 것이 없다고 알린다', async () => {
    serve({ ...consented, 'POST /api/photo-text': [{ body: { width: 0, height: 0, words: [] } }] });
    setup();
    open();
    await choosePhoto();
    expect(
      await screen.findByText('이 사진에서 글자를 찾지 못했어요. 더 밝은 곳에서 다시 찍어 보세요.')
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: '이 문장 쓰기' }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(
      (screen.getByRole('button', { name: '전부 가져오기' }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('하루 한도를 넘으면 내일 다시 쓸 수 있다고 알린다', async () => {
    serve({
      ...consented,
      'POST /api/photo-text': [{ status: 429, body: { code: 'daily_limit' } }],
    });
    setup();
    open();
    await choosePhoto();
    expect(
      await screen.findByText('오늘은 사진을 더 읽을 수 없어요. 내일 다시 쓸 수 있어요.')
    ).toBeTruthy();
  });

  it('읽기에 실패하면 같은 사진으로 다시 시도할 수 있다', async () => {
    const calls = serve({
      ...consented,
      'POST /api/photo-text': [
        { status: 502, body: { code: 'read_failed' } },
        { body: { width: 300, height: 400, words: WORDS } },
      ],
    });
    setup();
    open();
    await choosePhoto();
    expect(await screen.findByText('글자를 읽지 못했어요.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('첫 낱말을 길게 누른 채 끝까지 끌어 보세요');
    expect(calls.filter((c) => c.url === '/api/photo-text').map((c) => c.body)).toEqual([
      BLOB,
      BLOB,
    ]);
    expect(preparePhoto).toHaveBeenCalledTimes(1);
  });

  it('열 수 없는 사진은 다른 사진을 고르라고 알리고 서버로 보내지 않는다', async () => {
    const { PhotoOpenError } = await import('@/lib/photo-quote/image');
    vi.mocked(preparePhoto).mockRejectedValue(new PhotoOpenError());
    const calls = serve(consented);
    setup();
    open();
    await choosePhoto();
    expect(
      await screen.findByText('이 사진을 열지 못했어요. 다른 사진으로 다시 골라 주세요.')
    ).toBeTruthy();
    expect(calls.some((c) => c.url === '/api/photo-text')).toBe(false);
  });

  it('다른 기기에서 동의를 철회했으면 사진을 닫고 다시 동의를 묻는다', async () => {
    serve({
      ...consented,
      'POST /api/photo-text': [{ status: 403, body: { code: 'consent_required' } }],
    });
    const { onText } = setup();
    open();
    await choosePhoto();
    expect(await screen.findByText('사진 속 글자를 읽으려면')).toBeTruthy();
    expect(screen.queryByRole('application')).toBeNull();
    expect(onText).not.toHaveBeenCalled();
  });

  it('닫으면 아무것도 넣지 않고 사진을 놓는다', async () => {
    serve({
      ...consented,
      'POST /api/photo-text': [{ body: { width: 300, height: 400, words: WORDS } }],
    });
    const { onText } = setup();
    open();
    await choosePhoto();
    await screen.findByText('첫 낱말을 길게 누른 채 끝까지 끌어 보세요');
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('application')).toBeNull());
    expect(onText).not.toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:photo');
  });

  it('화면이 두 번 그려져도(StrictMode) 사진은 한 번만 보낸다 — 하루 횟수를 두 번 쓰지 않는다', async () => {
    const calls = serve({
      ...consented,
      'POST /api/photo-text': [{ body: { width: 300, height: 400, words: WORDS } }],
    });
    render(h(StrictMode, null, h(PhotoQuoteButton, { onText: vi.fn() })));
    open();
    await choosePhoto();
    await screen.findByText('첫 낱말을 길게 누른 채 끝까지 끌어 보세요');
    expect(calls.filter((c) => c.url === '/api/photo-text')).toHaveLength(1);
  });

  it('동의 확인에 실패하면 사진을 받지 않는다', async () => {
    serve({ 'GET /api/photo-text/consent': [{ status: 503, body: { error: 'x' } }] });
    const { toast } = await import('sonner');
    setup();
    open();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '앨범에서 고르기' })).toBeNull();
    expect(screen.queryByText('사진 속 글자를 읽으려면')).toBeNull();
  });
});
