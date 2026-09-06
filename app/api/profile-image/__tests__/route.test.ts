import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getImageUrl } from '@/utils/profile';
import { GET } from '../route';

vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn() }));
const path = '11111111-1111-4111-8111-111111111111/photo.png';
const request = (value = path) =>
  new Request(`https://www.readiary.net/api/profile-image?path=${encodeURIComponent(value)}`);
function mock({
  signedIn = true,
  published = true,
  mime = 'image/png',
  downloadError = false,
} = {}) {
  const download = vi.fn().mockResolvedValue({
    data: new Blob(['photo'], { type: mime }),
    error: downloadError ? new Error('storage') : null,
  });
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: published ? { id: 'owner' } : null, error: null });
  const eq = vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ maybeSingle }) });
  const client = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: signedIn ? { id: 'viewer' } : null }, error: null }),
    },
    from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) }),
    storage: { from: vi.fn().mockReturnValue({ download }) },
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue(client as never);
  return { client, download, eq };
}

describe('authenticated profile images', () => {
  beforeEach(() => vi.clearAllMocks());
  it('generates only the session-authenticated route, never an external URL', () => {
    expect(getImageUrl(path)).toBe(`/api/profile-image?path=${encodeURIComponent(path)}`);
    expect(getImageUrl('https://example.com/tracker.png')).toBeNull();
    expect(getImageUrl(null)).toBeNull();
  });
  it.each(['../secret.png', `${path}/../../secret`, 'https://example.com/a.png', 'x/a.svg'])(
    'rejects unsafe path %s',
    async (value) => {
      expect((await GET(request(value))).status).toBe(400);
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
    }
  );
  it('denies anonymous access even with a known path', async () => {
    const { download } = mock({ signedIn: false });
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(download).not.toHaveBeenCalled();
  });
  it('does not serve an unreferenced or removed file', async () => {
    const { download } = mock({ published: false });
    expect((await GET(request())).status).toBe(404);
    expect(download).not.toHaveBeenCalled();
  });
  it('streams a current avatar only after authenticating and checking its profile reference', async () => {
    const { download, eq } = mock();
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('photo');
    expect(eq).toHaveBeenCalledWith('profile_image', path);
    expect(download).toHaveBeenCalledWith(path);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('vary')).toBe('Cookie');
    expect(response.headers.get('cross-origin-resource-policy')).toBe('same-origin');
  });
  it('does not serve active content or a failed download', async () => {
    mock({ mime: 'text/html' });
    expect((await GET(request())).status).toBe(415);
    mock({ downloadError: true });
    expect((await GET(request())).status).toBe(404);
  });
});
