import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { IconButton } from '@/components/ui/button';
import { useTheme } from '@/theme';

/** A chevron-left header action that returns to the previous screen. */
export function BackButton({ label = 'Back' }: { label?: string }) {
  const theme = useTheme();

  return (
    <IconButton label={label} onPress={() => router.back()}>
      <SymbolView
        name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
        size={20}
        tintColor={theme.color.ink}
      />
    </IconButton>
  );
}
