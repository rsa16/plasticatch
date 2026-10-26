import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { supportEmail } from '@/constants/legal';
import { Brand, Spacing, TextStyles } from '@/constants/theme';
import {
  REAUTH_WINDOW_MS,
  canDeleteAccount,
  deleteAccount,
  invokeDeleteAccount,
  isReauthFresh,
  reauthMethodFor,
} from '@/features/account';
import { useSessionStore } from '@/features/auth';

/**
 * Permanently delete the account.
 *
 * Two independent gates: the player proves they still hold the sign-in credential, then types
 * the exact username. Only then is the destructive control enabled. The server re-checks both.
 * Any failure leaves the player signed in, and Cancel never mutates anything.
 */
export default function DeleteAccountScreen() {
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

  return (
    <MenuScreen title="DELETE ACCOUNT">
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <ScrollPane
          thumbHeight={104}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="prompt">This permanently deletes your account.</Text>

          <View style={styles.copy}>
            <Text variant="body">
              Your profile, catches, photos and XP are removed. The photos are deleted from storage
              too. This happens immediately: there is no grace period and no undo.
            </Text>
            <Text variant="body">
              {support
                ? `There is no self-serve export. Email ${support} before deleting if you want a copy of your data.`
                : 'There is no self-serve export. Email support before deleting if you want a copy of your data.'}
            </Text>
            <Text variant="body">If you cancel, nothing is removed and you stay signed in.</Text>
          </View>

          <Text variant="sectionTitle" accessibilityRole="header">
            1. Re-authenticate
          </Text>

          {reauthFresh ? (
            <Text variant="body" color="accent" accessibilityLiveRegion="polite">
              Signed in again. Ready to delete for the next 5 minutes.
            </Text>
          ) : method === 'password' ? (
            <>
              <Text variant="body">Confirm your password to prove it is still you.</Text>
              <View style={styles.field}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  editable={!reauthPending}
                  secureTextEntry
                  style={[TextStyles.fieldText, styles.input]}
                  accessibilityLabel="Password"
                  autoComplete="current-password"
                  textContentType="password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Re-authenticate with password"
                accessibilityState={{ disabled: reauthPending }}
                disabled={reauthPending}
                onPress={reauthenticate}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  reauthPending && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="buttonLabel">{reauthPending ? 'CHECKING…' : 'RE-AUTHENTICATE'}</Text>
              </Pressable>
            </>
          ) : method === 'google' ? (
            <>
              <Text variant="body">
                Sign in with Google again so the server sees a fresh sign-in.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Re-authenticate with Google"
                accessibilityState={{ disabled: reauthPending }}
                disabled={reauthPending}
                onPress={reauthenticate}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  reauthPending && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="buttonLabel">
                  {reauthPending ? 'WAITING…' : 'CONTINUE WITH GOOGLE'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text variant="body" color="danger">
              We could not tell how this account signs in. Sign out and sign in again first.
            </Text>
          )}

          {reauthNotice && (
            <Text variant="body" color="accent" accessibilityLiveRegion="polite">
              {reauthNotice}
            </Text>
          )}

          <Text variant="sectionTitle" accessibilityRole="header">
            2. Type your username
          </Text>

          <Text variant="body">
            {username
              ? `Type ${username} exactly to confirm.`
              : 'This account has no username to confirm.'}
          </Text>

          <View style={styles.field}>
            <TextInput
              value={confirmation}
              onChangeText={setConfirmation}
              editable={!deleting && Boolean(username)}
              style={[TextStyles.fieldText, styles.input]}
              accessibilityLabel="Type your username to confirm"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>

          {error && (
            <Text variant="body" color="danger" accessibilityLiveRegion="assertive">
              {error}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Permanently delete my account"
            accessibilityHint="Deletes your profile, catches, photos and XP. This cannot be undone."
            accessibilityState={{ disabled: !ready || deleting }}
            disabled={!ready || deleting}
            onPress={submit}
            style={({ pressed }) => [
              styles.deleteButton,
              (!ready || deleting) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text variant="buttonLabel">{deleting ? 'DELETING…' : 'DELETE MY ACCOUNT'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel and go back to settings"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            <Text variant="caption" color="accent">
              Cancel
            </Text>
          </Pressable>
        </ScrollPane>
      </View>
    </MenuScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    marginTop: Spacing.four,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: 18,
    paddingRight: 28,
    paddingBottom: Spacing.six,
  },
  copy: {
    gap: Spacing.two,
  },
  field: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  input: {
    paddingVertical: 10,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    minWidth: 180,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  deleteButton: {
    alignSelf: 'center',
    minWidth: 220,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 15,
    backgroundColor: Brand.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  cancel: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
