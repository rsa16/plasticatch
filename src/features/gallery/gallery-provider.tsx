import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { EMPTY_GALLERY, galleryReducer, type GalleryCatch } from './gallery';

/** What screens consume: the catches plus the action that adds one. */
export type GalleryStore = {
  catches: readonly GalleryCatch[];
  addCatch: (photos: { findPhoto: string; disposePhoto: string }) => void;
};

const GalleryContext = createContext<GalleryStore | null>(null);

let nextId = 0;

/**
 * Holds the finished catches for the lifetime of the app session. Mounted in the root layout,
 * above both the Catch flow that adds to it and the Gallery tab that shows it.
 */
export function GalleryProvider({ children }: { children: ReactNode }) {
  const [catches, dispatch] = useReducer(galleryReducer, EMPTY_GALLERY);

  const store = useMemo<GalleryStore>(
    () => ({
      catches,
      addCatch: ({ findPhoto, disposePhoto }) =>
        dispatch({
          type: 'add',
          catch: { id: `catch-${nextId++}`, findPhoto, disposePhoto, caughtAt: new Date() },
        }),
    }),
    [catches],
  );

  return <GalleryContext.Provider value={store}>{children}</GalleryContext.Provider>;
}

/** The finished catches. Throws outside the provider, which only the root layout mounts. */
export function useGallery(): GalleryStore {
  const store = useContext(GalleryContext);
  if (!store) {
    throw new Error('useGallery must be used inside GalleryProvider');
  }
  return store;
}
