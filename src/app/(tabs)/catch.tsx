import { Image, type ImageSource, type ImageStyle } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View, type StyleProp } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, Spacing } from '@/constants/theme';

// Placeholder until real auth exists: both providers go straight to onboarding.
// `replace` keeps sign-in out of the history so users can't navigate back to it.
function continueToOnboarding() {
  router.replace('/date-of-birth');
}

export default function CatchScreen() {
  return (
    <ThemedView style={styles.screen}>
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
          <ThemedText style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            PlastiCatch
          </ThemedText>
          <Image
            source={require('@/assets/images/catch-divider.svg')}
            style={styles.divider}
            contentFit="fill"
          />
          <ThemedText style={styles.welcome}>- WELCOME -</ThemedText>
        </View>

        <View style={styles.signIn}>
          <SignInButton
            label="Sign in with Google"
            icon={require('@/assets/images/google-logo.png')}
            iconStyle={styles.googleIcon}
            onPress={continueToOnboarding}
          />
          <SignInButton
            label="Sign in with Apple"
            icon={require('@/assets/images/apple-logo.png')}
            iconStyle={styles.appleIcon}
            onPress={continueToOnboarding}
          />
        </View>
      </View>
    </ThemedView>
  );
}

type SignInButtonProps = {
  label: string;
  icon: ImageSource;
  iconStyle: StyleProp<ImageStyle>;
  onPress?: () => void;
};

function SignInButton({ label, icon, iconStyle, onPress }: SignInButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Image source={icon} style={iconStyle} contentFit="cover" />
      <ThemedText style={styles.buttonLabel}>{label}</ThemedText>
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
  title: {
    color: Brand.surface,
    fontSize: 65,
    lineHeight: 68,
    fontWeight: 700,
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
    color: Brand.surface,
    fontSize: 35,
    lineHeight: 41,
    fontWeight: 400,
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
  googleIcon: {
    width: 36,
    height: 36,
  },
  appleIcon: {
    width: 36,
    height: 42,
  },
  buttonLabel: {
    color: Brand.onSurface,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: 400,
  },
});
