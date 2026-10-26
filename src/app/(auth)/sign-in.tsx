import { Image, type ImageSource, type ImageStyle } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View, type StyleProp } from 'react-native';

import { Text } from '@/components/text';
import { BottomTabInset, Brand, Spacing } from '@/constants/theme';
import { useSessionStore } from '@/features/auth';

// `replace` keeps sign-in out of the history so users can't navigate back to it.
function continueToOnboarding() {
  router.replace('/date-of-birth');
}

export default function SignInScreen() {
  const signInWithGoogle = useSessionStore((state) => state.signInWithGoogle);
  const [pending, setPending] = useState(false);

  // Google is the only configured provider. The age gate has already run by the time this
  // screen is reachable, so a successful sign-in continues into onboarding.
  async function handleGoogle() {
    if (pending) return;
    setPending(true);

    try {
      const outcome = await signInWithGoogle();
      if (outcome.status === 'success') continueToOnboarding();
      if (outcome.status === 'error') Alert.alert('Sign-in failed', outcome.message);
    } finally {
      setPending(false);
    }
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

      <View style={styles.content}>
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

        <View style={styles.signIn}>
          <SignInButton
            label="Sign in with Google"
            icon={require('@/assets/images/google-logo.png')}
            iconStyle={styles.googleIcon}
            onPress={handleGoogle}
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
      </View>
    </View>
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
  signIn: {
    width: '100%',
    maxWidth: 300,
    marginTop: 72,
    gap: 90,
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
