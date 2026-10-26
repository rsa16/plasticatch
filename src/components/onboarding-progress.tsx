import { useWindowDimensions, View } from 'react-native';

import { makeStyles } from '@/theme';

type OnboardingProgressProps = {
  /** 1-based index of the current step. */
  step: number;
  total: number;
};

/** How far below the safe area the step bar sits, as a fraction of the screen height. */
const TOP_GAP_RATIO = 0.07;

/** A segmented step indicator: completed segments accent, the rest sunken. */
export function OnboardingProgress({ step, total }: OnboardingProgressProps) {
  const styles = useStyles();
  const { height } = useWindowDimensions();

  return (
    <View
      style={[styles.row, { paddingTop: Math.round(height * TOP_GAP_RATIO) }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: step }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.segment, i < step && styles.segmentDone]} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.xs,
    paddingHorizontal: 20,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.surfaceSunken,
  },
  segmentDone: {
    backgroundColor: t.color.accent,
  },
}));
