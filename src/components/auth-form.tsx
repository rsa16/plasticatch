import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/text';
import { Brand, Spacing, TextStyles } from '@/constants/theme';

/** The raised surface every auth step sits on. */
export function AuthCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** The primary action on an auth step. */
export function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text variant="buttonLabel">{label}</Text>
    </Pressable>
  );
}

/** The auth form's text input, matching the field styling used across the flows. */
export function AuthField({ style, ...rest }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Brand.rowText}
      {...rest}
      style={[TextStyles.fieldText, styles.field, style]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: 20,
    backgroundColor: Brand.surface,
    gap: Spacing.three,
  },
  field: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  action: {
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
