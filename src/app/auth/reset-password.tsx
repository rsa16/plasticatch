import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Text } from '@/components/text';
import { BottomTabInset, Brand, Spacing, TextStyles } from '@/constants/theme';
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

  const linkExpired = stateParam === 'expired' || status !== 'signed-in';

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
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleGroup}>
          <Text variant="displayTitle" numberOfLines={1} adjustsFontSizeToFit>
            PlastiCatch
          </Text>
          <Image
            source={require('@/assets/images/catch-divider.svg')}
            style={styles.divider}
            contentFit="fill"
          />
          <Text
            variant="displayTagline"
            style={styles.welcome}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            - RESET PASSWORD -
          </Text>
        </View>

        <View style={styles.auth}>
          {linkExpired ? (
            <View style={styles.card}>
              <Text variant="sectionTitle" accessibilityRole="header">
                Request a new link
              </Text>
              <Text variant="caption">
                This reset link has expired or has already been used. Open the sign-in screen and
                tap Forgot password? to request a new one.
              </Text>
              <ActionButton label="Back to sign in" onPress={() => router.replace('/sign-in')} />
            </View>
          ) : stage === 'success' ? (
            <View style={styles.card}>
              <Text variant="sectionTitle" accessibilityRole="header">
                Password updated
              </Text>
              <Text variant="caption">
                Your new password is saved. Use it the next time you log in.
              </Text>
              <ActionButton label="Continue" onPress={() => router.replace('/')} />
            </View>
          ) : (
            <View style={styles.card}>
              <Text variant="sectionTitle" accessibilityRole="header">
                Choose a new password
              </Text>
              <Text variant="caption">
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
                <Text variant="caption" color="danger" accessibilityRole="alert">
                  {formError}
                </Text>
              ) : null}

              <ActionButton
                label="Save new password"
                onPress={() => void handleSubmit()}
                disabled={pending}
              />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text variant="buttonLabel">{label}</Text>
    </Pressable>
  );
}

function AuthField({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Brand.rowText}
      {...rest}
      style={[TextStyles.fieldText, styles.field, style]}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.green,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.five,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  titleGroup: {
    width: '100%',
    maxWidth: 342,
    alignItems: 'center',
    gap: 20,
  },
  divider: {
    width: 324.002,
    height: 5,
    maxWidth: '100%',
    // Figma lays the 5px stroke out in a 1px slot; keep the surrounding spacing the same.
    marginVertical: -2,
    transform: [{ rotate: '-0.18deg' }],
  },
  welcome: {
    textAlign: 'center',
  },
  auth: {
    width: '100%',
    maxWidth: 342,
    marginTop: 40,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.four,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    gap: Spacing.three,
  },
  field: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  action: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
