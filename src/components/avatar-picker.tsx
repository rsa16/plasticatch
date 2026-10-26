import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AvatarHead } from '@/components/avatar-head';
import { Text } from '@/components/text';
import { Chip } from '@/components/ui/chip';
import {
  AVATAR_PARTS,
  avatarPresets,
  type AvatarPart,
  type AvatarSelection,
} from '@/constants/avatar';
import { withAvatarPart } from '@/features/avatar';
import { makeStyles, useTheme } from '@/theme';

const PART_LABELS: Record<AvatarPart, string> = {
  hair: 'Hair',
  skin: 'Skin',
  shirt: 'Shirt',
};

type AvatarPickerProps = {
  selection: AvatarSelection;
  onChange: (selection: AvatarSelection) => void;
  /** Diameter of the preview head. */
  previewSize?: number;
  /** Diameter of a preset option. */
  optionSize?: number;
};

/**
 * The preset avatar builder, shared by onboarding and Settings.
 *
 * One stage shows the composed head at full size; below it, a slot tab and that slot's presets.
 * Selecting an option re-composes the preview immediately, so the player always sees the exact
 * head that will be stored.
 */
export function AvatarPicker({
  selection,
  onChange,
  previewSize = 128,
  optionSize = 60,
}: AvatarPickerProps) {
  const theme = useTheme();
  const styles = useStyles();
  const [part, setPart] = useState<AvatarPart>('hair');
  const presets = avatarPresets(part);

  return (
    <View style={styles.picker}>
      <View style={styles.stage}>
        <View style={styles.stageDisc} />
        <AvatarHead avatar={selection} size={previewSize} label="Avatar preview" />
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {AVATAR_PARTS.map((candidate) => (
          <Chip
            key={candidate}
            label={PART_LABELS[candidate]}
            selected={candidate === part}
            onPress={() => setPart(candidate)}
            accessibilityRole="tab"
            style={styles.tab}
          />
        ))}
      </View>

      <View
        style={styles.grid}
        accessibilityRole="radiogroup"
        accessibilityLabel={PART_LABELS[part]}
      >
        {presets.map((preset) => {
          const active = selection[part] === preset.id;
          const preview = withAvatarPart(selection, part, preset.id);

          return (
            <Pressable
              key={preset.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={preset.label}
              accessibilityHint="Preview this preset"
              onPress={() => onChange(preview)}
              style={({ pressed }) => [
                styles.option,
                {
                  width: optionSize,
                  height: optionSize,
                  borderRadius: optionSize / 2,
                },
                active && styles.optionActive,
                pressed && styles.pressed,
              ]}
            >
              <AvatarHead avatar={preview} size={optionSize - 12} />
              {active && (
                <View style={styles.check}>
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    tintColor={theme.color.onAccent}
                    size={13}
                    weight="bold"
                  />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" tone="muted" style={styles.caption}>
        {PART_LABELS[part]} · {presets.findIndex((preset) => preset.id === selection[part]) + 1} of{' '}
        {presets.length}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  picker: {
    gap: t.space.lg,
  },
  stage: {
    alignSelf: 'center',
    width: 176,
    height: 176,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
    borderColor: t.color.line,
    backgroundColor: t.color.accentTint,
  },
  stageDisc: {
    position: 'absolute',
    width: 152,
    height: 152,
    borderRadius: t.radius.pill,
    backgroundColor: t.color.surface,
  },
  tabs: {
    flexDirection: 'row',
    gap: t.space.sm,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: t.space.md,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: t.color.surfaceSunken,
  },
  optionActive: {
    borderColor: t.color.accent,
  },
  check: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.pill,
    borderColor: t.color.bg,
    backgroundColor: t.color.accent,
  },
  caption: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
}));
