import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { Text } from '@/components/text';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { supportEmail } from '@/constants/legal';
import {
  REAUTH_WINDOW_MS,
  USERNAME_LESS_CONFIRMATION,
  canDeleteAccount,
  deleteAccount,
  invokeDeleteAccount,
  isReauthFresh,
  reauthMethodFor,
} from '@/features/account';
import { useSessionStore } from '@/features/auth';
import { useTheme } from '@/theme';

/**
 * Permanently delete the account.
 *
 * Two independent gates: the player proves they still hold the sign-in credential, then types
 * the exact username. Only then is the destructive control enabled. The server re-checks both.
 * Any failure leaves the player signed in, and Cancel never mutates anything.
 */
export default function DeleteAccountScreen() {
  const theme = useTheme();
  const profile = useSessionStore((state) => state.profile);
  const session = useSessionStore((state) => state.session);
  const signOut = useSessionStore((state) => state.signOut);
  const reauthenticateWithPassword = useSessionStore((state) => state.reauthenticateWithPassword);
  const reauthenticateWithGoogle = useSessionStore((state) => state.reauthenticateWithGoogle);
  const queryClient = useQueryClient();
  const barHeight = useBottomBarHeight();
  const support = supportEmail();

  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [reauthMark, setReauthMark] = useState<{ userId: string; at: number } | null>(null);
  const [reauthPending, setReauthPending] = useState(false);
  const [reauthNotice, setReauthNotice] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const username = profile?.username ?? null;
  const method = reauthMethodFor(session?.user ?? null);
  const reauthenticatedAt =
    reauthMark && reauthMark.userId === session?.user.id ? reauthMark.at : null;
  const reauthFresh = isReauthFresh(reauthenticatedAt);
  const ready = canDeleteAccount({ username, confirmation, reauthenticatedAt });

  // Drop the mark exactly when the server window closes, so the button disables itself even
  // if the screen is left open.
  useEffect(() => {
    if (reauthenticatedAt === null) return;

    const remaining = REAUTH_WINDOW_MS - (Date.now() - reauthenticatedAt);
    const timer = setTimeout(() => setReauthMark(null), Math.max(remaining, 0));
    return () => clearTimeout(timer);
  }, [reauthenticatedAt]);

  async function reauthenticate() {
    if (reauthPending || !method) return;

    setError(null);
    setReauthNotice(null);

    if (method === 'password' && !password) {
      setReauthNotice('Enter your password.');
      return;
    }

    setReauthPending(true);

    try {
      const outcome =
        method === 'password'
          ? await reauthenticateWithPassword(password)
          : await reauthenticateWithGoogle();

      if (outcome.status === 'success') {
        setPassword('');
        setReauthMark({ userId: session?.user.id ?? '', at: Date.now() });
        setReauthNotice('Signed in again. You have 5 minutes to finish deleting.');
        return;
      }

      if (outcome.status === 'cancelled') {
        setReauthNotice('Re-authentication was cancelled. Your account is unchanged.');
        return;
      }

      setError(outcome.message);
    } finally {
      setReauthPending(false);
    }
  }

  async function submit() {
    if (!ready || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      const outcome = await deleteAccount(
        { username, confirmation, reauthenticatedAt },
        { transport: invokeDeleteAccount },
      );

      if (outcome.status === 'success') {
        // The account is gone. Clear cached catches before ending the local session and
        // returning to the age gate.
        queryClient.clear();
        await signOut();
        router.replace('/');
        return;
      }

      if (outcome.status === 'reauth_required') setReauthMark(null);
      setError(outcome.message);
    } finally {
      setDeleting(false);
    }
  }

  const inputStyle = [
    theme.type.body,
    styles.input,
    {
      color: theme.color.ink,
      backgroundColor: theme.color.surfaceSunken,
      borderColor: theme.color.line,
    },
  ];

  return (
    <Screen title="Delete account" actions={<BackButton />}>
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card>
            <Text variant="heading">This permanently deletes your account</Text>
            <Text variant="body" tone="muted">
              Your profile, catches, photos and XP are removed. The photos are deleted from storage
              too. This happens immediately: there is no grace period and no undo.
            </Text>
            <Text variant="body" tone="muted">
              {support
                ? `There is no self-serve export. Email ${support} before deleting if you want a copy of your data.`
                : 'There is no self-serve export. Email support before deleting if you want a copy of your data.'}
            </Text>
            <Text variant="caption" tone="muted">
              If you cancel, nothing is removed and you stay signed in.
            </Text>
          </Card>

          <Text variant="heading" accessibilityRole="header">
            1. Re-authenticate
          </Text>

          {reauthFresh ? (
            <Text variant="caption" tone="accent" accessibilityLiveRegion="polite">
              Signed in again. Ready to delete for the next 5 minutes.
            </Text>
          ) : method === 'password' ? (
            <>
              <Text variant="body" tone="muted">
                Confirm your password to prove it is still you.
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                editable={!reauthPending}
                secureTextEntry
                style={inputStyle}
                accessibilityLabel="Password"
                autoComplete="current-password"
                textContentType="password"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
              <Button
                label={reauthPending ? 'Checking…' : 'Re-authenticate'}
                variant="secondary"
                onPress={reauthenticate}
                disabled={reauthPending}
              />
            </>
          ) : method === 'google' ? (
            <>
              <Text variant="body" tone="muted">
                Sign in with Google again so the server sees a fresh sign-in.
              </Text>
              <Button
                label={reauthPending ? 'Waiting…' : 'Continue with Google'}
                variant="secondary"
                onPress={reauthenticate}
                disabled={reauthPending}
              />
            </>
          ) : (
            <Text variant="body" tone="danger">
              We could not tell how this account signs in. Sign out and sign in again first.
            </Text>
          )}

          {reauthNotice && (
            <Text variant="caption" tone="accent" accessibilityLiveRegion="polite">
              {reauthNotice}
            </Text>
          )}

          <Text variant="heading" accessibilityRole="header">
            2. Confirm the deletion
          </Text>

          <Text variant="body" tone="muted">
            {username
              ? `Type ${username} exactly to confirm.`
              : `This account has no username. Type ${USERNAME_LESS_CONFIRMATION} to confirm.`}
          </Text>

          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            editable={!deleting}
            style={inputStyle}
            accessibilityLabel={
              username
                ? 'Type your username to confirm'
                : `Type ${USERNAME_LESS_CONFIRMATION} to confirm`
            }
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />

          {error && (
            <Text variant="caption" tone="danger" accessibilityLiveRegion="assertive">
              {error}
            </Text>
          )}

          <Button
            label={deleting ? 'Deleting…' : 'Delete my account'}
            variant="danger"
            size="lg"
            onPress={submit}
            disabled={!ready || deleting}
            accessibilityHint="Deletes your profile, catches, photos and XP. This cannot be undone."
          />
          <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
});
