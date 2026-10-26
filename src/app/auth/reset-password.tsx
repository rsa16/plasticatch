import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton, AuthCard, AuthField } from '@/components/auth-form';
import { Text } from '@/components/text';
import { Badge } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { PASSWORD_UPDATE_ERROR, useSessionStore, validateNewPassword } from '@/features/auth';

type ResetStage = 'form' | 'success';

/**
 * The new-password screen reached from a password-recovery link.
 *
 * The callback has already exchanged the recovery code for a session, so saving a password is
 * a single `updateUser` call. A missing session (or an `expired` marker from the callback)
 * means the link never produced a usable session: the player gets a plain "request a new
 * link" state instead of a form that cannot work.
 */
export default function ResetPasswordScreen() {
  const status = useSessionStore((state) => state.status);
  const recoverySession = useSessionStore((state) => state.recoverySession);
  const updatePassword = useSessionStore((state) => state.updatePassword);
  const params = useLocalSearchParams<{ state?: string | string[] }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState<ResetStage>('form');

  const stateParam = Array.isArray(params.state) ? params.state[0] : params.state;

  // Wait for the persisted session to resolve before deciding the link is unusable.
  if (status === 'loading') return null;

  // Only a session created by this recovery link may set a new password. An ordinary signed-in
  // session reaching this deep link must not work as a password-change backdoor.
  const linkExpired = stateParam === 'expired' || status !== 'signed-in' || !recoverySession;

  async function handleSubmit() {
    if (pending) return;

    const validation = validateNewPassword({ password, confirmPassword });
    if (validation) {
      setFormError(validation);
      return;
    }

    setPending(true);
    setFormError(null);

    try {
      const outcome = await updatePassword(password);

      if (outcome.status === 'error') {
        setFormError(outcome.message);
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setStage('success');
    } catch {
      setFormError(PASSWORD_UPDATE_ERROR);
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen hud>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleGroup}>
          <Badge label="Account recovery" tone="accent" />
        </View>

        <View style={styles.auth}>
          {linkExpired ? (
            <AuthCard>
              <Text variant="heading" accessibilityRole="header">
                Request a new link
              </Text>
              <Text variant="caption" tone="muted">
                This reset link has expired or has already been used. Open the sign-in screen and
                tap Forgot password? to request a new one.
              </Text>
              <ActionButton label="Back to sign in" onPress={() => router.replace('/sign-in')} />
            </AuthCard>
          ) : stage === 'success' ? (
            <AuthCard>
              <Text variant="heading" accessibilityRole="header">
                Password updated
              </Text>
              <Text variant="caption" tone="muted">
                Your new password is saved. Use it the next time you log in.
              </Text>
              <ActionButton label="Continue" onPress={() => router.replace('/')} />
            </AuthCard>
          ) : (
            <AuthCard>
              <Text variant="heading" accessibilityRole="header">
                Choose a new password
              </Text>
              <Text variant="caption" tone="muted">
                Pick a password you have not used before. You will log in with it from now on.
              </Text>
              <AuthField
                accessibilityLabel="New password"
                placeholder="New password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!pending}
              />
              <AuthField
                accessibilityLabel="Confirm new password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                editable={!pending}
                onSubmitEditing={() => void handleSubmit()}
              />

              {formError ? (
                <Text variant="caption" tone="danger" accessibilityRole="alert">
                  {formError}
                </Text>
              ) : null}

              <ActionButton
                label="Save new password"
                onPress={() => void handleSubmit()}
                disabled={pending}
              />
            </AuthCard>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 24,
  },
  titleGroup: {
    width: '100%',
    maxWidth: 342,
    alignItems: 'center',
    gap: 8,
  },
  auth: {
    width: '100%',
    maxWidth: 342,
  },
});
