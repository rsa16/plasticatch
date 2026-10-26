import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { DATA_SOURCES } from '@/constants/map';
import { Brand, Spacing } from '@/constants/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Data sources / About: the attribution surface reachable from the map on every visit. */
export default function AboutScreen() {
  const barHeight = useBottomBarHeight();

  return (
    <MenuScreen title="ABOUT">
      <View style={[styles.screen, { marginBottom: barHeight }]}>
        <ScrollPane thumbHeight={104} contentContainerStyle={styles.content}>
          <Text variant="body" style={styles.intro}>
            PlastiCatch shows litter observations from the sources below. Every pin keeps its
            source&apos;s attribution and licence.
          </Text>

          {DATA_SOURCES.map((source) => (
            <View key={source.name} style={styles.card}>
              <Text variant="sectionTitle" accessibilityRole="header">
                {source.name}
              </Text>
              <Text variant="caption" style={styles.role}>
                {source.role}
              </Text>
              <Field label="Attribution" value={source.attribution} />
              <Field label="Snapshot" value={source.snapshot} />
              <Field label="Licence" value={source.license} />
            </View>
          ))}

          <View style={styles.card}>
            <Text variant="sectionTitle" accessibilityRole="header">
              App
            </Text>
            <Field label="Version" value={APP_VERSION} />
            <Field
              label="Build"
              value={`Expo ${Constants.expoConfig?.sdkVersion ?? 'SDK 58'} · React Native client`}
            />
            <Text variant="body">
              Debris Tracker data is demo-only until written attribution permission is confirmed.
              OpenLitterMap data is ODbL-licensed and kept in its own table and map layer.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Text variant="buttonLabel">BACK</Text>
          </Pressable>
        </ScrollPane>
      </View>
    </MenuScreen>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="caption" style={styles.fieldLabel}>
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
    marginTop: Spacing.three,
  },
  content: {
    gap: Spacing.three,
    paddingHorizontal: 18,
    paddingRight: 28,
    paddingBottom: Spacing.six,
  },
  intro: {
    maxWidth: 340,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 20,
    backgroundColor: 'rgba(247, 248, 247, 0.96)',
  },
  role: {
    color: Brand.accent,
  },
  field: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  fieldLabel: {
    width: 86,
    color: Brand.accent,
  },
  fieldValue: {
    flex: 1,
  },
  back: {
    alignSelf: 'center',
    minWidth: 160,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
