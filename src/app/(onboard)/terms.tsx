import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OnboardingHeading, OnboardingScreen } from '@/components/onboarding';
import { FADE_HEIGHT, ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Brand } from '@/constants/theme';
import { TERMS_OF_SERVICE } from '@/constants/terms-of-service';

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

/** The terms, scrollable with the shared pane's faded edges and thumb. */
function TermsText() {
  return (
    <ScrollPane fade thumbHeight={THUMB_HEIGHT} contentContainerStyle={styles.termsContent}>
      <Text variant="legalText">{TERMS_OF_SERVICE}</Text>
    </ScrollPane>
  );
}

const styles = StyleSheet.create({
  termsContent: {
    paddingVertical: FADE_HEIGHT / 2,
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
