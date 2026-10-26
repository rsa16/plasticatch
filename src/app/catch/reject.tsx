import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useCatchStore } from '@/features/catch';
import { FALLBACK_REJECTION } from '@/features/verification/rejection';
import { useTheme } from '@/theme';

/**
 * A rejected catch. The server's code maps to one plain-language reason and one retry half; the
 * retry preserves the Find photo when only the Dispose half needs replacing.
 */
export default function CatchRejectScreen() {
  const theme = useTheme();
  const rejection = useCatchStore((state) => state.rejection) ?? FALLBACK_REJECTION;
  const retry = useCatchStore((state) => state.retry);
  const reset = useCatchStore((state) => state.reset);

  function tryAgain() {
    retry(rejection.retry);
    router.replace(rejection.retry === 'find' ? '/catch/find' : '/catch/dispose');
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <View style={styles.message}>
        <View style={styles.iconRow}>
          <View style={[styles.icon, { backgroundColor: theme.color.accentTint }]}>
            <SymbolView
              name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
              tintColor={theme.color.danger}
              size={26}
            />
          </View>
        </View>

        <Text variant="display" accessibilityRole="header" style={styles.title}>
          Couldn&apos;t verify
        </Text>
        <Text variant="caption" tone="muted">
          No XP was awarded and nothing was added to Gallery.
        </Text>
        <Text variant="body" accessibilityRole="alert" style={styles.rejection}>
          {rejection.message}
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Try again" size="lg" onPress={tryAgain} />
        <Button
          label="Close"
          variant="ghost"
          onPress={() => {
            reset();
            router.dismissTo('/map');
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingVertical: 32,
  },
  message: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  rejection: {
    textAlign: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  title: {
    marginBottom: 4,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: 8,
  },
});
