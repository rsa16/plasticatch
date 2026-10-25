import { EMPTY_GALLERY, galleryReducer, type GalleryCatch } from '@/features/gallery';

function aCatch(id: string): GalleryCatch {
  return {
    id,
    findPhoto: `${id}-find.jpg`,
    disposePhoto: `${id}-dispose.jpg`,
    caughtAt: new Date(2026, 6, 1),
  };
}

describe('gallery', () => {
  it('starts empty', () => {
    expect(EMPTY_GALLERY).toHaveLength(0);
  });

  it('keeps both photos of a finished catch', () => {
    const gallery = galleryReducer(EMPTY_GALLERY, { type: 'add', catch: aCatch('a') });

    expect(gallery).toStrictEqual([aCatch('a')]);
  });

  it('lists the newest catch first', () => {
    const first = galleryReducer(EMPTY_GALLERY, { type: 'add', catch: aCatch('a') });
    const second = galleryReducer(first, { type: 'add', catch: aCatch('b') });

    expect(second.map((c) => c.id)).toStrictEqual(['b', 'a']);
  });
});
