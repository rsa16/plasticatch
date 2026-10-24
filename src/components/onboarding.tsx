import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingProgress } from '@/components/onboarding-progress';
import { ScreenFrame } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { Brand, Spacing, TextStyles } from '@/constants/theme';

export const ONBOARDING_STEPS = 5;

/** Gap between the Back/Next buttons and the bottom safe-area edge. */
const FOOTER_BOTTOM_GAP = 56;

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

/** Shared chrome for onboarding steps: progress bar and a Back/Next footer on the screen frame. */
export function OnboardingScreen({
  step,
  children,
  onBack,
  onNext,
  nextDisabled,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ScreenFrame
      top="step"
      keyboardAvoiding
      header={<OnboardingProgress step={step} total={ONBOARDING_STEPS} />}
      footer={
        <View style={[styles.footer, { marginBottom: insets.bottom + FOOTER_BOTTOM_GAP }]}>
          {onBack && <OnboardingButton label="Back" onPress={onBack} />}
          <View style={styles.footerNext}>
            <OnboardingButton label="Next" onPress={onNext} disabled={nextDisabled} />
          </View>
        </View>
      }
      contentStyle={styles.frame}
    >
      <View style={styles.body}>{children}</View>
    </ScreenFrame>
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
  frame: {
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
