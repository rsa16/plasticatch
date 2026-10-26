import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { MATERIAL_COLORS, MATERIAL_LABELS } from '@/constants/map';
import { formatObservedDate, pinTitle, type MapPin } from '@/features/map/pin';
import { useTheme } from '@/theme';

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
    <Sheet onClose={onClose} bottom={bottom} accessibilityLabel="Close pin details">
      <View style={styles.header}>
        <View
          style={[styles.dot, { backgroundColor: MATERIAL_COLORS[pin.materialGroup] }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <View style={styles.headerText}>
          <Text variant="heading" accessibilityRole="header" numberOfLines={2}>
            {pinTitle(pin)}
          </Text>
          <Text variant="caption" tone="muted">
            {MATERIAL_LABELS[pin.materialGroup]}
          </Text>
        </View>
      </View>

      <View style={styles.rows}>
        <Row label="Material" value={pin.material ?? MATERIAL_LABELS[pin.materialGroup]} />
        <Row label="Source" value={pin.sourceLabel} />
        <Row label="Observed" value={formatObservedDate(pin.observedAt)} />
        <Row label="Attribution" value={pin.attribution} />
        <Row label="Licence" value={pin.license} />
      </View>

      <Button label="Close" variant="secondary" onPress={onClose} />
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.row, { borderTopColor: theme.color.line }]}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text variant="caption" tone="muted" style={styles.rowLabel}>
        {label}
      </Text>
      <Text variant="label" style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 4,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  rows: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    width: 88,
  },
  rowValue: {
    flex: 1,
  },
});
