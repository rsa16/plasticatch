import { router } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { View } from 'react-native';

import { ONBOARDING_STEPS } from '@/components/onboarding';
import { OnboardingProgress } from '@/components/onboarding-progress';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { makeStyles, useTheme } from '@/theme';

const TIPS: { icon: SymbolViewProps['name']; title: string; body: string }[] = [
  {
    icon: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
    title: 'Catch it',
    body: 'Photograph a piece of litter where you find it.',
  },
  {
    icon: { ios: 'arrow.right.circle.fill', android: 'arrow_forward', web: 'arrow_forward' },
    title: 'Dispose of it',
    body: 'Carry it to a bin and photograph the same litter going in.',
  },
  {
    icon: { ios: 'trophy.fill', android: 'emoji_events', web: 'emoji_events' },
    title: 'Earn XP',
    body: 'Verified catches build your streak and move you up the leaderboard.',
  },
];

export default function AllSetScreen() {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <Screen header={<OnboardingProgress step={ONBOARDING_STEPS} total={ONBOARDING_STEPS} />}>
      <View style={styles.body}>
        <View style={styles.message}>
          <Text variant="display" style={styles.title} accessibilityRole="header">
            You&apos;re all set!
          </Text>
          <Text variant="body" tone="muted" style={styles.copy}>
            Your account is ready. Time to clean up your corner of the map.
          </Text>
        </View>

        <Card style={styles.tips}>
          {TIPS.map((tip, index) => (
            <View key={tip.title} style={styles.tip}>
              <View style={[styles.tipIcon, { backgroundColor: theme.color.accentTint }]}>
                <SymbolView name={tip.icon} size={20} tintColor={theme.color.accent} />
              </View>
              <View style={styles.tipText}>
                <Text variant="label">{tip.title}</Text>
                <Text variant="caption" tone="muted">
                  {tip.body}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <Button
          label="Start catching"
          size="lg"
          // Onboarding is finished, so drop it from history and land in the app shell.
          onPress={() => router.replace('/map')}
          style={styles.button}
        />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: t.space.xxl,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  message: {
    gap: t.space.sm,
  },
  title: {
    textAlign: 'center',
  },
  copy: {
    textAlign: 'center',
  },
  tips: {
    gap: t.space.lg,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
  },
  tipIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
  },
  tipText: {
    flex: 1,
    gap: 2,
  },
  button: {
    alignSelf: 'stretch',
  },
}));
