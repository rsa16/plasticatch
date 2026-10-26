import {
  GALLERY_PAGE_SIZE,
  catchRecordsFromGallery,
  createGalleryCatchSource,
  type GalleryInvoke,
  type GalleryItem,
} from '@/features/my-catches/gallery-source';
import { sourceForSession } from '@/features/my-catches/query';

function item(overrides: Partial<GalleryItem> = {}): GalleryItem {
  return {
    catch_id: 'catch-1',
    username: 'cryptic',
    state_code: 'CA',
    verdict_at: '2026-10-20T10:00:00.000Z',
    find_photo_url: 'https://signed.example/find.jpg',
    dispose_photo_url: 'https://signed.example/dispose.jpg',
    is_own: true,
    ...overrides,
  };
}

describe('catchRecordsFromGallery', () => {
  it('maps the gallery contract onto catch records', () => {
    const [record] = catchRecordsFromGallery([item()]);

    expect(record).toMatchObject({
      id: 'catch-1',
      findPhoto: 'https://signed.example/find.jpg',
      disposePhoto: 'https://signed.example/dispose.jpg',
    });
    expect(record?.caughtAt).toStrictEqual(new Date('2026-10-20T10:00:00.000Z'));
    expect(record?.dateLabel).toBe(
      new Date('2026-10-20T10:00:00.000Z').toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
      }),
    );
  });

  it('keeps the server order rather than re-sorting', () => {
    const records = catchRecordsFromGallery([
      item({ catch_id: 'newest', verdict_at: '2026-10-22T10:00:00.000Z' }),
      item({ catch_id: 'middle', verdict_at: '2026-10-21T10:00:00.000Z' }),
      item({ catch_id: 'oldest', verdict_at: '2026-10-20T10:00:00.000Z' }),
    ]);

    expect(records.map((record) => record.id)).toStrictEqual(['newest', 'middle', 'oldest']);
  });

  it('drops an item that is missing a signed URL', () => {
    expect(
      catchRecordsFromGallery([item(), item({ catch_id: 'broken', find_photo_url: '' })]),
    ).toHaveLength(1);
  });
});

describe('gallery catch source', () => {
  it('asks for one page and maps the items', async () => {
    const invoke = jest.fn(async () => ({
      data: { items: [item()], next_cursor: null },
      error: null,
    })) as unknown as GalleryInvoke;
    const source = createGalleryCatchSource(invoke);

    const records = await source.list();

    expect(invoke).toHaveBeenCalledWith({ limit: GALLERY_PAGE_SIZE });
    expect(records).toHaveLength(1);
  });

  it('returns an empty list when the feed has no items', async () => {
    const source = createGalleryCatchSource(async () => ({ data: { items: [] }, error: null }));

    await expect(source.list()).resolves.toStrictEqual([]);
  });

  it('throws when the function fails', async () => {
    const source = createGalleryCatchSource(async () => ({
      data: null,
      error: { message: 'invalid_session' },
    }));

    await expect(source.list()).rejects.toThrow('gallery_feed_failed: invalid_session');
  });

  it('never fabricates a record on write', async () => {
    const source = createGalleryCatchSource(async () => ({ data: { items: [] }, error: null }));

    await expect(
      source.add({ findPhoto: 'find.jpg', disposePhoto: 'dispose.jpg' }),
    ).rejects.toThrow('gallery_feed_read_only');
  });
});

describe('sourceForSession', () => {
  it('uses the live feed only when signed in', () => {
    expect(sourceForSession(true).mode).toBe('live');
    expect(sourceForSession(false).mode).toBe('prototype');
  });

  it('lets a test supply its own source', () => {
    const fake = { list: async () => [], add: jest.fn() };

    expect(sourceForSession(true, fake)).toStrictEqual({ source: fake, mode: 'custom' });
  });
});
