import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/theme';

type OnboardingProgressProps = {
  /** 1-based index of the current step. */
  step: number;
  total: number;
};

export function OnboardingProgress({ step, total }: OnboardingProgressProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, i < step && styles.segmentDone]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  segment: {
    width: 57,
    height: 13,
    borderRadius: 15,
    backgroundColor: Brand.accentMuted,
  },
  segmentDone: {
    backgroundColor: Brand.accent,
  },
});
