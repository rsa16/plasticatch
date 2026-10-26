import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton, AuthCard, AuthField } from '@/components/auth-form';
import { BrandMark } from '@/components/brand-mark';
import { Text } from '@/components/text';
import { Screen } from '@/components/ui/screen';
import {
  GOOGLE_ERROR,
  RESEND_NOTICE,
  RESET_NOTICE,
  UNAVAILABLE_ERROR,
  normalizeEmail,
  postSignInRoute,
  useSessionStore,
  validateCredentials,
  type CredentialMode,
} from '@/features/auth';
import { admit, canContinueOnboarding } from '@/features/onboarding/age';
import { useOnboardingDraftStore } from '@/features/onboarding/draft';
import { markAgeVerified } from '@/features/onboarding/profile-service';
import { darkTheme } from '@/theme/tokens';

type AuthStage = 'form' | 'check-email';

export default function SignInScreen() {
  const signInWithGoogle = useSessionStore((state) => state.signInWithGoogle);
  const signInWithPassword = useSessionStore((state) => state.signInWithPassword);
  const signUpWithPassword = useSessionStore((state) => state.signUpWithPassword);
  const resendConfirmation = useSessionStore((state) => state.resendConfirmation);
  const resetPassword = useSessionStore((state) => state.resetPassword);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);

  const [mode, setMode] = useState<CredentialMode>('login');
  const [stage, setStage] = useState<AuthStage>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const draft = useOnboardingDraftStore();

  // The age gate admits before an account exists. A deep link straight to this route must not
  // become a way around it, so an unanswered or under-13 draft is sent back to the wheel.
  if (!canContinueOnboarding(draft, new Date())) {
    return <Redirect href="/date-of-birth" />;
  }

  // The age gate ran before this screen was reachable (Date of Birth routes here only when
  // it admits the player), so a successful sign-in continues into onboarding. An email
  // account is created by the same gate, never before it.
  async function finishSignIn() {
    const { dateOfBirth } = useOnboardingDraftStore.getState();

    if (dateOfBirth && admit(dateOfBirth, new Date())) {
      // A failure here is surfaced rather than ignored: the profile must not silently stay
      // unverified.
      const stamped = await markAgeVerified();

      if (!stamped.success) {
        Alert.alert(
          'Could not finish signing in',
          'Your age could not be recorded. Check your connection and try again.',
        );
        return;
      }
    }

    await refreshProfile();

    // Send the player to the first step they still owe. A complete profile goes to the entry
    // gate, which lands on the Map; a Google account that skipped onboarding resumes it here.
    router.replace(postSignInRoute(useSessionStore.getState().profile));
  }

  function switchMode(next: CredentialMode) {
    if (pending || next === mode) return;

    setMode(next);
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
    setNotice(null);
    setStage('form');
  }

  async function handleGoogle() {
    if (pending) return;
    setPending(true);
    setFormError(null);

    try {
      const outcome = await signInWithGoogle();

      if (outcome.status === 'success') {
        await finishSignIn();
      } else if (outcome.status === 'error') {
        // The provider's own text is never rendered.
        setFormError(GOOGLE_ERROR);
      }
    } catch {
      setFormError(GOOGLE_ERROR);
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit() {
    if (pending) return;

    const validation = validateCredentials(mode, { email, password, confirmPassword });
    if (validation) {
      setFormError(validation);
      return;
    }

    setPending(true);
    setFormError(null);
    setNotice(null);

    try {
      const address = normalizeEmail(email);
      const outcome =
        mode === 'login'
          ? await signInWithPassword(address, password)
          : await signUpWithPassword(address, password);

      if (outcome.status === 'confirmation_required') {
        setStage('check-email');
        return;
      }

      if (outcome.status === 'error') {
        setFormError(outcome.message);
        return;
      }

      await finishSignIn();
    } catch {
      setFormError(UNAVAILABLE_ERROR);
    } finally {
      setPending(false);
    }
  }

  async function handleForgotPassword() {
    if (pending) return;

    if (!normalizeEmail(email)) {
      setNotice(null);
      setFormError("Enter your email address and we'll send a reset link.");
      return;
    }

    setPending(true);
    setFormError(null);
    setNotice(null);

    try {
      const outcome = await resetPassword(normalizeEmail(email));

      // The store only fails when no request could be made, so an unknown address and a
      // known one land on the same notice.
      if (outcome.status === 'error') {
        setFormError(outcome.message);
        return;
      }

      setMode('login');
      setStage('form');
      setPassword('');
      setConfirmPassword('');
      setNotice(RESET_NOTICE);
    } catch {
      setFormError(UNAVAILABLE_ERROR);
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    if (pending) return;
    setPending(true);
    setFormError(null);

    try {
      const outcome = await resendConfirmation(normalizeEmail(email));

      if (outcome.status === 'error') {
        setFormError(outcome.message);
        return;
      }

      setNotice(RESEND_NOTICE);
    } catch {
      setFormError(UNAVAILABLE_ERROR);
    } finally {
      setPending(false);
    }
  }

  function backToLogin() {
    setStage('form');
    setMode('login');
    setPassword('');
    setConfirmPassword('');
    setFormError(null);
    setNotice(null);
  }

  return (
    <Screen
      hud
      background={
        <View style={styles.hero}>
          <Image
            source={require('@/assets/images/catch-hero.png')}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(7, 16, 11, 0.72)' }]} />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleGroup}>
          <BrandMark height={48} />
          <Text variant="caption" tone="muted" style={styles.tagline}>
            The more litter you collect, the more XP you get!
          </Text>
        </View>

        <View style={styles.auth}>
          {stage === 'check-email' ? (
            <AuthCard>
              <Text variant="heading" accessibilityRole="header">
                Check your email
              </Text>
              <Text variant="caption" tone="muted">
                {`We sent a confirmation link to ${normalizeEmail(email)}. Open the link to finish signing in.`}
              </Text>
              {formError ? (
                <Text variant="caption" tone="danger" accessibilityRole="alert">
                  {formError}
                </Text>
              ) : null}
              {notice ? (
                <Text variant="caption" tone="accent">
                  {notice}
                </Text>
              ) : null}
              <ActionButton
                label="Resend link"
                onPress={() => void handleResend()}
                disabled={pending}
              />
              <Pressable
                accessibilityRole="button"
                disabled={pending}
                onPress={backToLogin}
                style={styles.linkButton}
              >
                <Text variant="caption" tone="accent">
                  Back to log in
                </Text>
              </Pressable>
            </AuthCard>
          ) : (
            <>
              <View style={styles.social}>
                <SocialButton
                  label="Sign in with Google"
                  icon={require('@/assets/images/google-logo.png')}
                  iconSize={22}
                  onPress={() => void handleGoogle()}
                  disabled={pending}
                />
                {/* Apple is not configured on the project, so the button stays visual-only. */}
                <SocialButton
                  label="Sign in with Apple"
                  icon={require('@/assets/images/apple-logo.png')}
                  iconSize={24}
                  disabled
                  hint="Apple sign-in is not available yet."
                />
              </View>

              <AuthCard>
                <View style={styles.segments}>
                  <Segment
                    label="Log in"
                    selected={mode === 'login'}
                    onPress={() => switchMode('login')}
                    disabled={pending}
                  />
                  <Segment
                    label="Create account"
                    selected={mode === 'create'}
                    onPress={() => switchMode('create')}
                    disabled={pending}
                  />
                </View>

                <AuthField
                  accessibilityLabel="Email"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  editable={!pending}
                />
                <AuthField
                  accessibilityLabel="Password"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                  textContentType={mode === 'create' ? 'newPassword' : 'password'}
                  editable={!pending}
                />
                {mode === 'create' ? (
                  <AuthField
                    accessibilityLabel="Confirm password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    editable={!pending}
                    onSubmitEditing={() => void handleSubmit()}
                  />
                ) : null}

                {formError ? (
                  <Text variant="caption" tone="danger" accessibilityRole="alert">
                    {formError}
                  </Text>
                ) : null}
                {notice ? (
                  <Text variant="caption" tone="accent">
                    {notice}
                  </Text>
                ) : null}

                <ActionButton
                  label={mode === 'login' ? 'Log in' : 'Create account'}
                  onPress={() => void handleSubmit()}
                  disabled={pending}
                />

                {mode === 'login' ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={pending}
                    onPress={() => void handleForgotPassword()}
                    style={styles.linkButton}
                  >
                    <Text variant="caption" tone="accent">
                      Forgot password?
                    </Text>
                  </Pressable>
                ) : (
                  <Text variant="caption" tone="muted">
                    We&apos;ll email you a link to confirm your address.
                  </Text>
                )}
              </AuthCard>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Segment({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.segment, selected && { backgroundColor: darkTheme.color.accent }]}
    >
      <Text variant="label" tone={selected ? 'onAccent' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}

function SocialButton({
  label,
  icon,
  iconSize,
  onPress,
  disabled = false,
  hint,
}: {
  label: string;
  icon: number;
  iconSize: number;
  onPress?: () => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={hint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Image source={icon} style={{ width: iconSize, height: iconSize }} contentFit="contain" />
      <Text variant="label">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
  },
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
  tagline: {
    textAlign: 'center',
  },
  auth: {
    width: '100%',
    maxWidth: 342,
    gap: 12,
  },
  social: {
    gap: 8,
  },
  socialButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkTheme.color.line,
    backgroundColor: darkTheme.color.surface,
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: darkTheme.color.surfaceSunken,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    borderRadius: 10,
  },
  linkButton: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
});
