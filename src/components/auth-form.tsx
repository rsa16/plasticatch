import type { ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTheme } from '@/theme';

/** The raised surface every auth step sits on. */
export function AuthCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <Card style={[styles.card, style]}>{children}</Card>;
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
  return <Button label={label} onPress={onPress} disabled={disabled} size="lg" />;
}

/** The auth form's text input, matching the field styling used across the flows. */
export function AuthField({ style, ...rest }: TextInputProps) {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.color.inkMuted}
      {...rest}
      style={[
        theme.type.body,
        styles.field,
        {
          color: theme.color.ink,
          backgroundColor: theme.color.surfaceSunken,
          borderColor: theme.color.line,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
  },
  field: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
