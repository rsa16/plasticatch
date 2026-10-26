import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth';
import { useCatchStore } from '@/features/catch';
import { MY_CATCHES_QUERY_KEY } from '@/features/my-catches';
import { rejectionFor } from '@/features/verification/rejection';
import { submitCatch } from '@/features/verification/submit';

/**
 * The synchronous verification screen. The server owns the verdict and the XP ledger; this screen
 * only submits the two blurred captures, then routes to Success or Rejection.
 *
 * A network/server failure keeps the catch and offers Retry. Cancel is deliberately absent while
 * the request is in flight.
 */
export default function VerifyingScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const find = useCatchStore((state) => state.find);
  const dispose = useCatchStore((state) => state.dispose);
  const ensureCatchId = useCatchStore((state) => state.ensureCatchId);
  const verified = useCatchStore((state) => state.verified);
  const rejected = useCatchStore((state) => state.rejected);
  const failed = useCatchStore((state) => state.failed);
  const failure = useCatchStore((state) => state.failure);
  const reset = useCatchStore((state) => state.reset);

  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async () => {
    if (inFlight.current || !find || !dispose) return;
    inFlight.current = true;
    setSubmitting(true);

    try {
      const userId = useSessionStore.getState().session?.user.id;
      if (!userId) throw new Error('sign_in_required');

      const catchId = ensureCatchId();
      const result = await submitCatch(catchId, { find, dispose }, { userId });

      if (result.verdict === 'verified') {
        verified(result);
        void queryClient.invalidateQueries({ queryKey: MY_CATCHES_QUERY_KEY });
        router.replace('/catch/success');
      } else {
        rejected(rejectionFor(result.rejectionCode, result.reason, result.retry));
        router.replace('/catch/reject');
      }
    } catch (error) {
      failed(
        error instanceof Error && error.message.includes('sign_in_required')
          ? 'Please sign in again to verify this catch.'
          : "We couldn't check your catch. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [dispose, ensureCatchId, failed, find, queryClient, rejected, verified]);

  // Submit once on entry. The ref guard also survives a StrictMode double-effect.
  useEffect(() => {
    void run();
  }, [run]);

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + Spacing.four }]}>
      <View style={styles.body}>
        {failure ? (
          <>
            <Text
              variant="sectionTitle"
              color="surface"
              style={styles.title}
              accessibilityRole="alert"
            >
              Couldn&apos;t check your catch
            </Text>
            <Text variant="fieldText" color="surface" style={styles.copy}>
              {failure}
            </Text>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => {
                  void run();
                }}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              >
                <Text variant="buttonLabel">TRY AGAIN</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  reset();
                  router.dismissTo('/map');
                }}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
              >
                <Text variant="buttonLabel">CLOSE</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={Brand.surface} />
            <Text
              variant="sectionTitle"
              color="surface"
              style={styles.title}
              accessibilityRole="header"
            >
              Verifying…
            </Text>
            <Text variant="fieldText" color="surface" style={styles.copy}>
              Checking your two photos and adding up your XP.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.green,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  body: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    marginTop: Spacing.three,
    gap: Spacing.two,
    alignItems: 'center',
  },
  primary: {
    minWidth: 220,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  secondary: {
    minWidth: 220,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
