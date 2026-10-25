/**
 * A finished two-step catch: the litter photo (Find) and the trash-can photo (Dispose).
 *
 * Kept in memory for this app session only, like the onboarding draft: relaunching the app
 * empties the gallery. Saving catches to the account belongs with the backend work.
 */
export type GalleryCatch = {
  id: string;
  findPhoto: string;
  disposePhoto: string;
  caughtAt: Date;
};

/** Every state transition the gallery accepts. */
export type GalleryAction = { type: 'add'; catch: GalleryCatch };

/** The gallery before any catch has been completed. */
export const EMPTY_GALLERY: readonly GalleryCatch[] = [];

/** Pure state transition; the React adapter in `gallery-provider.tsx` is the only caller. */
export function galleryReducer(
  gallery: readonly GalleryCatch[],
  action: GalleryAction,
): readonly GalleryCatch[] {
  switch (action.type) {
    case 'add':
      // Newest first, so the catch just completed is the first card in the gallery.
      return [action.catch, ...gallery];
  }
}
