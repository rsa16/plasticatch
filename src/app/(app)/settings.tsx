import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { CATCH_RISE, useBottomBarHeight } from '@/components/bottom-menu';
import { MenuScreen } from '@/components/menu-screen';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { privacyUrl, supportEmail } from '@/constants/legal';
import { Brand, Spacing } from '@/constants/theme';
import { US_STATES } from '@/constants/us-states';
import { useSessionStore } from '@/features/auth';
import {
  VERIFIED_CATCHES_QUERY_KEY,
  countVerifiedCatches,
  useUsernameCooldown,
  usernameCooldownSummary,
} from '@/features/profile';

const NOT_LOADED = '—';

function stateName(code: string | null | undefined): string | null {
  if (!code) return null;
  return US_STATES.find((state) => state.code === code)?.name ?? code;
}

function statistic(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : NOT_LOADED;
}

/**
 * The account hub.
 *
 * Every row either opens a real route or is omitted. Support and Privacy appear only when
 * their destinations are provisioned.
 */
export default function SettingsScreen() {
  const profile = useSessionStore((state) => state.profile);
  const status = useSessionStore((state) => state.status);
  const signOutSession = useSessionStore((state) => state.signOut);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);
  const barHeight = useBottomBarHeight();
  const queryClient = useQueryClient();
  const cooldown = useUsernameCooldown(profile?.usernameChangedAt ?? null);
  const email = supportEmail();
  const privacy = privacyUrl();

  const catchCount = useQuery({
    // Scoped by user so a different account can never read the previous player's cached count.
    queryKey: [...VERIFIED_CATCHES_QUERY_KEY, profile?.id ?? 'anonymous'],
    queryFn: () => countVerifiedCatches(),
    enabled: status === 'signed-in' && Boolean(profile?.id),
  });

  // Rollups and the catch count change on the server after a verified catch. Re-read both when
  // Settings regains focus (including when the catch modal closes) instead of guessing locally.
  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      void queryClient.invalidateQueries({ queryKey: VERIFIED_CATCHES_QUERY_KEY });
    }, [queryClient, refreshProfile]),
  );

  // Leaving the account ends the Supabase session; the entry gate routes to the age gate.
  async function signOut() {
    await signOutSession();
    router.replace('/');
  }

  return (
    <MenuScreen title="SETTINGS">
      {/* The form scrolls underneath the raised Catch tab, so the list stops at the bar. */}
      <View style={[styles.settings, { marginBottom: barHeight }]}>
        <ScrollPane
          thumbHeight={104}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Section title="Profile">
            <Row
              label="Avatar"
              value="Preset head"
              actionLabel="Change"
              accessibilityHint="Opens the avatar picker"
              onPress={() => router.push('/settings/avatar')}
            />
            <Row
              label="Username"
              value={profile?.username ?? 'Not set'}
              note={
                cooldown.active
                  ? usernameCooldownSummary(profile?.usernameChangedAt ?? null)
                  : undefined
              }
              actionLabel={cooldown.active ? undefined : 'Change'}
              disabled={cooldown.active}
              accessibilityHint={
                cooldown.active
                  ? 'Username changes are on a 14-day cooldown'
                  : 'Opens the username editor'
              }
              onPress={() => router.push('/settings/username')}
            />
            <Row
              label="Home state"
              value={stateName(profile?.homeState) ?? 'Not set'}
              actionLabel="Change"
              accessibilityHint="Opens the home state picker"
              onPress={() => router.push('/settings/home-state')}
            />
          </Section>

          <Section title="Stats">
            <Stat label="Total XP" value={statistic(profile?.totalXp)} />
            <Stat label="Level" value={statistic(profile?.level)} />
            <Stat label="Current streak" value={statistic(profile?.currentStreak)} />
            <Stat
              label="Verified catches"
              value={catchCount.isError ? NOT_LOADED : statistic(catchCount.data)}
            />
            {catchCount.isError && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading your catch count"
                onPress={() => void catchCount.refetch()}
                style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
              >
                <Text variant="body" color="accent">
                  Could not load your catch count. Retry
                </Text>
              </Pressable>
            )}
          </Section>

          <Section title="Support">
            {email && (
              <Row
                label="Contact support"
                value={email}
                accessibilityHint="Opens your email app"
                onPress={() => {
                  Linking.openURL(`mailto:${email}`).catch(() => undefined);
                }}
              />
            )}
            {privacy && (
              <Row
                label="Privacy Policy"
                value="Open"
                accessibilityHint="Opens the published Privacy Policy in a browser"
                onPress={() => {
                  WebBrowser.openBrowserAsync(privacy).catch(() => undefined);
                }}
              />
            )}
            <Row
              label="Data sources / About"
              value="Attribution"
              actionLabel="Open"
              accessibilityHint="Opens the data sources and app version screen"
              onPress={() => router.push('/settings/about')}
            />
          </Section>

          <Section title="Account">
            <Row
              label="Delete account"
              value="Permanent"
              actionLabel="Delete"
              accessibilityHint="Opens the account deletion screen"
              onPress={() => router.push('/settings/delete')}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={signOut}
              style={({ pressed }) => [styles.logOut, pressed && styles.pressed]}
            >
              <Text variant="buttonLabel">LOG OUT</Text>
            </Pressable>
          </Section>
        </ScrollPane>
      </View>
    </MenuScreen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="sectionTitle" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

type RowProps = {
  label: string;
  value: string;
  note?: string;
  actionLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
  onPress?: () => void;
};

/** One navigable Settings row. The whole row is the 44 pt target. */
function Row({
  label,
  value,
  note,
  actionLabel,
  accessibilityHint,
  disabled = false,
  onPress,
}: RowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}${note ? `. ${note}` : ''}`}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        disabled && styles.rowDisabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowText}>
        <Text variant="caption" color="accent">
          {label}
        </Text>
        <Text variant="body" color="onSurface">
          {value}
        </Text>
        {note && (
          <Text variant="caption" color="accent">
            {note}
          </Text>
        )}
      </View>
      {actionLabel && (
        <Text variant="caption" color="accent">
          {actionLabel}
        </Text>
      )}
    </Pressable>
  );
}

/** A read-only stat. It is not a button, so it carries one combined screen-reader label. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="caption" color="accent">
        {label}
      </Text>
      <Text variant="body" color="onSurface">
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  settings: {
    flex: 1,
    marginTop: Spacing.four,
    paddingLeft: 18,
    paddingRight: 10,
  },
  content: {
    width: 358,
    gap: Spacing.five,
    paddingBottom: CATCH_RISE + Spacing.three,
  },
  section: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.field,
  },
  rowDisabled: {
    opacity: 0.65,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  logOut: {
    alignSelf: 'center',
    minWidth: 185,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: Brand.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
