import type { ReactNode } from 'react';

import { ScreenFrame } from '@/components/screen-frame';

type MenuScreenProps = {
  /** Shown in the green pill at the top of the screen. */
  title: string;
  children?: ReactNode;
  /** Drawn between the backdrop and the content, e.g. a full-bleed map. */
  background?: ReactNode;
  /** Let taps reach an interactive `background` where no control sits. */
  contentPointerEvents?: 'auto' | 'box-none';
};

/** Shared chrome for the bottom-menu screens: gradient backdrop and the green title pill. */
export function MenuScreen({ title, children, background, contentPointerEvents }: MenuScreenProps) {
  return (
    <ScreenFrame title={title} background={background} contentPointerEvents={contentPointerEvents}>
      {children}
    </ScreenFrame>
  );
}
