import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { OnboardingProgress } from '@/components/onboarding-progress';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { makeStyles, useTheme } from '@/theme';

export const ONBOARDING_STEPS = 7;

type OnboardingScreenProps = {
  /** 1-based index of this step in the onboarding flow. */
  step: number;
  children: ReactNode;
  /** Shows the Back button when provided. */
  onBack?: () => void;
  onNext?: () => void;
  /** Greys out Next until the step is complete. */
  nextDisabled?: boolean;
  nextLabel?: string;
  /** Lets a tall step scroll on short screens. */
  scroll?: boolean;
};

/** Shared chrome for onboarding steps: progress, body and a Back/Next footer. */
export function OnboardingScreen({
  step,
  children,
  onBack,
  onNext,
  nextDisabled,
  nextLabel = 'Next',
  scroll = false,
}: OnboardingScreenProps) {
  return (
    <Screen
      header={<OnboardingProgress step={step} total={ONBOARDING_STEPS} />}
      footer={
        <View style={styles.footer}>
          {onBack && <Button label="Back" variant="ghost" onPress={onBack} />}
          <View style={styles.spacer} />
          <Button label={nextLabel} onPress={onNext} disabled={nextDisabled} style={styles.next} />
        </View>
      }
    >
      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </Screen>
  );
}

export function OnboardingHeading({ children }: { children: string }) {
  return (
    <Text variant="display" accessibilityRole="header">
      {children}
    </Text>
  );
}

export function OnboardingPrompt({ children }: { children: string }) {
  return (
    <Text variant="body" tone="muted">
      {children}
    </Text>
  );
}

export function OnboardingField(props: TextInputProps) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <TextInput
      placeholderTextColor={theme.color.inkMuted}
      {...props}
      style={[
        theme.type.body,
        styles.field,
        { color: theme.color.ink, backgroundColor: theme.color.surfaceSunken },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
  next: {
    minWidth: 108,
  },
});

const useStyles = makeStyles((t) => ({
  field: {
    minHeight: 52,
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    borderRadius: t.radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.color.line,
  },
}));
