import { useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';

import { Text } from '@/components/text';
import { clampDate, daysInMonth } from '@/features/onboarding/calendar';
import { useTheme } from '@/theme';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PADDING_ITEMS = (VISIBLE_ITEMS - 1) / 2;

/**
 * How long the wheel must sit still before its resting row becomes the selected date. Waiting
 * for the snap to finish is what keeps the highlight band and the bold row on the same item.
 */
const SETTLE_MS = 90;

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
  const theme = useTheme();
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
      <View
        style={[styles.selectionBand, { backgroundColor: theme.color.surfaceSunken }]}
        pointerEvents="none"
      />
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

/**
 * One wheel. It owns its scroll position and reports a new index only once it has come to rest,
 * so a drag never re-renders the date underneath the finger and the highlight always matches the
 * row it is drawn over.
 */
function Wheel({ label, items, selectedIndex, onSelect, style }: WheelProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  // The row the wheel has come to rest on, which is what the highlight band is showing.
  const settled = useRef(selectedIndex);
  const latestOffset = useRef(selectedIndex * ITEM_HEIGHT);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moveTo = useCallback((index: number) => {
    latestOffset.current = index * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
  }, []);

  // A change from outside the wheel — the day clamped after a month change, or a restored
  // birthday on a return visit — moves the wheel itself instead of leaving it behind.
  useEffect(() => {
    if (settled.current === selectedIndex) return;
    settled.current = selectedIndex;
    moveTo(selectedIndex);
  }, [moveTo, selectedIndex]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  /** Commits the row under the band, clamping the overshoot a bounce can produce. */
  const flush = useCallback(() => {
    const raw = Math.round(latestOffset.current / ITEM_HEIGHT);
    const index = Math.max(0, Math.min(items.length - 1, raw));
    if (index === settled.current) return;
    settled.current = index;
    onSelect(index);
  }, [items.length, onSelect]);

  const schedule = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;
      flush();
    }, SETTLE_MS);
  }, [flush]);

  const track = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    latestOffset.current = event.nativeEvent.contentOffset.y;
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.wheel, style]}
      contentContainerStyle={styles.wheelContent}
      // Opening position, applied at mount. `onContentSizeChange` re-applies it because Android
      // can ignore an offset set before the content has been measured — which left the wheel on
      // 1900 while the selected year said something else.
      contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
      showsVerticalScrollIndicator={false}
      // No rubber-banding: a date wheel should stop dead at the first and last item.
      bounces={false}
      overScrollMode="never"
      snapToInterval={ITEM_HEIGHT}
      snapToAlignment="start"
      decelerationRate="fast"
      nestedScrollEnabled
      scrollEventThrottle={16}
      onScroll={(event) => {
        track(event);
        schedule();
      }}
      onScrollEndDrag={() => {
        schedule();
      }}
      onMomentumScrollEnd={(event) => {
        track(event);
        flush();
      }}
      onContentSizeChange={() => {
        // Skip while a gesture is settling: the wheel is already where the player put it.
        if (settleTimer.current) return;
        moveTo(settled.current);
      }}
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
            variant="body"
            tone={i === selectedIndex ? 'default' : 'muted'}
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
    borderRadius: 14,
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
    // Android's default font padding pushes the glyphs below the line box's centre, which
    // makes the selected row look a few pixels low against the highlight band.
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  itemTextSelected: {
    fontFamily: 'Gabarito_600SemiBold',
  },
});
