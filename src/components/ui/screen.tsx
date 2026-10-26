import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { HudTheme, makeStyles, useTheme } from '@/theme';

type ScreenProps = {
  /** Left-aligned header title. Omit for edge-to-edge screens such as the map. */
  title?: string;
  /** Header actions, usually the player chip. */
  actions?: ReactNode;
  /** Drawn above the header, e.g. onboarding progress. */
  header?: ReactNode;
  children?: ReactNode;
  /** Full-bleed layer behind the content, e.g. the map or camera preview. */
  background?: ReactNode;
  /** Pinned below the content. */
  footer?: ReactNode;
  /** Wraps the children in a plain ScrollView. */
  scroll?: boolean;
  /** Forces the dark HUD theme (camera, verifying) and a dark background. */
  hud?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Let touches fall through the content column to an interactive background. */
  contentPointerEvents?: 'auto' | 'box-none' | 'none';
};

/**
 * One scaffold for every surface: background, safe-area top, functional header, body and footer.
 * The old `ScreenFrame`/`MenuScreen` pair and its centered title pill are gone.
 */
export function Screen(props: ScreenProps) {
  if (props.hud) {
    return (
      <HudTheme>
        <ScreenBody {...props} />
      </HudTheme>
    );
  }

  return <ScreenBody {...props} />;
}

function ScreenBody({
  title,
  actions,
  header,
  children,
  background,
  footer,
  scroll = false,
  hud = false,
  contentStyle,
  contentPointerEvents = 'auto',
}: ScreenProps) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: hud ? theme.color.bg : theme.color.bg }]}>
      {background && <View style={StyleSheet.absoluteFill}>{background}</View>}

      <View style={[styles.column, { paddingTop: insets.top }]}>
        {header}
        {title !== undefined && (
          <View style={styles.header}>
            <Text variant="title" accessibilityRole="header" numberOfLines={1}>
              {title}
            </Text>
            {actions !== undefined && <View style={styles.actions}>{actions}</View>}
          </View>
        )}
        <View style={styles.flex} pointerEvents={contentPointerEvents}>
          {body}
        </View>
        {footer !== undefined && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + theme.space.lg }]}>
            {footer}
          </View>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
  },
  column: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.md,
    paddingHorizontal: 20,
    paddingBottom: t.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.color.line,
  },
  actions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.space.sm,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: t.space.xxl,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: t.space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.color.line,
  },
}));
