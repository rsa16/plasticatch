import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ScreenFrame } from '@/components/screen-frame';
import { Text } from '@/components/text';
import { useCatchStore } from '@/features/catch';
import { Brand } from '@/constants/theme';

// Streaks and levels aren't tracked yet, so these show the Figma mock's values.
const PLACEHOLDER_STREAK = 5;
const PLACEHOLDER_LEVELLED_UP = true;

// Shown in place of a photo the session doesn't have, e.g. when the screen is opened directly.
const FIND_PLACEHOLDER = require('@/assets/images/gallery-photo-front.png');
const DISPOSE_PLACEHOLDER = require('@/assets/images/gallery-photo-back.png');

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

/** The end of a catch: both photos on a ribbon, the XP earned, and a way back to the app. */
export default function CatchCompleteScreen() {
  // The catch layout only renders this route once the lifecycle has a completion.
  const completion = useCatchStore((state) => state.completion);
  const reset = useCatchStore((state) => state.reset);

  return (
    <ScreenFrame top="step">
      <View style={styles.titleBlock}>
        <Text variant="pageTitle" style={styles.title} accessibilityRole="header">
          Catch Complete!
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
            accessibilityLabel="Photo of the litter going into the trash"
          />
        </View>
        <View style={[styles.photoSlot, styles.findSlot]}>
          <Image
            source={completion?.findPhoto ? { uri: completion.findPhoto } : FIND_PLACEHOLDER}
            style={[styles.photo, styles.tiltLeft]}
            contentFit="cover"
            accessibilityLabel="Photo of the litter you found"
          />
        </View>
        <Text variant="fieldText" style={styles.date}>
          {formatDate(new Date())}
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.bullets}>
          <Bullet label={`${completion?.xp ?? 0} XP gained`} />
          <Bullet
            label={`Streak: ${PLACEHOLDER_STREAK}`}
            trailing={
              <Image
                source={require('@/assets/images/catch-streak.png')}
                style={styles.streakIcon}
                tintColor={Brand.streak}
                contentFit="contain"
              />
            }
          />
          {PLACEHOLDER_LEVELLED_UP && <Bullet label="LVL. Up!" />}
        </View>

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
      </View>
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
    // Figma lays the 5px stroke out in a 1px slot; keep the surrounding spacing the same.
    marginVertical: -2,
    transform: [{ rotate: '-0.18deg' }],
  },
  stars: {
    alignSelf: 'center',
    marginTop: 9,
    width: 228.07,
    height: 71.035,
  },
  // A 393pt-wide canvas (the Figma frame) holding the ribbon, both photos and the date.
  hero: {
    alignSelf: 'center',
    width: 393,
    height: 300,
    marginTop: -2,
  },
  // The ribbon artwork is cropped top and bottom by a 136pt band.
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
  // Each slot is the bounding box of its tilted photo, so the photo rotates about its centre.
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
  done: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
