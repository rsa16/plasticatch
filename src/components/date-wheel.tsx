import { useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Text } from '@/components/text';
import { Brand } from '@/constants/theme';
import { clampDate, daysInMonth } from '@/features/onboarding/calendar';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PADDING_ITEMS = (VISIBLE_ITEMS - 1) / 2;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MIN_YEAR = 1900;

type DateWheelProps = {
  value: Date;
  onChange: (date: Date) => void;
};

/** Month / day / year scroll wheels that look the same on iOS, Android and web. */
export function DateWheel({ value, onChange }: DateWheelProps) {
  const maxYear = new Date().getFullYear();
  const years = Array.from({ length: maxYear - MIN_YEAR + 1 }, (_, i) => String(MIN_YEAR + i));
  const days = Array.from({ length: daysInMonth(value.getFullYear(), value.getMonth()) }, (_, i) =>
    String(i + 1),
  );

  // Rebuild the date from its parts, clamping the day so e.g. Jan 31 -> Feb becomes Feb 28/29.
  const update = (year: number, month: number, day: number) => {
    onChange(clampDate(year, month, day));
  };

  return (
    <View style={styles.container}>
      <View style={styles.selectionBand} pointerEvents="none" />
      <Wheel
        style={styles.monthColumn}
        label="Month"
        items={MONTHS}
        selectedIndex={value.getMonth()}
        onSelect={(i) => update(value.getFullYear(), i, value.getDate())}
      />
      <Wheel
        style={styles.dayColumn}
        label="Day"
        items={days}
        selectedIndex={value.getDate() - 1}
        onSelect={(i) => update(value.getFullYear(), value.getMonth(), i + 1)}
      />
      <Wheel
        style={styles.yearColumn}
        label="Year"
        items={years}
        selectedIndex={value.getFullYear() - MIN_YEAR}
        onSelect={(i) => update(MIN_YEAR + i, value.getMonth(), value.getDate())}
      />
    </View>
  );
}

type WheelProps = {
  label: string;
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  style: object;
};

function Wheel({ label, items, selectedIndex, onSelect, style }: WheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  // Index the wheel is currently resting on, so we only scroll programmatically when the
  // selection changed from outside (e.g. the day was clamped after a month change).
  const scrolledIndex = useRef(-1);

  useEffect(() => {
    if (scrolledIndex.current === selectedIndex) return;
    scrolledIndex.current = selectedIndex;
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
  }, [selectedIndex]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const index = Math.max(0, Math.min(items.length - 1, raw));
    if (index === scrolledIndex.current) return;
    scrolledIndex.current = index;
    onSelect(index);
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.wheel, style]}
      contentContainerStyle={styles.wheelContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      nestedScrollEnabled
      scrollEventThrottle={16}
      onScroll={handleScroll}
      onLayout={() =>
        scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false })
      }
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[selectedIndex] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        const next = Math.max(0, Math.min(items.length - 1, selectedIndex + step));
        if (next !== selectedIndex) onSelect(next);
      }}
    >
      {items.map((item, i) => (
        <View key={item} style={styles.item}>
          <Text
            variant="wheelItem"
            color={i === selectedIndex ? undefined : 'accent'}
            style={[styles.itemText, i === selectedIndex && styles.itemTextSelected]}
            numberOfLines={1}
          >
            {item}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  selectionBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * PADDING_ITEMS,
    height: ITEM_HEIGHT,
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  wheel: {
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * PADDING_ITEMS,
  },
  monthColumn: {
    flex: 1.7,
  },
  dayColumn: {
    flex: 0.8,
  },
  yearColumn: {
    flex: 1.1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    opacity: 0.6,
  },
  itemTextSelected: {
    opacity: 1,
  },
});
