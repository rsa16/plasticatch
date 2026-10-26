import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenFrame } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { Brand, Spacing } from '@/constants/theme';
import { useCatchStore } from '@/features/catch';

// Shown in place of a photo the session doesn't have, e.g. when the screen is opened directly.
const FIND_PLACEHOLDER = require('@/assets/images/gallery-photo-front.png');
const DISPOSE_PLACEHOLDER = require('@/assets/images/gallery-photo-back.png');

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

/** The end of a verified catch: both blurred photos, the ledger breakdown and the new streak. */
export default function CatchSuccessScreen() {
  const completion = useCatchStore((state) => state.completion);
  const reset = useCatchStore((state) => state.reset);
  const insets = useSafeAreaInsets();
  const xp = completion?.result.xp;

  const lines: string[] = [];
  if (xp) {
    if (xp.base_xp) lines.push(`+${xp.base_xp} XP base`);
    if (xp.streak_bonus) lines.push(`+${xp.streak_bonus} XP streak bonus`);
    if (xp.first_catch_of_day) lines.push(`+${xp.first_catch_of_day} XP first catch today`);
    if (xp.repeat_location_adjustment) {
      lines.push(`${xp.repeat_location_adjustment} XP repeat location`);
    }
    if (xp.daily_cap_adjustment) lines.push(`${xp.daily_cap_adjustment} XP daily cap`);
  }

  return (
    <ScreenFrame top="step">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.three }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text variant="pageTitle" style={styles.title} accessibilityRole="header">
            Trash caught!
          </Text>
          <Image
            source={require('@/assets/images/all-set-divider.svg')}
            style={styles.divider}
            contentFit="fill"
          />
        </View>

        <Image
          source={require('@/assets/images/catch-stars.svg')}
          style={styles.stars}
          contentFit="fill"
          accessibilityLabel="Three stars"
        />

        <View style={styles.hero}>
          <View style={styles.ribbon} pointerEvents="none">
            <Image
              source={require('@/assets/images/catch-ribbon.png')}
              style={styles.ribbonImage}
              tintColor={Brand.accent}
              contentFit="fill"
            />
          </View>
          <View style={[styles.photoSlot, styles.disposeSlot]}>
            <Image
              source={
                completion?.disposePhoto ? { uri: completion.disposePhoto } : DISPOSE_PLACEHOLDER
              }
              style={[styles.photo, styles.tiltRight]}
              contentFit="cover"
              accessibilityLabel="Blurred photo of the litter going into the trash"
            />
          </View>
          <View style={[styles.photoSlot, styles.findSlot]}>
            <Image
              source={completion?.findPhoto ? { uri: completion.findPhoto } : FIND_PLACEHOLDER}
              style={[styles.photo, styles.tiltLeft]}
              contentFit="cover"
              accessibilityLabel="Blurred photo of the litter you found"
            />
          </View>
          <Text variant="fieldText" style={styles.date}>
            {formatDate(new Date())}
          </Text>
        </View>

        <View style={styles.summary}>
          <View style={styles.bullets}>
            <Bullet label={`${xp?.xp_awarded ?? 0} XP gained`} />
            {lines.map((line) => (
              <Bullet key={line} label={line} />
            ))}
            <Bullet
              label={`Streak: ${xp?.current_streak ?? 0}`}
              trailing={
                <Image
                  source={require('@/assets/images/catch-streak.png')}
                  style={styles.streakIcon}
                  tintColor={Brand.streak}
                  contentFit="contain"
                />
              }
            />
            {xp?.level !== undefined && <Bullet label={`Level ${xp.level}`} />}
            <Bullet label="Added to My Catches" />
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                reset();
                router.dismissTo('/map');
              }}
              style={({ pressed }) => [styles.done, pressed && styles.pressed]}
            >
              <Text variant="buttonLabel">DONE</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                reset();
                router.dismissTo('/my-catches');
              }}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text variant="buttonLabel">VIEW IN MY CATCHES</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenFrame>
  );
}

function Bullet({ label, trailing }: { label: string; trailing?: ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text variant="fieldText" style={styles.bulletMark}>
        •
      </Text>
      <Text variant="fieldText">{label}</Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  titleBlock: {
    alignSelf: 'center',
    width: 324,
    maxWidth: '90%',
    gap: 20,
  },
  title: {
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 5,
    marginVertical: -2,
    transform: [{ rotate: '-0.18deg' }],
  },
  stars: {
    alignSelf: 'center',
    marginTop: 9,
    width: 228.07,
    height: 71.035,
  },
  hero: {
    alignSelf: 'center',
    width: 393,
    height: 300,
    marginTop: -2,
  },
  ribbon: {
    position: 'absolute',
    left: 12,
    top: 156,
    width: 370,
    height: 136,
    overflow: 'hidden',
  },
  ribbonImage: {
    position: 'absolute',
    left: 10,
    top: -27,
    width: 349,
    height: 196,
  },
  photoSlot: {
    position: 'absolute',
    width: 193.865,
    height: 228.719,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disposeSlot: {
    left: 172.14,
    top: 0,
  },
  findSlot: {
    left: 27,
    top: 5.48,
  },
  photo: {
    width: 147.874,
    height: 197.165,
  },
  tiltLeft: {
    transform: [{ rotate: '-15deg' }],
  },
  tiltRight: {
    transform: [{ rotate: '15deg' }],
  },
  date: {
    position: 'absolute',
    top: 270,
    left: 118,
    width: 155,
    textAlign: 'center',
  },
  summary: {
    alignSelf: 'center',
    width: 393,
    marginTop: 35,
    paddingLeft: 48,
    paddingRight: 27,
    alignItems: 'center',
    gap: 34,
  },
  bullets: {
    alignSelf: 'stretch',
    gap: 9,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulletMark: {
    width: 37.5,
    paddingRight: 16,
    textAlign: 'right',
  },
  streakIcon: {
    width: 26,
    height: 26,
  },
  actions: {
    alignItems: 'center',
    gap: 12,
  },
  done: {
    minWidth: 180,
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  secondary: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  pressed: {
    opacity: 0.7,
  },
});
