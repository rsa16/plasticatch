import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingProgress } from '@/components/onboarding-progress';
import { Text } from '@/components/text';
import { Brand, Spacing, TextStyles } from '@/constants/theme';

export const ONBOARDING_STEPS = 5;

/** Gap between the Back/Next buttons and the bottom safe-area edge. */
const FOOTER_BOTTOM_GAP = 56;

/** A backdrop gradient stop: [position 0–1, r, g, b, alpha], painted over Brand.surface. */
export type BackdropStop = readonly [number, number, number, number, number];

export function backdropGradient(stops: readonly BackdropStop[]) {
  return `linear-gradient(180deg, ${stops
    .map(([at, r, g, b, a]) => `rgba(${r}, ${g}, ${b}, ${a}) ${at * 100}%`)
    .join(', ')})`;
}

const BACKDROP_STOPS: readonly BackdropStop[] = [
  [0, 55, 135, 101, 0.61],
  [0.3, 245, 247, 246, 0.01],
  [0.6, 223, 234, 229, 0.44],
  [1, 55, 135, 101, 0.53],
];

/** The app's standard green-tinted backdrop, shared with the main screens. */
export const BACKDROP_GRADIENT = backdropGradient(BACKDROP_STOPS);

/**
 * The solid color the onboarding backdrop shows at `fraction` (0 = top, 1 = bottom of the
 * screen). Lets overlays such as scroll fades blend into the backdrop behind them.
 */
export function backdropColorAt(fraction: number) {
  const f = Math.min(1, Math.max(0, fraction));
  const i = BACKDROP_STOPS.findIndex(([at]) => at >= f);
  const end = BACKDROP_STOPS[Math.max(1, i)];
  const start = BACKDROP_STOPS[Math.max(0, i - 1)];
  const t = end[0] === start[0] ? 0 : (f - start[0]) / (end[0] - start[0]);
  const lerp = (k: 1 | 2 | 3 | 4) => start[k] + (end[k] - start[k]) * t;
  const alpha = lerp(4);
  const surface = [1, 3, 5].map((s) => parseInt(Brand.surface.slice(s, s + 2), 16));
  const [r, g, b] = ([1, 2, 3] as const).map((k, j) =>
    Math.round(lerp(k) * alpha + surface[j] * (1 - alpha)),
  );
  return { r, g, b };
}

type OnboardingScreenProps = {
  /** 1-based index of this step in the onboarding flow. */
  step: number;
  children: ReactNode;
  /** Shows the Back button when provided. */
  onBack?: () => void;
  onNext?: () => void;
  /** Greys out Next until the step is complete. */
  nextDisabled?: boolean;
};

/** Shared chrome for onboarding steps: gradient backdrop, progress bar, and Back/Next footer. */
export function OnboardingScreen({
  step,
  children,
  onBack,
  onNext,
  nextDisabled,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.backdrop} pointerEvents="none" />

      <KeyboardAvoidingView
        // KeyboardAvoidingView owns paddingBottom (it sets it to the keyboard height, 0 when
        // hidden), so the footer's bottom gap lives on the footer itself.
        style={[styles.frame, { paddingTop: insets.top + Spacing.two }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <OnboardingProgress step={step} total={ONBOARDING_STEPS} />

        <View style={styles.body}>{children}</View>

        <View style={[styles.footer, { marginBottom: insets.bottom + FOOTER_BOTTOM_GAP }]}>
          {onBack && <OnboardingButton label="Back" onPress={onBack} />}
          <View style={styles.footerNext}>
            <OnboardingButton label="Next" onPress={onNext} disabled={nextDisabled} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export function OnboardingHeading({ children }: { children: string }) {
  return (
    <>
      <Text variant="heading">{children}</Text>
      <Image
        source={require('@/assets/images/onboarding-divider.svg')}
        style={styles.divider}
        contentFit="fill"
      />
    </>
  );
}

export function OnboardingPrompt({ children }: { children: string }) {
  return <Text variant="prompt">{children}</Text>;
}

export function OnboardingField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Brand.rowText}
      {...props}
      style={[TextStyles.fieldText, styles.field]}
    />
  );
}

type OnboardingButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
};

function OnboardingButton({ label, onPress, disabled }: OnboardingButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text variant="buttonLabel">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.surface,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: BACKDROP_GRADIENT,
  },
  frame: {
    flex: 1,
    paddingHorizontal: 28,
  },
  body: {
    flex: 1,
    maxWidth: 350,
    paddingTop: 61,
    paddingBottom: Spacing.four,
    gap: 20,
  },
  footer: {
    flexDirection: 'row',
    marginHorizontal: -7,
  },
  footerNext: {
    marginLeft: 'auto',
  },
  divider: {
    width: 324.002,
    height: 5,
    maxWidth: '100%',
    // Figma lays the 5px stroke out in a 1px slot; keep the surrounding spacing the same.
    marginVertical: -2,
    transform: [{ rotate: '-0.18deg' }],
  },
  field: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  button: {
    width: 98,
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
    opacity: 0.4,
  },
});
