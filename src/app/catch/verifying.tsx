import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useSessionStore } from '@/features/auth';
import { useCatchStore } from '@/features/catch';
import { MY_CATCHES_QUERY_KEY } from '@/features/my-catches';
import { VERIFIED_CATCHES_QUERY_KEY } from '@/features/profile';
import { rejectionFor } from '@/features/verification/rejection';
import { submitCatch } from '@/features/verification/submit';
import { useTheme } from '@/theme';
import { darkTheme } from '@/theme/tokens';

/**
 * The synchronous verification screen. The server owns the verdict and the XP ledger; this screen
 * only submits the two blurred captures, then routes to Success or Rejection.
 *
 * A network/server failure keeps the catch and offers Retry. Cancel is deliberately absent while
 * the request is in flight.
 */
export default function VerifyingScreen() {
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
        // The session profile is loaded at sign-in and the award happens on the server, so the
        // Settings stats would otherwise keep showing the XP, level and streak from before the
        // catch. Refresh both the profile and the Settings verified-catch count.
        void useSessionStore.getState().refreshProfile();
        void queryClient.invalidateQueries({ queryKey: VERIFIED_CATCHES_QUERY_KEY });
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
    <Screen hud contentStyle={styles.content}>
      <StatusBar style="light" />

      {failure ? (
        <Card style={styles.card}>
          <Text variant="display" accessibilityRole="alert" style={styles.title}>
            Couldn&apos;t check your catch
          </Text>
          <Text variant="body" tone="muted">
            {failure}
          </Text>
          <View style={styles.actions}>
            <Button
              label="Try again"
              size="lg"
              onPress={() => {
                void run();
              }}
              disabled={submitting}
            />
            <Button
              label="Close"
              variant="ghost"
              onPress={() => {
                reset();
                router.dismissTo('/map');
              }}
            />
          </View>
        </Card>
      ) : (
        <View style={styles.verifying}>
          <ActivityIndicator size="large" color={darkTheme.color.accent} />
          <Text variant="title" accessibilityRole="header" style={styles.title}>
            Verifying your catch
          </Text>
          <Text variant="body" tone="muted" style={styles.copy}>
            Checking both photos and adding up your XP. This takes a moment.
          </Text>
          <View style={styles.steps}>
            <Step done label="Catch photo uploaded" />
            <Step done label="Trash photo uploaded" />
            <Step label="Waiting for verification" />
          </View>
        </View>
      )}
    </Screen>
  );
}

function Step({ label, done = false }: { label: string; done?: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepDot,
          { backgroundColor: done ? theme.color.accent : theme.color.surfaceSunken },
        ]}
      />
      <Text variant="caption" tone={done ? 'default' : 'muted'}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 32,
  },
  card: {
    gap: 16,
  },
  verifying: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
    maxWidth: 300,
  },
  steps: {
    marginTop: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actions: {
    gap: 8,
  },
});
