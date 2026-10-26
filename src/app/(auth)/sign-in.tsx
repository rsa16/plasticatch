import { Image, type ImageSource, type ImageStyle } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View, type StyleProp } from 'react-native';

import { ActionButton, AuthCard, AuthField } from '@/components/auth-form';
import { Text } from '@/components/text';
import { BottomTabInset, Brand, Spacing } from '@/constants/theme';
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
    <View style={styles.screen}>
      <View style={styles.hero} pointerEvents="none">
        <View style={styles.heroImageFrame}>
          <Image
            source={require('@/assets/images/catch-hero.png')}
            style={styles.heroImage}
            contentFit="fill"
          />
        </View>
        <View style={styles.heroScrim} />
      </View>
      <View style={styles.bottomFade} pointerEvents="none" />

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
          <Text variant="displayTagline" style={styles.welcome}>
            - WELCOME -
          </Text>
        </View>

        <View style={styles.auth}>
          {stage === 'check-email' ? (
            <AuthCard>
              <Text variant="sectionTitle" accessibilityRole="header">
                Check your email
              </Text>
              <Text variant="caption">
                {`We sent a confirmation link to ${normalizeEmail(email)}. Open the link to finish signing in.`}
              </Text>
              {formError ? (
                <Text variant="caption" color="danger" accessibilityRole="alert">
                  {formError}
                </Text>
              ) : null}
              {notice ? (
                <Text variant="caption" color="accent">
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
                <Text variant="caption" color="accent">
                  Back to log in
                </Text>
              </Pressable>
            </AuthCard>
          ) : (
            <>
              <View style={styles.social}>
                <SignInButton
                  label="Sign in with Google"
                  icon={require('@/assets/images/google-logo.png')}
                  iconStyle={styles.googleIcon}
                  onPress={() => void handleGoogle()}
                  disabled={pending}
                />
                {/* Apple is not configured on the project, so the button stays visual-only. */}
                <SignInButton
                  label="Sign in with Apple"
                  icon={require('@/assets/images/apple-logo.png')}
                  iconStyle={styles.appleIcon}
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
                  <Text variant="caption" color="danger" accessibilityRole="alert">
                    {formError}
                  </Text>
                ) : null}
                {notice ? (
                  <Text variant="caption" color="accent">
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
                    <Text variant="caption" color="accent">
                      Forgot password?
                    </Text>
                  </Pressable>
                ) : (
                  <Text variant="caption">
                    We&apos;ll email you a link to confirm your address.
                  </Text>
                )}
              </AuthCard>
            </>
          )}
        </View>
      </ScrollView>
    </View>
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
      style={[styles.segment, selected && styles.segmentSelected]}
    >
      <Text variant="secondaryButtonLabel" color={selected ? 'surface' : 'onSurface'}>
        {label}
      </Text>
    </Pressable>
  );
}

type SignInButtonProps = {
  label: string;
  icon: ImageSource;
  iconStyle: StyleProp<ImageStyle>;
  onPress?: () => void;
  disabled?: boolean;
  hint?: string;
};

function SignInButton({
  label,
  icon,
  iconStyle,
  onPress,
  disabled = false,
  hint,
}: SignInButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={hint}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Image source={icon} style={iconStyle} contentFit="cover" />
      <Text variant="secondaryButtonLabel">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.green,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    aspectRatio: 393 / 416,
  },
  heroImageFrame: {
    width: '100%',
    aspectRatio: 393 / 411,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    left: '-30.51%',
    top: '-18.25%',
    width: '185.65%',
    height: '118.25%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: `linear-gradient(177.39deg, rgba(25, 51, 40, 0.44) 7.72%, rgba(25, 51, 40, 0.44) 53.69%, ${Brand.green} 97.93%)`,
  },
  bottomFade: {
    position: 'absolute',
    top: 424,
    left: 0,
    right: 0,
    bottom: 0,
    experimental_backgroundImage: `linear-gradient(to bottom, rgba(25, 51, 40, 0) 0%, ${Brand.greenDeep} 100%)`,
  },
  content: {
    alignItems: 'center',
    paddingTop: 273,
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
  social: {
    gap: Spacing.two,
  },
  segments: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: 12,
    backgroundColor: Brand.field,
    gap: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: 10,
  },
  segmentSelected: {
    backgroundColor: Brand.green,
  },
  linkButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.one,
  },
  button: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    padding: 10,
    borderRadius: 15,
    backgroundColor: Brand.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
  googleIcon: {
    width: 36,
    height: 36,
  },
  appleIcon: {
    width: 36,
    height: 42,
  },
});
