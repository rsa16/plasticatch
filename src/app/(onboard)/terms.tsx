import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { backdropColorAt, OnboardingHeading, OnboardingScreen } from '@/components/onboarding';
import { Text } from '@/components/text';
import { Brand } from '@/constants/theme';
import { TERMS_OF_SERVICE } from '@/constants/terms-of-service';

const FADE_HEIGHT = 48;
const THUMB_HEIGHT = 57;

export default function TermsScreen() {
  const [agreed, setAgreed] = useState(false);

  return (
    <OnboardingScreen
      step={4}
      onBack={() => router.back()}
      onNext={() => router.push('/all-set')}
      nextDisabled={!agreed}
    >
      <OnboardingHeading>Terms of Service</OnboardingHeading>
      <TermsText />

      <View style={styles.agreeSection}>
        <Image
          source={require('@/assets/images/onboarding-divider.svg')}
          style={styles.divider}
          contentFit="fill"
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => setAgreed((value) => !value)}
          style={styles.agreeRow}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && (
              <SymbolView
                name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                tintColor={Brand.surface}
                size={24}
                weight="bold"
              />
            )}
          </View>
          <Text variant="legalConsent" style={styles.agreeLabel}>
            I have read and agreed to the Terms of Service outlined above.
          </Text>
        </Pressable>
      </View>
    </OnboardingScreen>
  );
}

/** Scrollable terms with faded edges and a custom scroll thumb, as in the design. */
function TermsText() {
  const { height: screenHeight } = useWindowDimensions();
  const boxRef = useRef<View>(null);
  const [box, setBox] = useState({ top: 0, height: 0 });
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Window position is needed to match the fades to the full-screen backdrop behind them.
  const measure = () =>
    boxRef.current?.measureInWindow((_x, top, _w, height) => setBox({ top, height }));

  const fade = (y: number, toBottom: boolean) => {
    const { r, g, b } = backdropColorAt(y / screenHeight);
    const solid = `rgba(${r}, ${g}, ${b}, 1)`;
    const clear = `rgba(${r}, ${g}, ${b}, 0)`;
    return {
      experimental_backgroundImage: `linear-gradient(to bottom, ${toBottom ? clear : solid}, ${toBottom ? solid : clear})`,
    };
  };

  const scrollable = Math.max(0, contentHeight - box.height);
  const thumbTop = scrollable > 0 ? (scrollY / scrollable) * (box.height - THUMB_HEIGHT) : 0;

  return (
    <View style={styles.termsRow}>
      <View ref={boxRef} style={styles.termsBox} onLayout={measure}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
            setScrollY(e.nativeEvent.contentOffset.y)
          }
          onContentSizeChange={(_w, h) => setContentHeight(h)}
          contentContainerStyle={styles.termsContent}
        >
          <Text variant="legalText">{TERMS_OF_SERVICE}</Text>
        </ScrollView>
        {box.height > 0 && (
          <>
            <View
              style={[styles.fade, styles.fadeTop, fade(box.top, false)]}
              pointerEvents="none"
            />
            <View
              style={[styles.fade, styles.fadeBottom, fade(box.top + box.height, true)]}
              pointerEvents="none"
            />
          </>
        )}
      </View>
      {scrollable > 0 && (
        <View style={styles.track} pointerEvents="none">
          <View style={[styles.thumb, { top: thumbTop }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  termsRow: {
    flex: 1,
    flexDirection: 'row',
  },
  termsBox: {
    width: 324,
    flexShrink: 1,
  },
  termsContent: {
    paddingVertical: FADE_HEIGHT / 2,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FADE_HEIGHT,
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
  track: {
    width: 13,
    marginLeft: 'auto',
    marginRight: -5,
  },
  thumb: {
    position: 'absolute',
    width: 13,
    height: THUMB_HEIGHT,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  agreeSection: {
    marginLeft: -9,
    gap: 19,
  },
  divider: {
    width: 324.002,
    height: 5,
    maxWidth: '100%',
    marginVertical: -2,
    transform: [{ rotate: '-0.18deg' }],
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  checkbox: {
    width: 43,
    height: 43,
    borderWidth: 5,
    borderRadius: 10,
    borderColor: Brand.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Brand.accent,
  },
  agreeLabel: {
    flex: 1,
  },
});
