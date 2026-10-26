import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { Text } from '@/components/text';
import { BackButton } from '@/components/ui/back-button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { supportEmail } from '@/constants/legal';
import { DATA_SOURCES } from '@/constants/map';
import { useTheme } from '@/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Data sources / About: the attribution surface reachable from the map on every visit. */
export default function AboutScreen() {
  const barHeight = useBottomBarHeight();
  const support = supportEmail();

  return (
    <Screen title="About" actions={<BackButton />}>
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="body" tone="muted">
            PlastiCatch shows litter observations from the sources below. Every pin keeps its
            source&apos;s attribution and licence.
          </Text>

          {DATA_SOURCES.map((source) => (
            <Card key={source.name} style={styles.card}>
              <Text variant="heading" accessibilityRole="header">
                {source.name}
              </Text>
              <Field label="Attribution" value={source.attribution} />
              <Field label="Snapshot" value={source.snapshot} />
              <Field label="Licence" value={source.license} />
            </Card>
          ))}

          <Card style={styles.card}>
            <Text variant="heading" accessibilityRole="header">
              App
            </Text>
            <Field label="Version" value={APP_VERSION} />
            <Field
              label="Build"
              value={`Expo ${Constants.expoConfig?.sdkVersion ?? 'SDK 58'} · React Native client`}
            />
            {support && <Field label="Support" value={support} />}
            <Text variant="caption" tone="muted">
              Debris Tracker data is demo-only until written attribution permission is confirmed.
              OpenLitterMap data is ODbL-licensed and kept in its own table and map layer.
            </Text>
          </Card>
        </ScrollView>
      </View>
    </Screen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.field, { borderTopColor: theme.color.line }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text variant="caption" tone="muted" style={styles.fieldLabel}>
        {label}
      </Text>
      <Text variant="body" style={styles.fieldValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  card: {
    gap: 10,
  },
  field: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8,
  },
  fieldLabel: {
    width: 88,
  },
  fieldValue: {
    flex: 1,
  },
});
