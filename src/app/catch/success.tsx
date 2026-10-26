import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Card, Divider } from '@/components/ui/card';
import { Badge } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { useCatchStore } from '@/features/catch';
import { useTheme } from '@/theme';

// Shown in place of a photo the session doesn't have, e.g. when the screen is opened directly.
const FIND_PLACEHOLDER = require('@/assets/images/gallery-photo-front.png');
const DISPOSE_PLACEHOLDER = require('@/assets/images/gallery-photo-back.png');

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** The end of a verified catch: the reward moment. */
export default function CatchSuccessScreen() {
  const theme = useTheme();
  const completion = useCatchStore((state) => state.completion);
  const reset = useCatchStore((state) => state.reset);
  const xp = completion?.result.xp;
  const awarded = xp?.xp_awarded ?? 0;
  const displayXp = useCountUp(awarded);

  const lines: { label: string; value: number }[] = [];
  if (xp) {
    if (xp.base_xp) lines.push({ label: 'Base catch', value: xp.base_xp });
    if (xp.streak_bonus) lines.push({ label: 'Streak bonus', value: xp.streak_bonus });
    if (xp.first_catch_of_day) {
      lines.push({ label: 'First catch today', value: xp.first_catch_of_day });
    }
    if (xp.repeat_location_adjustment) {
      lines.push({ label: 'Repeat location', value: xp.repeat_location_adjustment });
    }
    if (xp.daily_cap_adjustment) {
      lines.push({ label: 'Daily cap', value: xp.daily_cap_adjustment });
    }
  }

  return (
    <Screen scroll>
      <View style={styles.hero}>
        <Text variant="display" accessibilityRole="header" style={styles.title}>
          Trash caught!
        </Text>
        <Text variant="caption" tone="muted">
          {formatDate(new Date())}
        </Text>
      </View>

      <View style={styles.stars} accessibilityLabel="Three stars">
        {[0, 1, 2].map((index) => (
          <Star key={index} index={index} />
        ))}
      </View>

      <View style={styles.photos}>
        <Image
          source={completion?.findPhoto ? { uri: completion.findPhoto } : FIND_PLACEHOLDER}
          style={[
            styles.photo,
            { borderColor: theme.color.surface, backgroundColor: theme.color.surfaceSunken },
            styles.photoLeft,
          ]}
          contentFit="cover"
          accessibilityLabel="Blurred photo of the litter you found"
        />
        <Image
          source={completion?.disposePhoto ? { uri: completion.disposePhoto } : DISPOSE_PLACEHOLDER}
          style={[
            styles.photo,
            { borderColor: theme.color.surface, backgroundColor: theme.color.surfaceSunken },
            styles.photoRight,
          ]}
          contentFit="cover"
          accessibilityLabel="Blurred photo of the litter going into the trash"
        />
      </View>

      <Card style={styles.card}>
        <View style={styles.xpHead}>
          <View>
            <Text variant="caption" tone="muted">
              XP earned
            </Text>
            <Text variant="numeric" tone="accent">
              +{displayXp}
            </Text>
          </View>
          <View style={styles.xpMeta}>
            {xp?.level !== undefined && <Badge label={`Level ${xp.level}`} tone="brand" />}
          </View>
        </View>

        {lines.length > 0 && (
          <View style={styles.breakdown}>
            {lines.map((line, index) => (
              <View key={line.label}>
                {index > 0 && <Divider />}
                <View style={styles.line}>
                  <Text variant="body" tone="muted">
                    {line.label}
                  </Text>
                  <Text variant="label" tone={line.value > 0 ? 'accent' : 'default'}>
                    {line.value > 0 ? '+' : ''}
                    {line.value} XP
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text variant="caption" tone="muted">
            Total {xp?.total_xp ?? 0} XP · Longest streak {xp?.longest_streak ?? 0}
          </Text>
          <Text variant="caption" tone="muted">
            Added to Gallery
          </Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <Button
          label="Done"
          size="lg"
          onPress={() => {
            reset();
            router.dismissTo('/map');
          }}
        />
        <Button
          label="View in Gallery"
          variant="ghost"
          onPress={() => {
            reset();
            router.dismissTo('/my-catches');
          }}
        />
      </View>

      <View style={{ height: theme.space.lg }} />
    </Screen>
  );
}

/** A star that pops in with a short stagger unless the player has reduced motion enabled. */
function Star({ index }: { index: number }) {
  const theme = useTheme();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted) return;
      if (reduced) {
        scale.value = 1;
        opacity.value = 1;
        return;
      }
      opacity.value = withDelay(index * 90, withTiming(1, { duration: 180 }));
      scale.value = withDelay(index * 90, withSpring(1, { damping: 11, stiffness: 180 }));
    });
    return () => {
      mounted = false;
    };
  }, [index, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <SymbolView
        name={{ ios: 'star.fill', android: 'star', web: 'star' }}
        size={40}
        tintColor={theme.color.gold}
      />
    </Animated.View>
  );
}

/** Counts the awarded XP up on mount, immediately when reduced motion is enabled. */
function useCountUp(target: number) {
  const [value, setValue] = useState(0);
  const frame = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted) return;
      if (reduced || target === 0) {
        setValue(target);
        return;
      }
      const started = Date.now();
      const tick = () => {
        if (!mounted) return;
        const progress = Math.min(1, (Date.now() - started) / 700);
        setValue(Math.round(target * progress));
        if (progress < 1) frame.current = setTimeout(tick, 32);
      };
      tick();
    });
    return () => {
      mounted = false;
      if (frame.current) clearTimeout(frame.current);
    };
  }, [target]);

  return value;
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 32,
  },
  title: {
    textAlign: 'center',
  },
  stars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  photos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  photo: {
    width: '46%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    borderWidth: 3,
  },
  photoLeft: {
    transform: [{ rotate: '-3deg' }],
  },
  photoRight: {
    transform: [{ rotate: '3deg' }],
  },
  card: {
    gap: 16,
  },
  xpHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  xpMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  breakdown: {
    gap: 0,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
  },
  footer: {
    gap: 2,
  },
  actions: {
    gap: 8,
    marginTop: 24,
  },
});
