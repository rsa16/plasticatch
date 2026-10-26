import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { OnboardingHeading, OnboardingScreen } from '@/components/onboarding';
import { FADE_HEIGHT, ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Card } from '@/components/ui/card';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/constants/legal';
import { TERMS_OF_SERVICE } from '@/constants/terms-of-service';
import { goBackOr } from '@/features/onboarding/back';
import { acceptConsent } from '@/features/onboarding/profile-service';
import { useTheme } from '@/theme';

export default function TermsScreen() {
  const theme = useTheme();
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
      step={6}
      onBack={() => goBackOr('/permissions')}
      onNext={handleNext}
      nextDisabled={!complete || pending}
    >
      <OnboardingHeading>Terms of Service</OnboardingHeading>
      <Text variant="body" tone="muted">
        Read the terms and privacy policy, then confirm both below.
      </Text>

      <Card padded={false} style={styles.terms}>
        <View style={styles.termsInner}>
          <ScrollPane fade thumbHeight={48} contentContainerStyle={styles.termsContent}>
            <Text variant="body">{TERMS_OF_SERVICE}</Text>
          </ScrollPane>
        </View>
      </Card>

      <View style={styles.agreeSection}>
        <AgreeRow
          checked={agreedTerms}
          onToggle={() => setAgreedTerms((value) => !value)}
          label="I have read and agreed to the Terms of Service above."
        />
        <AgreeRow
          checked={agreedPrivacy}
          onToggle={() => setAgreedPrivacy((value) => !value)}
          label="I have read and agreed to the Privacy Policy."
        />
      </View>
      <View style={{ height: theme.space.sm }} />
    </OnboardingScreen>
  );
}

type AgreeRowProps = {
  checked: boolean;
  onToggle: () => void;
  label: string;
};

function AgreeRow({ checked, onToggle, label }: AgreeRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={styles.agreeRow}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: theme.color.accent,
            backgroundColor: checked ? theme.color.accent : 'transparent',
          },
        ]}
      >
        {checked && (
          <SymbolView
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            tintColor={theme.color.onAccent}
            size={18}
            weight="bold"
          />
        )}
      </View>
      <Text variant="caption" style={styles.agreeLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  terms: {
    flex: 1,
    minHeight: 180,
  },
  termsInner: {
    flex: 1,
    paddingHorizontal: 16,
  },
  termsContent: {
    paddingVertical: FADE_HEIGHT / 2,
  },
  agreeSection: {
    gap: 12,
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreeLabel: {
    flex: 1,
  },
});
