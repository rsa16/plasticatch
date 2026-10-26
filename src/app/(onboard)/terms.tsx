import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { OnboardingHeading, OnboardingScreen } from '@/components/onboarding';
import { FADE_HEIGHT, ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/constants/legal';
import { Brand } from '@/constants/theme';
import { TERMS_OF_SERVICE } from '@/constants/terms-of-service';
import { acceptConsent } from '@/features/onboarding/profile-service';

const THUMB_HEIGHT = 57;

export default function TermsScreen() {
  // The backend records the two acceptances separately, so the screen asks for them separately.
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [pending, setPending] = useState(false);

  const complete = agreedTerms && agreedPrivacy;

  async function handleNext() {
    if (!complete || pending) return;
    setPending(true);

    try {
      const result = await acceptConsent({
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      });

      if (!result.success) {
        Alert.alert('Could not save your consent', 'Check your connection and try again.');
        return;
      }

      router.push('/all-set');
    } catch (error) {
      Alert.alert(
        'Could not save your consent',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <OnboardingScreen
      step={5}
      onBack={() => router.back()}
      onNext={handleNext}
      nextDisabled={!complete || pending}
    >
      <OnboardingHeading>Terms of Service</OnboardingHeading>
      <TermsText />

      <View style={styles.agreeSection}>
        <Image
          source={require('@/assets/images/onboarding-divider.svg')}
          style={styles.divider}
          contentFit="fill"
        />
        <AgreeRow
          checked={agreedTerms}
          onToggle={() => setAgreedTerms((value) => !value)}
          label="I have read and agreed to the Terms of Service outlined above."
        />
        <AgreeRow
          checked={agreedPrivacy}
          onToggle={() => setAgreedPrivacy((value) => !value)}
          label="I have read and agreed to the Privacy Policy."
        />
      </View>
    </OnboardingScreen>
  );
}

type AgreeRowProps = {
  checked: boolean;
  onToggle: () => void;
  label: string;
};

function AgreeRow({ checked, onToggle, label }: AgreeRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.agreeRow}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            tintColor={Brand.surface}
            size={24}
            weight="bold"
          />
        )}
      </View>
      <Text variant="legalConsent" style={styles.agreeLabel}>
        {label}
      </Text>
    </Pressable>
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
