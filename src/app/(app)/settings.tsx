import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { useBottomBarHeight } from '@/components/bottom-menu';
import { PlayerChip } from '@/components/player-chip';
import { ScrollPane } from '@/components/scroll-pane';
import { Text } from '@/components/text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { privacyUrl, supportEmail } from '@/constants/legal';
import { usStateName } from '@/constants/us-states';
import { useSessionStore } from '@/features/auth';
import {
  VERIFIED_CATCHES_QUERY_KEY,
  countVerifiedCatches,
  useUsernameCooldown,
  usernameCooldownSummary,
} from '@/features/profile';
import { useTheme, useThemeMode, type ThemeMode } from '@/theme';

const NOT_LOADED = '—';

const APPEARANCE: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

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
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
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
    <Screen title="Profile" actions={<PlayerChip />}>
      <View style={[styles.body, { marginBottom: barHeight }]}>
        <ScrollPane
          thumbHeight={64}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <ListGroup title="Profile">
            <ListRow
              title="Avatar"
              subtitle="Preset head"
              value="Change"
              divider
              accessibilityHint="Opens the avatar picker"
              onPress={() => router.push('/settings/avatar')}
            />
            <ListRow
              title="Username"
              subtitle={
                cooldown.active
                  ? usernameCooldownSummary(profile?.usernameChangedAt ?? null)
                  : (profile?.username ?? 'Not set')
              }
              value={cooldown.active ? undefined : 'Change'}
              divider
              disabled={cooldown.active}
              accessibilityHint={
                cooldown.active
                  ? 'Username changes are on a 14-day cooldown'
                  : 'Opens the username editor'
              }
              onPress={() => router.push('/settings/username')}
            />
            <ListRow
              title="Home state"
              subtitle={usStateName(profile?.homeState) ?? profile?.homeState ?? 'Not set'}
              value="Change"
              accessibilityHint="Opens the home state picker"
              onPress={() => router.push('/settings/home-state')}
            />
          </ListGroup>

          <ListGroup title="Stats">
            <ListRow title="Total XP" value={statistic(profile?.totalXp)} divider />
            <ListRow title="Level" value={statistic(profile?.level)} divider />
            <ListRow title="Current streak" value={statistic(profile?.currentStreak)} divider />
            <ListRow
              title="Verified catches"
              value={catchCount.isError ? NOT_LOADED : statistic(catchCount.data)}
            />
          </ListGroup>

          {catchCount.isError && (
            <Button
              label="Retry loading catch count"
              variant="secondary"
              onPress={() => {
                void catchCount.refetch();
              }}
            />
          )}

          <View style={styles.appearance}>
            <Text variant="heading">Appearance</Text>
            <Card style={styles.appearanceCard}>
              <Text variant="caption" tone="muted">
                Follow the device, or lock the app to one theme.
              </Text>
              <View style={styles.appearanceRow} accessibilityRole="radiogroup">
                {APPEARANCE.map((option) => (
                  <Chip
                    key={option.mode}
                    label={option.label}
                    selected={mode === option.mode}
                    onPress={() => setMode(option.mode)}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label} theme`}
                    style={styles.appearanceChip}
                  />
                ))}
              </View>
            </Card>
          </View>

          <ListGroup title="Support">
            {email && (
              <ListRow
                title="Contact support"
                subtitle={email}
                divider
                accessibilityHint="Opens your email app"
                onPress={() => {
                  Linking.openURL(`mailto:${email}`).catch(() => undefined);
                }}
              />
            )}
            {privacy && (
              <ListRow
                title="Privacy Policy"
                subtitle="Open in browser"
                divider
                accessibilityHint="Opens the published Privacy Policy in a browser"
                onPress={() => {
                  WebBrowser.openBrowserAsync(privacy).catch(() => undefined);
                }}
              />
            )}
            <ListRow
              title="Data sources / About"
              subtitle="Attribution"
              accessibilityHint="Opens the data sources and app version screen"
              onPress={() => router.push('/settings/about')}
            />
          </ListGroup>

          <ListGroup title="Account">
            <ListRow
              title="Delete account"
              titleTone="danger"
              accessibilityHint="Opens the account deletion screen"
              onPress={() => router.push('/settings/delete')}
            />
          </ListGroup>

          <Button label="Log out" variant="secondary" onPress={signOut} />
        </ScrollPane>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  content: {
    gap: 24,
    paddingBottom: 48,
  },
  appearance: {
    gap: 8,
  },
  appearanceCard: {
    gap: 12,
  },
  appearanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  appearanceChip: {
    flex: 1,
    justifyContent: 'center',
  },
  version: {
    textAlign: 'center',
  },
});
