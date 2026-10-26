import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { MATERIAL_COLORS, MATERIAL_LABELS } from '@/constants/map';
import { Brand, Spacing } from '@/constants/theme';
import { formatObservedDate, pinTitle, type MapPin } from '@/features/map/pin';

type PinSheetProps = {
  pin: MapPin;
  onClose: () => void;
  /** Lifts the sheet clear of the tab bar. */
  bottom: number;
};

/**
 * The pin detail sheet. Deliberately never renders latitude/longitude or a map link: the source
 * observation's exact position is not ours to republish outside the map.
 */
export function PinSheet({ pin, onClose, bottom }: PinSheetProps) {
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close pin details"
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={[styles.sheet, { bottom }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <View
            style={[styles.dot, { backgroundColor: MATERIAL_COLORS[pin.materialGroup] }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <View style={styles.headerText}>
            <Text variant="sectionTitle" accessibilityRole="header" numberOfLines={2}>
              {pinTitle(pin)}
            </Text>
            <Text variant="body">{MATERIAL_LABELS[pin.materialGroup]}</Text>
          </View>
        </View>

        <View style={styles.rows}>
          <Row label="Material" value={pin.material ?? MATERIAL_LABELS[pin.materialGroup]} />
          <Row label="Source" value={pin.sourceLabel} />
          <Row label="Observed" value={formatObservedDate(pin.observedAt)} />
          <Row label="Attribution" value={pin.attribution} />
          <Row label="License" value={pin.license} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close pin details"
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Text variant="buttonLabel">CLOSE</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="caption" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="body" style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 20, 15, 0.28)',
  },
  sheet: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
    borderRadius: 24,
    backgroundColor: Brand.surface,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.field,
  },
  header: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginTop: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: Spacing.one,
  },
  rows: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowLabel: {
    width: 88,
    color: Brand.accent,
  },
  rowValue: {
    flex: 1,
  },
  close: {
    alignSelf: 'center',
    minWidth: 140,
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
